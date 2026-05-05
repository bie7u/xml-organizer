import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { SIMULATED_USERS } from '../types';
import type { Annotation, RangeTarget } from '../types';

function userColor(author: string): string {
  return SIMULATED_USERS.find((u) => u.name === author)?.color ?? '#888';
}

function formatTarget(ann: Annotation): string {
  if (ann.type === 'document') return 'Whole document';
  if (ann.type === 'line') return `Line ${ann.target}`;
  if (ann.type === 'tag') return `Tag: ${ann.target}`;
  if (ann.type === 'range') {
    const r = ann.target as RangeTarget;
    return `Chars ${r.start}–${r.end}`;
  }
  return String(ann.target);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type FilterType = 'all' | Annotation['type'];

interface Props {
  onAddAnnotation: () => void;
}

export const AnnotationPanel: React.FC<Props> = ({ onAddAnnotation }) => {
  const annotations = useStore((s) => s.document?.annotations ?? []);
  const activeAnnotationId = useStore((s) => s.activeAnnotationId);
  const setActiveAnnotation = useStore((s) => s.setActiveAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);

  const [filter, setFilter] = React.useState<FilterType>('all');
  const [search, setSearch] = React.useState('');

  const filtered = useMemo(() => {
    return annotations
      .filter((a) => filter === 'all' || a.type === filter)
      .filter(
        (a) =>
          !search ||
          a.text.toLowerCase().includes(search.toLowerCase()) ||
          a.author.toLowerCase().includes(search.toLowerCase()),
      )
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [annotations, filter, search]);

  return (
    <div className="annotation-panel">
      <div className="panel-header">
        <span className="panel-title">Annotations ({annotations.length})</span>
        <button className="btn-primary btn-sm" onClick={onAddAnnotation}>
          + Add
        </button>
      </div>

      <div className="panel-controls">
        <input
          className="search-input"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {(['all', 'document', 'tag', 'line', 'range'] as FilterType[]).map((f) => (
            <button
              key={f}
              className={`filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="annotation-list">
        {filtered.length === 0 && (
          <p className="empty-message">No annotations yet. Click "+ Add" to create one.</p>
        )}
        {filtered.map((ann) => (
          <div
            key={ann.id}
            className={`annotation-card${activeAnnotationId === ann.id ? ' active' : ''}`}
            onClick={() =>
              setActiveAnnotation(activeAnnotationId === ann.id ? null : ann.id)
            }
          >
            <div className="ann-header">
              <span
                className="ann-author"
                style={{ color: userColor(ann.author) }}
              >
                {ann.author}
              </span>
              <span className={`ann-type-badge ann-type-${ann.type}`}>{ann.type}</span>
              <button
                className="btn-delete"
                title="Delete annotation"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAnnotation(ann.id);
                }}
              >
                ✕
              </button>
            </div>
            <p className="ann-text">{ann.text}</p>
            <div className="ann-meta">
              <span className="ann-target">{formatTarget(ann)}</span>
              <span className="ann-date">{formatDate(ann.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
