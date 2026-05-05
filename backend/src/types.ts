// Shared domain types used across backend modules.
// These mirror the frontend src/types/index.ts shapes.

export type AnnotationType = 'document' | 'tag' | 'line' | 'range';

export interface RangeTarget {
  start: number;
  end: number;
}

export type AnnotationTarget = string | number | RangeTarget;

export interface Annotation {
  id: string;
  type: AnnotationType;
  target: AnnotationTarget;
  text: string;
  author: string;
  createdAt: string; // ISO string
}
