# xml-organizer

Proof-of-concept (POC) collaborative XML editor built with **React + TypeScript + Vite**.

## Features

- **XML Editor** – monospace textarea with line numbers and annotated-line highlighting
- **Annotations** – add comments scoped to:
  - the whole **document**
  - a specific **XML tag** (selected by auto-detected XPath)
  - a **line number**
  - a **text range** (character offsets)
- **Simulated real-time sync** via:
  - `BroadcastChannel` API (cross-tab updates in the same browser)
  - `setInterval` polling on `localStorage` (fallback)
- **3 simulated users** (Alice, Bob, Carol) – switch between them to demo multi-user collaboration
- **Mock API layer** (`src/api/mockApi.ts`) persists data to `localStorage`
- Clicking an annotation scrolls the editor to the relevant location

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| State | Zustand |
| Persistence | localStorage (mock API) |
| Realtime | BroadcastChannel + polling |
| Styling | Plain CSS (dark theme) |

## Project Structure

```
src/
  api/
    mockApi.ts          # getDocument / updateDocument / addAnnotation / getAnnotations / deleteAnnotation
  components/
    AnnotationForm.tsx  # Modal form to create annotations
    AnnotationPanel.tsx # Right-side annotation list with filtering & search
    UserSelector.tsx    # Switch between simulated users
    XmlEditor.tsx       # Left-side XML editor with overlay highlighting
  hooks/
    usePollingSync.ts   # localStorage polling fallback sync
  store/
    useStore.ts         # Zustand store + BroadcastChannel wiring
  types/
    index.ts            # TypeScript interfaces (XMLDocument, Annotation, etc.)
  utils/
    xmlParser.ts        # Regex-based XML tag/xpath/line extractor
  App.tsx
  main.tsx
  index.css
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).  
Open the same URL in a second tab to see real-time sync via `BroadcastChannel`.

## Usage

1. **Edit XML** in the left panel – changes are saved on blur
2. **Right-click** in the editor to annotate the current line or selected text
3. Click **"+ Doc annotation"** to annotate the whole document
4. Click any annotation card to jump to its location in the editor
5. Switch active user with the **Alice / Bob / Carol** buttons in the header
