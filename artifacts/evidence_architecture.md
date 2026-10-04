# PagePilot Evidence-Grounding Architecture Proposal

To enable PagePilot to cite its sources and display expandable evidence blocks, we need to transition from sending a monolithic text blob to sending structured, identifiable chunks. 

Here is the proposed architecture:

## 1. Section Chunking (Content Script & Background)
Currently, `content/index.tsx` returns a massive `rawText` string. We will modify the extraction logic to split this text into meaningful semantic chunks.
- **Method:** We can split `rawText` and `articleText` by double-newlines (`\n\n`) to naturally divide the text by paragraphs and UI blocks.
- **Mapping:** In `background/index.ts`, we will map each chunk to a unique ID (e.g., `[Doc 1]`, `[Doc 2]`).

## 2. Prompting Gemma (Background)
We will format the injected context so Gemma clearly sees the boundaries and IDs:
```text
--- WEBPAGE SOURCES ---
[Doc 1]
ALLIET Software Labs is an independent software lab.

[Doc 2]
We design and build AI systems.
```

We will update the system prompt with strict citation rules:
> *"When stating a fact from the webpage, you MUST append the source citation at the end of the sentence like this: [Doc 1]. If the provided documents do not contain the answer, explicitly state that you cannot answer based on the current context. Do not fabricate citations."*

## 3. Passing Sources to the UI (Port Communication)
When the user clicks "Send", the background script will extract and chunk the context. It will send these chunks back to the React UI via a new message type on the port:
```typescript
port.postMessage({ 
  type: 'SOURCES_USED', 
  messageId: assistantId, 
  sources: { "Doc 1": "ALLIET Software...", "Doc 2": "We design..." } 
});
```

## 4. UI Rendering (React Sidebar)
In `sidebar.tsx`, we will update the `Message` interface to optionally hold an array of `citedSources`.
- **Parsing:** We will use a regular expression (e.g., `/\[Doc (\d+)\]/g`) to parse Gemma's response text and identify which citations were actually used.
- **Display:** We will build a new `<CollapsibleEvidence>` React component. Beneath the assistant's message, we will display pill-shaped buttons like `[1]`, `[2]`. Clicking them expands a small accordion showing the exact source text that Gemma referenced.

## Feasibility for Gemma 3 4B
Gemma 3 4B handles document-grounding extremely well, provided the document IDs are short and unambiguous (like `[Doc 1]`). By keeping the chunks relatively short (e.g., 50-200 words each), we ensure the model doesn't get confused about which ID belongs to which text block.

Please review this architecture. If you approve, I will begin implementing the chunking and UI rendering.
