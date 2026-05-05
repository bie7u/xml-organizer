/**
 * Simple XML parser utilities.
 * Maps line numbers to tag names and builds a basic xpath representation.
 */

export interface TagInfo {
  tag: string;
  xpath: string;
  line: number; // 1-based
  startOffset: number; // character offset in source
  endOffset: number;
}

/**
 * Returns the line number (1-based) for a character offset.
 */
export function offsetToLine(source: string, offset: number): number {
  const slice = source.slice(0, Math.min(offset, source.length));
  return slice.split('\n').length;
}

/**
 * Returns the start offset of a given line (1-based).
 */
export function lineToOffset(source: string, line: number): number {
  const lines = source.split('\n');
  let offset = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for '\n'
  }
  return offset;
}

/**
 * Extracts open tag names with their line numbers from raw XML source.
 * Uses a simple regex – good enough for POC purposes.
 */
export function extractTags(source: string): TagInfo[] {
  const results: TagInfo[] = [];
  // match opening tags (not closing, not self-closing doctype/PI)
  const tagRegex = /<([a-zA-Z_][\w:.-]*)(\s[^>]*)?(\/?>)/g;
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(source)) !== null) {
    const tagName = match[1];
    const isSelfClosing = match[0].endsWith('/>');
    const startOffset = match.index;
    const endOffset = startOffset + match[0].length;
    const line = offsetToLine(source, startOffset);

    // Build xpath-ish path
    const xpath = '/' + [...stack, tagName].join('/');

    results.push({ tag: tagName, xpath, line, startOffset, endOffset });

    if (!isSelfClosing) {
      stack.push(tagName);
    }

    // Pop on closing tag (separate pass below isn't needed for our use case)
  }

  return results;
}

/**
 * Find tag info by xpath string (first match).
 */
export function findTagByXpath(tags: TagInfo[], xpath: string): TagInfo | undefined {
  return tags.find((t) => t.xpath === xpath);
}

/**
 * Get all tags on a given line.
 */
export function getTagsOnLine(tags: TagInfo[], line: number): TagInfo[] {
  return tags.filter((t) => t.line === line);
}
