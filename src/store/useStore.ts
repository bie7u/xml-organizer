import { create } from 'zustand';
import type { Annotation, XMLDocument } from '../types';
import {
  getDocument,
  updateDocument,
  addAnnotation,
  deleteAnnotation,
} from '../api/mockApi';

const BROADCAST_CHANNEL = 'xml_organizer_sync';

type BroadcastMsg =
  | { type: 'DOC_UPDATE'; content: string; author: string }
  | { type: 'ANNOTATION_ADD'; annotation: Annotation }
  | { type: 'ANNOTATION_DELETE'; id: string };

interface StoreState {
  document: XMLDocument | null;
  currentUser: string;
  activeAnnotationId: string | null;
  loading: boolean;

  // Actions
  loadDocument: () => Promise<void>;
  setCurrentUser: (user: string) => void;
  setContent: (content: string) => void;
  commitContent: () => Promise<void>;
  addAnnotation: (annotation: Annotation) => Promise<void>;
  removeAnnotation: (id: string) => Promise<void>;
  setActiveAnnotation: (id: string | null) => void;
  applyBroadcast: (msg: BroadcastMsg) => void;
}

// BroadcastChannel for cross-tab/window sync
let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel(BROADCAST_CHANNEL);
} catch {
  // BroadcastChannel not supported
}

export const useStore = create<StoreState>((set, get) => {
  // Wire up incoming broadcast messages
  if (channel) {
    channel.onmessage = (ev: MessageEvent<BroadcastMsg>) => {
      get().applyBroadcast(ev.data);
    };
  }

  return {
    document: null,
    currentUser: 'Alice',
    activeAnnotationId: null,
    loading: false,

    loadDocument: async () => {
      set({ loading: true });
      const doc = await getDocument();
      set({ document: doc, loading: false });
    },

    setCurrentUser: (user) => set({ currentUser: user }),

    setContent: (content) => {
      set((state) => ({
        document: state.document ? { ...state.document, content } : null,
      }));
    },

    commitContent: async () => {
      const { document, currentUser } = get();
      if (!document) return;
      await updateDocument(document.content);
      const msg: BroadcastMsg = {
        type: 'DOC_UPDATE',
        content: document.content,
        author: currentUser,
      };
      channel?.postMessage(msg);
    },

    addAnnotation: async (annotation) => {
      await addAnnotation(annotation);
      set((state) => ({
        document: state.document
          ? { ...state.document, annotations: [...state.document.annotations, annotation] }
          : null,
      }));
      const msg: BroadcastMsg = { type: 'ANNOTATION_ADD', annotation };
      channel?.postMessage(msg);
    },

    removeAnnotation: async (id) => {
      await deleteAnnotation(id);
      set((state) => ({
        document: state.document
          ? {
              ...state.document,
              annotations: state.document.annotations.filter((a) => a.id !== id),
            }
          : null,
        activeAnnotationId: state.activeAnnotationId === id ? null : state.activeAnnotationId,
      }));
      const msg: BroadcastMsg = { type: 'ANNOTATION_DELETE', id };
      channel?.postMessage(msg);
    },

    setActiveAnnotation: (id) => set({ activeAnnotationId: id }),

    applyBroadcast: (msg) => {
      if (msg.type === 'DOC_UPDATE') {
        set((state) => ({
          document: state.document ? { ...state.document, content: msg.content } : null,
        }));
      } else if (msg.type === 'ANNOTATION_ADD') {
        set((state) => {
          if (!state.document) return state;
          // avoid duplicates
          const exists = state.document.annotations.some((a) => a.id === msg.annotation.id);
          if (exists) return state;
          return {
            document: {
              ...state.document,
              annotations: [...state.document.annotations, msg.annotation],
            },
          };
        });
      } else if (msg.type === 'ANNOTATION_DELETE') {
        set((state) => ({
          document: state.document
            ? {
                ...state.document,
                annotations: state.document.annotations.filter((a) => a.id !== msg.id),
              }
            : null,
        }));
      }
    },
  };
});
