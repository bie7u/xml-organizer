import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { useWebSocket } from './hooks/useWebSocket';
import { LoginForm } from './components/LoginForm';
import { DocumentList } from './components/DocumentList';
import { XmlEditor } from './components/XmlEditor';
import { AnnotationPanel } from './components/AnnotationPanel';
import { AnnotationForm } from './components/AnnotationForm';
import { AdminPanel } from './components/AdminPanel';
import type { Annotation, AnnotationType, AnnotationTarget } from './types';

interface PendingAnnotation {
  type: AnnotationType;
  target: AnnotationTarget;
}

const App: React.FC = () => {
  const loadDocumentList = useStore((s) => s.loadDocumentList);
  const loading = useStore((s) => s.loading);
  const document = useStore((s) => s.document);
  const deselectDocument = useStore((s) => s.deselectDocument);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const currentAuth = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Keep annotation author in sync with the logged-in user
  useEffect(() => {
    if (currentAuth) setCurrentUser(currentAuth.username);
  }, [currentAuth, setCurrentUser]);

  // Load document list when authenticated
  useEffect(() => {
    if (currentAuth) loadDocumentList();
  }, [currentAuth, loadDocumentList]);

  // WebSocket – real-time collaboration
  useWebSocket();

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

  // ── Not logged in ──────────────────────────────────────────
  if (!currentAuth) return <LoginForm />;

  // ── Loading (initial doc list) ─────────────────────────────
  if (loading && !document) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Ładowanie…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          {document ? (
            <button
              className="btn-back"
              onClick={deselectDocument}
              title="Wróć do listy"
            >
              ← Lista
            </button>
          ) : null}
          <h1 className="app-title">
            <span className="logo">{'</>'}</span> XML Organizer
          </h1>
          {document && (
            <span className="app-subtitle doc-name-subtitle">{document.name}</span>
          )}
        </div>

        {/* User info + actions */}
        <div className="header-user-area">
          <span className="user-avatar" style={{ backgroundColor: currentAuth.color }}>
            {currentAuth.username[0].toUpperCase()}
          </span>
          <span className="header-username">{currentAuth.username}</span>
          <span className={`role-badge role-${currentAuth.role}`}>{currentAuth.role}</span>

          {currentAuth.role === 'admin' && (
            <button className="btn-sm" onClick={() => setShowAdmin(true)}>
              ⚙ Użytkownicy
            </button>
          )}

          <button className="btn-secondary btn-logout" onClick={logout}>
            Wyloguj
          </button>
        </div>
      </header>

      {/* ── Document list or editor ── */}
      {document ? (
        <main className="app-main">
          <XmlEditor onRequestAnnotation={openAnnotationForm} />
          <AnnotationPanel onAddAnnotation={() => openAnnotationForm('document', 'document')} />
        </main>
      ) : (
        <main className="app-main-list">
          <DocumentList />
        </main>
      )}

      {showForm && (
        <AnnotationForm
          prefillType={pendingAnnotation?.type}
          prefillTarget={pendingAnnotation?.target}
          onClose={closeForm}
        />
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
};

export default App;
