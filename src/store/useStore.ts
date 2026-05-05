import { create } from 'zustand';
import type { Annotation, XMLDocument, XMLDocumentMeta } from '../types';
import {
  listDocuments,
  getDocument,
  createDocument,
  deleteDocument as apiDeleteDocument,
  updateDocument,
  addAnnotation,
  deleteAnnotation,
} from '../api/mockApi';

const BROADCAST_CHANNEL = 'xml_organizer_sync';

type BroadcastMsg =
  | { type: 'DOC_UPDATE'; docId: string; content: string; author: string }
  | { type: 'ANNOTATION_ADD'; docId: string; annotation: Annotation }
  | { type: 'ANNOTATION_DELETE'; docId: string; id: string };

interface StoreState {
  documentList: XMLDocumentMeta[];
  document: XMLDocument | null;
  /** Last content that was successfully persisted to storage. Used to
   *  distinguish a genuine remote change (poll) from an echo of our own
   *  last save, so that in-progress local edits are never overwritten. */
  committedContent: string | null;
  currentUser: string;
  activeAnnotationId: string | null;
  loading: boolean;

  // Actions
  loadDocumentList: () => Promise<void>;
  selectDocument: (id: string) => Promise<void>;
  deselectDocument: () => void;
  createDocument: (name: string) => Promise<XMLDocument>;
  deleteDocument: (id: string) => Promise<void>;
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
    documentList: [],
    document: null,
    committedContent: null,
    currentUser: 'Alice',
    activeAnnotationId: null,
    loading: false,

    loadDocumentList: async () => {
      set({ loading: true });
      const list = await listDocuments();
      set({ documentList: list, loading: false });
    },

    selectDocument: async (id) => {
      set({ loading: true });
      const doc = await getDocument(id);
      set({ document: doc, committedContent: doc?.content ?? null, loading: false });
    },

    deselectDocument: () => {
      set({ document: null });
    },

    createDocument: async (name) => {
      const doc = await createDocument(name);
      const list = await listDocuments();
      set({ documentList: list });
      return doc;
    },

    deleteDocument: async (id) => {
      await apiDeleteDocument(id);
      set((state) => ({
        documentList: state.documentList.filter((d) => d.id !== id),
        document: state.document?.id === id ? null : state.document,
      }));
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
      const updated = await updateDocument(document.id, document.content);
      set((state) => ({
        document: state.document ? { ...state.document, updatedAt: updated.updatedAt } : null,
        committedContent: document.content,
      }));
      const msg: BroadcastMsg = {
        type: 'DOC_UPDATE',
        docId: document.id,
        content: document.content,
        author: currentUser,
      };
      channel?.postMessage(msg);
    },

    addAnnotation: async (annotation) => {
      const { document } = get();
      if (!document) return;
      await addAnnotation(document.id, annotation);
      set((state) => ({
        document: state.document
          ? { ...state.document, annotations: [...state.document.annotations, annotation] }
          : null,
      }));
      const msg: BroadcastMsg = { type: 'ANNOTATION_ADD', docId: document.id, annotation };
      channel?.postMessage(msg);
    },

    removeAnnotation: async (id) => {
      const { document } = get();
      if (!document) return;
      await deleteAnnotation(document.id, id);
      set((state) => ({
        document: state.document
          ? {
              ...state.document,
              annotations: state.document.annotations.filter((a) => a.id !== id),
            }
          : null,
        activeAnnotationId: state.activeAnnotationId === id ? null : state.activeAnnotationId,
      }));
      const msg: BroadcastMsg = { type: 'ANNOTATION_DELETE', docId: document.id, id };
      channel?.postMessage(msg);
    },

    setActiveAnnotation: (id) => set({ activeAnnotationId: id }),

    applyBroadcast: (msg) => {
      const { document, committedContent } = get();
      if (msg.type === 'DOC_UPDATE') {
        if (document?.id !== msg.docId) return;
        // Skip if this is merely echoing back our own last committed save.
        // This prevents the polling loop from overwriting unsaved local edits.
        if (msg.content === committedContent) return;
        set((state) => ({
          document: state.document ? { ...state.document, content: msg.content } : null,
          committedContent: msg.content,
        }));
      } else if (msg.type === 'ANNOTATION_ADD') {
        if (document?.id !== msg.docId) return;
        set((state) => {
          if (!state.document) return state;
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
        if (document?.id !== msg.docId) return;
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
