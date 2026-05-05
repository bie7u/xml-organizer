import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { extractTags } from '../utils/xmlParser';
import type { Annotation, AnnotationType, AnnotationTarget, RangeTarget } from '../types';
import { SIMULATED_USERS } from '../types';

interface Props {
  prefillType?: AnnotationType;
  prefillTarget?: AnnotationTarget;
  onClose: () => void;
}

function generateId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const AnnotationForm: React.FC<Props> = ({ prefillType, prefillTarget, onClose }) => {
  const currentUser = useStore((s) => s.currentUser);
  const content = useStore((s) => s.document?.content ?? '');
  const addAnnotationAction = useStore((s) => s.addAnnotation);

  const tags = useMemo(() => extractTags(content), [content]);
  const lineCount = content.split('\n').length;

  const [type, setType] = useState<AnnotationType>(prefillType ?? 'document');
  const [targetLine, setTargetLine] = useState<number>(
    prefillType === 'line' && typeof prefillTarget === 'number' ? prefillTarget : 1,
  );
  const [targetXpath, setTargetXpath] = useState<string>(
    prefillType === 'tag' && typeof prefillTarget === 'string' ? prefillTarget : '',
  );
  const [rangeStart, setRangeStart] = useState<number>(
    prefillType === 'range' ? (prefillTarget as RangeTarget).start : 0,
  );
  const [rangeEnd, setRangeEnd] = useState<number>(
    prefillType === 'range' ? (prefillTarget as RangeTarget).end : 0,
  );
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(currentUser);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const buildTarget = (): AnnotationTarget => {
    if (type === 'document') return 'document';
    if (type === 'line') return targetLine;
    if (type === 'tag') return targetXpath;
    return { start: rangeStart, end: rangeEnd };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Annotation text is required.');
      return;
    }
    if (type === 'tag' && !targetXpath) {
      setError('Please select a tag.');
      return;
    }
    setError('');
    setSubmitting(true);
    const annotation: Annotation = {
      id: generateId(),
      type,
      target: buildTarget(),
      text: text.trim(),
      author,
      createdAt: new Date().toISOString(),
    };
    await addAnnotationAction(annotation);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="annotation-form-backdrop">
      <form className="annotation-form" onSubmit={handleSubmit}>
        <div className="form-header">
          <h3>Add Annotation</h3>
          <button type="button" className="btn-close" onClick={onClose}>✕</button>
        </div>

        <label className="form-row">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as AnnotationType)}>
            <option value="document">Document</option>
            <option value="tag">Tag (XPath)</option>
            <option value="line">Line</option>
            <option value="range">Text Range</option>
          </select>
        </label>

        {type === 'line' && (
          <label className="form-row">
            <span>Line number</span>
            <input
              type="number"
              min={1}
              max={lineCount}
              value={targetLine}
              onChange={(e) => setTargetLine(Number(e.target.value))}
            />
          </label>
        )}

        {type === 'tag' && (
          <label className="form-row">
            <span>Tag (xpath)</span>
            <select value={targetXpath} onChange={(e) => setTargetXpath(e.target.value)}>
              <option value="">— select tag —</option>
              {tags.map((t) => (
                <option key={`${t.xpath}-${t.line}`} value={t.xpath}>
                  {t.xpath} (line {t.line})
                </option>
              ))}
            </select>
          </label>
        )}

        {type === 'range' && (
          <>
            <label className="form-row">
              <span>Start offset</span>
              <input
                type="number"
                min={0}
                value={rangeStart}
                onChange={(e) => setRangeStart(Number(e.target.value))}
              />
            </label>
            <label className="form-row">
              <span>End offset</span>
              <input
                type="number"
                min={0}
                value={rangeEnd}
                onChange={(e) => setRangeEnd(Number(e.target.value))}
              />
            </label>
          </>
        )}

        <label className="form-row">
          <span>Author</span>
          <select value={author} onChange={(e) => setAuthor(e.target.value)}>
            {SIMULATED_USERS.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-row form-row--col">
          <span>Comment</span>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your annotation here…"
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save annotation'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
