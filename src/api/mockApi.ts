import type { Annotation, XMLDocument } from '../types';

const STORAGE_KEY = 'xml_organizer_doc';

const DEFAULT_CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<project name="xml-organizer" version="1.0">
  <description>Collaborative XML editor POC</description>
  <team>
    <member role="lead">
      <name>Alice</name>
      <email>alice@example.com</email>
    </member>
    <member role="developer">
      <name>Bob</name>
      <email>bob@example.com</email>
    </member>
    <member role="tester">
      <name>Carol</name>
      <email>carol@example.com</email>
    </member>
  </team>
  <modules>
    <module id="editor" status="active">XML Editor</module>
    <module id="annotations" status="active">Annotation Engine</module>
    <module id="sync" status="wip">Real-time Sync</module>
  </modules>
</project>`;

function readStorage(): XMLDocument {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as XMLDocument;
  } catch {
    // ignore
  }
  return { id: 'doc-1', content: DEFAULT_CONTENT, annotations: [] };
}

function writeStorage(doc: XMLDocument): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // ignore
  }
}

// Simulated async delay to mimic network latency
function delay(ms = 60): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function getDocument(): Promise<XMLDocument> {
  await delay();
  return readStorage();
}

export async function updateDocument(content: string): Promise<XMLDocument> {
  await delay();
  const doc = readStorage();
  const updated = { ...doc, content };
  writeStorage(updated);
  return updated;
}

export async function addAnnotation(annotation: Annotation): Promise<Annotation> {
  await delay();
  const doc = readStorage();
  const updated = { ...doc, annotations: [...doc.annotations, annotation] };
  writeStorage(updated);
  return annotation;
}

export async function getAnnotations(): Promise<Annotation[]> {
  await delay();
  return readStorage().annotations;
}

export async function deleteAnnotation(id: string): Promise<void> {
  await delay();
  const doc = readStorage();
  const updated = { ...doc, annotations: doc.annotations.filter((a) => a.id !== id) };
  writeStorage(updated);
}
