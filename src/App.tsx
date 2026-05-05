import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import { usePollingSync } from './hooks/usePollingSync';
import { UserSelector } from './components/UserSelector';
import { XmlEditor } from './components/XmlEditor';
import { AnnotationPanel } from './components/AnnotationPanel';
import { AnnotationForm } from './components/AnnotationForm';
import type { Annotation, AnnotationType, AnnotationTarget } from './types';

interface PendingAnnotation {
  type: AnnotationType;
  target: AnnotationTarget;
}

const App: React.FC = () => {
  const loadDocument = useStore((s) => s.loadDocument);
  const loading = useStore((s) => s.loading);
  const document = useStore((s) => s.document);

  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Load on mount
  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // Polling sync (fallback / additional sync)
  usePollingSync(4000);

  const openAnnotationForm = useCallback(
    (type: Annotation['type'], target: Annotation['target']) => {
      setPendingAnnotation({ type, target });
      setShowForm(true);
    },
    [],
  );

  const closeForm = useCallback(() => {
    setShowForm(false);
    setPendingAnnotation(null);
  }, []);

  if (loading && !document) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading document…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">
            <span className="logo">{'</>'}</span> XML Organizer
          </h1>
          <span className="app-subtitle">Collaborative XML Editor · POC</span>
        </div>
        <UserSelector />
      </header>

      <main className="app-main">
        <XmlEditor onRequestAnnotation={openAnnotationForm} />
        <AnnotationPanel onAddAnnotation={() => openAnnotationForm('document', 'document')} />
      </main>

      {showForm && (
        <AnnotationForm
          prefillType={pendingAnnotation?.type}
          prefillTarget={pendingAnnotation?.target}
          onClose={closeForm}
        />
      )}
    </div>
  );
};

export default App;
