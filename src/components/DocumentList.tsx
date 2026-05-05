import React, { useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import type { XMLDocumentMeta } from '../types';

export const DocumentList: React.FC = () => {
  const documentList = useStore((s) => s.documentList);
  const loading = useStore((s) => s.loading);
  const selectDocument = useStore((s) => s.selectDocument);
  const createDocument = useStore((s) => s.createDocument);
  const deleteDocument = useStore((s) => s.deleteDocument);
  const loadDocumentList = useStore((s) => s.loadDocumentList);

  const currentAuth = useAuthStore((s) => s.currentUser);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleOpen = useCallback(
    async (doc: XMLDocumentMeta) => {
      await selectDocument(doc.id);
    },
    [selectDocument],
  );

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = newName.trim();
      if (!name) {
        setCreateError('Podaj nazwę dokumentu.');
        return;
      }
      setCreating(true);
      setCreateError(null);
      try {
        const doc = await createDocument(name);
        setNewName('');
        await selectDocument(doc.id);
      } finally {
        setCreating(false);
      }
    },
    [newName, createDocument, selectDocument],
  );

  const handleDelete = useCallback(
    async (doc: XMLDocumentMeta) => {
      if (!window.confirm(`Usunąć dokument "${doc.name}"?`)) return;
      await deleteDocument(doc.id);
      await loadDocumentList();
    },
    [deleteDocument, loadDocumentList],
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="doc-list-page">
      <div className="doc-list-header">
        <h2 className="doc-list-title">Dokumenty XML</h2>
        <span className="doc-list-count">{documentList.length} dokumentów</span>
      </div>

      {/* New document form */}
      <form className="doc-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          className="doc-create-input"
          placeholder="Nazwa nowego dokumentu…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={creating}
        />
        <button className="btn-primary" type="submit" disabled={creating}>
          {creating ? 'Tworzenie…' : '+ Nowy dokument'}
        </button>
        {createError && <span className="form-error">{createError}</span>}
      </form>

      {/* Document grid */}
      {loading && documentList.length === 0 ? (
        <div className="loading-screen">
          <div className="spinner" />
          <p>Ładowanie dokumentów…</p>
        </div>
      ) : documentList.length === 0 ? (
        <div className="doc-list-empty">
          <p>Brak dokumentów. Utwórz pierwszy dokument powyżej.</p>
        </div>
      ) : (
        <div className="doc-grid">
          {documentList.map((doc) => (
            <div key={doc.id} className="doc-card" onClick={() => handleOpen(doc)}>
              <div className="doc-card-icon">{'</>'}</div>
              <div className="doc-card-body">
                <div className="doc-card-name">{doc.name}</div>
                <div className="doc-card-meta">
                  <span className="doc-card-date">{formatDate(doc.updatedAt)}</span>
                  {doc.annotationCount > 0 && (
                    <span className="doc-card-annotations">
                      💬 {doc.annotationCount}
                    </span>
                  )}
                </div>
              </div>
              {currentAuth?.role === 'admin' && (
                <button
                  className="doc-card-delete"
                  title={`Usuń "${doc.name}"`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
