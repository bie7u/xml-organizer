export type AnnotationType = 'document' | 'tag' | 'line' | 'range';

export interface RangeTarget {
  start: number;
  end: number;
}

export type AnnotationTarget = string | number | RangeTarget;

export interface Annotation {
  id: string;
  type: AnnotationType;
  /** xpath string | line number (1-based) | { start, end } char offsets */
  target: AnnotationTarget;
  text: string;
  author: string;
  createdAt: string; // ISO string
}

export interface XMLDocument {
  id: string;
  content: string;
  annotations: Annotation[];
}

export interface SimulatedUser {
  id: string;
  name: string;
  color: string;
}

export const SIMULATED_USERS: SimulatedUser[] = [
  { id: 'user-1', name: 'Alice', color: '#4f86c6' },
  { id: 'user-2', name: 'Bob', color: '#e07b39' },
  { id: 'user-3', name: 'Carol', color: '#5cb85c' },
];
