import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getDocument } from '../api/mockApi';

/**
 * Polls localStorage every 3 seconds to detect changes made in other
 * simulated-user windows that might not support BroadcastChannel.
 * Also acts as a fallback sync mechanism.
 */
export function usePollingSync(intervalMs = 3000): void {
  const applyBroadcast = useStore((s) => s.applyBroadcast);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const doc = await getDocument();
        applyBroadcast({ type: 'DOC_UPDATE', content: doc.content, author: '__poll__' });
        for (const ann of doc.annotations) {
          applyBroadcast({ type: 'ANNOTATION_ADD', annotation: ann });
        }
      } catch {
        // ignore
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [applyBroadcast, intervalMs]);
}
