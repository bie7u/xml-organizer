import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { extractTags, lineToOffset, offsetToLine } from '../utils/xmlParser';
import { sendToServer } from '../ws/client';
import type { Annotation, RangeTarget } from '../types';
import { XmlPreview } from './XmlPreview';

type EditorMode = 'edit' | 'preview';

interface Props {
  onRequestAnnotation: (type: Annotation['type'], target: Annotation['target']) => void;
}

/** Validate XML using the browser's DOMParser. Returns an error message or null. */
function validateXml(content: string): string | null {
  if (!content.trim()) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (!error) return null;
  // Extract the first meaningful line from the error text
  const text = error.textContent ?? 'Nieprawidłowy XML';
  const firstLine = text.split('\n').find((l) => l.trim()) ?? text;
  return firstLine.trim();
}

export const XmlEditor: React.FC<Props> = ({ onRequestAnnotation }) => {
  const [mode, setMode] = useState<EditorMode>('edit');
  const content = useStore((s) => s.document?.content ?? '');
  const docId = useStore((s) => s.document?.id ?? null);
  const annotations = useStore((s) => s.document?.annotations ?? []);
  const activeAnnotationId = useStore((s) => s.activeAnnotationId);
  const setContent = useStore((s) => s.setContent);
  const commitContent = useStore((s) => s.commitContent);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const tags = useMemo(() => extractTags(content), [content]);

  // XML validation (debounced - runs after content stabilises for 400 ms)
  const [xmlError, setXmlError] = useState<string | null>(null);
  useEffect(() => {
    const tid = setTimeout(() => {
      setXmlError(validateXml(content));
    }, 400);
    return () => clearTimeout(tid);
  }, [content]);

  // Auto-save while typing: persist + broadcast to other users after 500 ms of inactivity
  useEffect(() => {
    const tid = setTimeout(() => {
      commitContent();
    }, 500);
    return () => clearTimeout(tid);
  }, [content, commitContent]);

  // Build a set of highlighted line numbers from annotations
  const highlightedLines = useMemo(() => {
    const lines = new Set<number>();
    annotations.forEach((ann) => {
      if (ann.type === 'line' && typeof ann.target === 'number') {
        lines.add(ann.target);
      }
      if (ann.type === 'tag' && typeof ann.target === 'string') {
        const tagInfo = tags.find((t) => t.xpath === ann.target);
        if (tagInfo) lines.add(tagInfo.line);
      }
    });
    return lines;
  }, [annotations, tags]);

  // Active annotation highlight
  const activeHighlightRange = useMemo((): { start: number; end: number } | null => {
    if (!activeAnnotationId) return null;
    const ann = annotations.find((a) => a.id === activeAnnotationId);
    if (!ann) return null;
    if (ann.type === 'range') {
      const t = ann.target as RangeTarget;
      return { start: t.start, end: t.end };
    }
    if (ann.type === 'line' && typeof ann.target === 'number') {
      const start = lineToOffset(content, ann.target);
      const lineContent = content.split('\n')[ann.target - 1] ?? '';
      return { start, end: start + lineContent.length };
    }
    if (ann.type === 'tag' && typeof ann.target === 'string') {
      const tagInfo = tags.find((t) => t.xpath === ann.target);
      if (tagInfo) return { start: tagInfo.startOffset, end: tagInfo.endOffset };
    }
    return null;
  }, [activeAnnotationId, annotations, content, tags]);

  // Scroll to active annotation
  useEffect(() => {
    if (!activeHighlightRange || !textareaRef.current) return;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(
      activeHighlightRange.start,
      activeHighlightRange.end,
    );
    // Approximate scroll
    const line = offsetToLine(content, activeHighlightRange.start);
    const lineHeight = 20; // px
    textareaRef.current.scrollTop = (line - 3) * lineHeight;
  }, [activeHighlightRange, content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      if (docId) sendToServer({ type: 'presence_typing', docId });
    },
    [setContent, docId],
  );

  const handleBlur = useCallback(() => {
    commitContent();
  }, [commitContent]);

  // Context menu for annotations
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      if (start !== end) {
        // Text range selected
        onRequestAnnotation('range', { start, end } as RangeTarget);
      } else {
        // Cursor position — determine line
        const line = offsetToLine(content, start);
        onRequestAnnotation('line', line);
      }
    },
    [content, onRequestAnnotation],
  );

  // Render line-number gutter + row-level highlight stripes.
  const renderHighlight = useCallback(() => {
    if (!content) return null;
    const lines = content.split('\n');
    return lines.map((_line, idx) => {
      const lineNum = idx + 1;
      const isHighlighted = highlightedLines.has(lineNum);
      return (
        <div
          key={idx}
          className={`editor-line${isHighlighted ? ' line-annotated' : ''}`}
        >
          <span className="line-number">{lineNum}</span>
        </div>
      );
    });
  }, [content, highlightedLines]);

  return (
    <div className="xml-editor-container">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">XML Editor</span>
          <div className="mode-toggle" role="group" aria-label="Editor mode">
            <button
              className={`mode-btn${mode === 'edit' ? ' mode-btn-active' : ''}`}
              onClick={() => setMode('edit')}
              title="Edit mode"
            >
              ✏️ Edit
            </button>
            <button
              className={`mode-btn${mode === 'preview' ? ' mode-btn-active' : ''}`}
              onClick={() => setMode('preview')}
              title="Preview mode"
            >
              👁 Preview
            </button>
          </div>
        </div>
        <div className="toolbar-actions">
          {mode === 'edit' && (
            <>
              <button
                className="btn-sm"
                title="Annotate whole document"
                onClick={() => onRequestAnnotation('document', 'document')}
              >
                + Doc annotation
              </button>
              <span className="hint">Right-click in editor to annotate line / selection</span>
            </>
          )}
          {mode === 'preview' && (
            <span className="hint">Click a line to view its annotations</span>
          )}
        </div>
      </div>

      {/* XML validation error banner */}
      {xmlError && (
        <div className="xml-validation-error" role="alert">
          <span className="xml-validation-icon">⚠</span>
          <span className="xml-validation-msg">{xmlError}</span>
        </div>
      )}

      <div className="editor-body">
        {mode === 'edit' ? (
          <>
            {/* Line highlight overlay */}
            <div ref={highlightRef} className="editor-highlight" aria-hidden="true">
              {renderHighlight()}
            </div>

            {/* Actual textarea */}
            <textarea
              ref={textareaRef}
              className={`editor-textarea${xmlError ? ' editor-textarea-invalid' : ''}`}
              value={content}
              onChange={handleChange}
              onBlur={handleBlur}
              onContextMenu={handleContextMenu}
              spellCheck={false}
              wrap="off"
            />
          </>
        ) : (
          <XmlPreview />
        )}
      </div>

      <div className="editor-footer">
        <span>Lines: {content.split('\n').length}</span>
        <span>Tags: {tags.length}</span>
        {xmlError ? (
          <span className="footer-invalid">✗ Nieprawidłowy XML</span>
        ) : content.trim() ? (
          <span className="footer-valid">✓ Poprawny XML</span>
        ) : null}
        {mode === 'edit' ? (
          <span className="hint">Auto-saves · Right-click to annotate</span>
        ) : (
          <span className="hint">Read-only · Switch to Edit to make changes</span>
        )}
      </div>
    </div>
  );
};
