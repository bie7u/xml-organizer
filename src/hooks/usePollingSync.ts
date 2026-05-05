import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getDocument } from '../api/httpApi';

/**
 * Polls localStorage every `intervalMs` to detect changes made in other
 * simulated-user windows that might not support BroadcastChannel.
 * Only polls when a document is currently open.
 */
export function usePollingSync(intervalMs = 3000): void {
  const applyBroadcast = useStore((s) => s.applyBroadcast);
  const documentId = useStore((s) => s.document?.id ?? null);

  useEffect(() => {
    if (!documentId) return;
    const timer = setInterval(async () => {
      try {
        const doc = await getDocument(documentId);
        if (!doc) return;
        applyBroadcast({ type: 'DOC_UPDATE', docId: doc.id, content: doc.content, author: '__poll__' });
        for (const ann of doc.annotations) {
          applyBroadcast({ type: 'ANNOTATION_ADD', docId: doc.id, annotation: ann });
        }
      } catch {
        // ignore
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [applyBroadcast, documentId, intervalMs]);
}
