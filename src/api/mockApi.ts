import type { Annotation, XMLDocument, XMLDocumentMeta } from '../types';

const DOCS_KEY = 'xml_organizer_docs';

const DEFAULT_DOCS: XMLDocument[] = [
  {
    id: 'doc-1',
    name: 'Project XML',
    updatedAt: new Date().toISOString(),
    annotations: [],
    content: `<?xml version="1.0" encoding="UTF-8"?>
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
</project>`,
  },
  {
    id: 'doc-2',
    name: 'Config XML',
    updatedAt: new Date().toISOString(),
    annotations: [],
    content: `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <database>
    <host>localhost</host>
    <port>5432</port>
    <name>xml_organizer</name>
  </database>
  <server>
    <host>0.0.0.0</host>
    <port>8080</port>
  </server>
</config>`,
  },
];

// ── Storage helpers ──────────────────────────────────────────────────────────

function readAllDocs(): Record<string, XMLDocument> {
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, XMLDocument>;
  } catch {
    // ignore
  }
  // First run: seed default documents
  const map: Record<string, XMLDocument> = {};
  DEFAULT_DOCS.forEach((d) => (map[d.id] = d));
  localStorage.setItem(DOCS_KEY, JSON.stringify(map));
  return map;
}

function writeAllDocs(map: Record<string, XMLDocument>): void {
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Simulated async delay to mimic network latency
function delay(ms = 60): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function listDocuments(): Promise<XMLDocumentMeta[]> {
  await delay();
  const map = readAllDocs();
  return Object.values(map)
    .map(({ id, name, annotations, updatedAt }) => ({
      id,
      name,
      annotationCount: annotations.length,
      updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDocument(id: string): Promise<XMLDocument | null> {
  await delay();
  return readAllDocs()[id] ?? null;
}

export async function createDocument(name: string): Promise<XMLDocument> {
  await delay();
  const map = readAllDocs();
  const doc: XMLDocument = {
    id: `doc-${Date.now()}`,
    name,
    content: `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>`,
    annotations: [],
    updatedAt: new Date().toISOString(),
  };
  map[doc.id] = doc;
  writeAllDocs(map);
  return doc;
}

export async function updateDocument(id: string, content: string): Promise<XMLDocument> {
  await delay();
  const map = readAllDocs();
  const doc = map[id];
  if (!doc) throw new Error(`Document ${id} not found`);
  const updated = { ...doc, content, updatedAt: new Date().toISOString() };
  map[id] = updated;
  writeAllDocs(map);
  return updated;
}

export async function deleteDocument(id: string): Promise<void> {
  await delay();
  const map = readAllDocs();
  delete map[id];
  writeAllDocs(map);
}

export async function addAnnotation(docId: string, annotation: Annotation): Promise<Annotation> {
  await delay();
  const map = readAllDocs();
  const doc = map[docId];
  if (!doc) throw new Error(`Document ${docId} not found`);
  map[docId] = { ...doc, annotations: [...doc.annotations, annotation] };
  writeAllDocs(map);
  return annotation;
}

export async function getAnnotations(docId: string): Promise<Annotation[]> {
  await delay();
  return readAllDocs()[docId]?.annotations ?? [];
}

export async function deleteAnnotation(docId: string, id: string): Promise<void> {
  await delay();
  const map = readAllDocs();
  const doc = map[docId];
  if (!doc) return;
  map[docId] = { ...doc, annotations: doc.annotations.filter((a) => a.id !== id) };
  writeAllDocs(map);
}
