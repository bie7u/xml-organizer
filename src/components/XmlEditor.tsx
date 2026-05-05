import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { extractTags, lineToOffset, offsetToLine } from '../utils/xmlParser';
import type { Annotation, RangeTarget } from '../types';

interface Props {
  onRequestAnnotation: (type: Annotation['type'], target: Annotation['target']) => void;
}

export const XmlEditor: React.FC<Props> = ({ onRequestAnnotation }) => {
  const content = useStore((s) => s.document?.content ?? '');
  const annotations = useStore((s) => s.document?.annotations ?? []);
  const activeAnnotationId = useStore((s) => s.activeAnnotationId);
  const setContent = useStore((s) => s.setContent);
  const commitContent = useStore((s) => s.commitContent);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const tags = useMemo(() => extractTags(content), [content]);

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
    },
    [setContent],
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
  // Text is NOT repeated here – only the gutter numbers and background colours.
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
        <span className="toolbar-title">XML Editor</span>
        <div className="toolbar-actions">
          <button
            className="btn-sm"
            title="Annotate whole document"
            onClick={() => onRequestAnnotation('document', 'document')}
          >
            + Doc annotation
          </button>
          <span className="hint">Right-click in editor to annotate line / selection</span>
        </div>
      </div>

      <div className="editor-body">
        {/* Line highlight overlay */}
        <div ref={highlightRef} className="editor-highlight" aria-hidden="true">
          {renderHighlight()}
        </div>

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          onContextMenu={handleContextMenu}
          spellCheck={false}
          wrap="off"
        />
      </div>

      <div className="editor-footer">
        <span>Lines: {content.split('\n').length}</span>
        <span>Tags: {tags.length}</span>
        <span className="hint">Blur to save · Right-click to annotate</span>
      </div>
    </div>
  );
};
