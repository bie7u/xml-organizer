import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { extractTags, offsetToLine } from '../utils/xmlParser';
import type { Annotation, RangeTarget } from '../types';

export const XmlPreview: React.FC = () => {
  const content = useStore((s) => s.document?.content ?? '');
  const annotations = useStore((s) => s.document?.annotations ?? []);

  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const tags = useMemo(() => extractTags(content), [content]);

  /** Lines touched by at least one annotation */
  const annotatedLines = useMemo(() => {
    const set = new Set<number>();
    annotations.forEach((ann) => {
      if (ann.type === 'line' && typeof ann.target === 'number') {
        set.add(ann.target);
      } else if (ann.type === 'tag' && typeof ann.target === 'string') {
        const tagInfo = tags.find((t) => t.xpath === ann.target);
        if (tagInfo) set.add(tagInfo.line);
      } else if (ann.type === 'range') {
        const t = ann.target as RangeTarget;
        const startLine = offsetToLine(content, t.start);
        const endLine = offsetToLine(content, t.end);
        for (let l = startLine; l <= endLine; l++) set.add(l);
      } else if (ann.type === 'document') {
        // document annotations apply to "all lines" – not individually highlighted
      }
    });
    return set;
  }, [annotations, tags, content]);

  /** All annotations that apply to a given 1-based line number */
  const getAnnotationsForLine = useCallback(
    (lineNum: number): Annotation[] => {
      const rawLines = content.split('\n');
      const lineStart = rawLines
        .slice(0, lineNum - 1)
        .reduce((acc, l) => acc + l.length + 1, 0);
      const lineEnd = lineStart + (rawLines[lineNum - 1] ?? '').length;

      return annotations.filter((ann) => {
        if (ann.type === 'line') return ann.target === lineNum;
        if (ann.type === 'tag') {
          const tagInfo = tags.find((t) => t.xpath === ann.target);
          return tagInfo?.line === lineNum;
        }
        if (ann.type === 'range') {
          const t = ann.target as RangeTarget;
          return t.start <= lineEnd && t.end >= lineStart;
        }
        return false;
      });
    },
    [annotations, tags, content],
  );

  const lines = content.split('\n');

  const handleLineClick = useCallback(
    (lineNum: number) => {
      setSelectedLine((prev) => (prev === lineNum ? null : lineNum));
    },
    [],
  );

  return (
    <div className="xml-preview-container">
      {lines.map((lineText, idx) => {
        const lineNum = idx + 1;
        const isAnnotated = annotatedLines.has(lineNum);
        const isSelected = selectedLine === lineNum;
        const lineAnnotations = isSelected ? getAnnotationsForLine(lineNum) : [];

        return (
          <React.Fragment key={idx}>
            <div
              className={[
                'preview-line',
                isAnnotated ? 'preview-line-annotated' : '',
                isSelected ? 'preview-line-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleLineClick(lineNum)}
              title={isAnnotated ? 'Click to see annotations' : 'Click to inspect'}
            >
              <span className="line-number">{lineNum}</span>
              <span className="preview-line-text">{lineText || '\u00a0'}</span>
              {isAnnotated && (
                <span className="preview-badge" aria-label={`${getAnnotationsForLine(lineNum).length} annotation(s)`}>
                  {getAnnotationsForLine(lineNum).length}
                </span>
              )}
            </div>

            {isSelected && (
              <div className="preview-popup" role="region" aria-label={`Annotations for line ${lineNum}`}>
                {lineAnnotations.length === 0 ? (
                  <p className="preview-popup-empty">No annotations for this line.</p>
                ) : (
                  lineAnnotations.map((ann) => (
                    <div key={ann.id} className="preview-popup-item">
                      <div className="preview-popup-meta">
                        <span className="preview-popup-author">{ann.author}</span>
                        <span className={`ann-type-badge ann-type-${ann.type}`}>{ann.type}</span>
                        <span className="preview-popup-date">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="preview-popup-text">{ann.text}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
