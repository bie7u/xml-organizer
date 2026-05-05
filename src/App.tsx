import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import { useAuthStore } from './store/useAuthStore';
import { usePollingSync } from './hooks/usePollingSync';
import { LoginForm } from './components/LoginForm';
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
  const loadDocument = useStore((s) => s.loadDocument);
  const loading = useStore((s) => s.loading);
  const document = useStore((s) => s.document);
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

  // Load on mount (only when authenticated)
  useEffect(() => {
    if (currentAuth) loadDocument();
  }, [currentAuth, loadDocument]);

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

  // ── Not logged in ──────────────────────────────────────────
  if (!currentAuth) return <LoginForm />;

  // ── Loading ────────────────────────────────────────────────
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

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
};

export default App;
