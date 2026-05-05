// HTTP API – replaces the localStorage-based mockApi.ts
import { apiFetch } from './apiFetch';
import type { Annotation, XMLDocument, XMLDocumentMeta } from '../types';

export async function listDocuments(): Promise<XMLDocumentMeta[]> {
  return apiFetch<XMLDocumentMeta[]>('/documents');
}

export async function getDocument(id: string): Promise<XMLDocument | null> {
  try {
    return await apiFetch<XMLDocument>(`/documents/${id}`);
  } catch {
    return null;
  }
}

export async function createDocument(name: string): Promise<XMLDocument> {
  return apiFetch<XMLDocument>('/documents', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateDocument(
  id: string,
  content: string,
): Promise<{ updatedAt: string }> {
  return apiFetch<{ updatedAt: string }>(`/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await apiFetch<void>(`/documents/${id}`, { method: 'DELETE' });
}

export async function addAnnotation(
  docId: string,
  annotation: Annotation,
): Promise<Annotation> {
  return apiFetch<Annotation>(`/documents/${docId}/annotations`, {
    method: 'POST',
    body: JSON.stringify(annotation),
  });
}

export async function getAnnotations(docId: string): Promise<Annotation[]> {
  return apiFetch<Annotation[]>(`/documents/${docId}/annotations`);
}

export async function deleteAnnotation(docId: string, id: string): Promise<void> {
  await apiFetch<void>(`/documents/${docId}/annotations/${id}`, { method: 'DELETE' });
}
