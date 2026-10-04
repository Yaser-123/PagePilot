# PagePilot Conversation Persistence Architecture

Based on my inspection of `src/sidebar/sidebar.tsx` and `src/background/index.ts`, PagePilot currently uses entirely **ephemeral React state**. When the side panel closes or unmounts, the `messages` array is garbage collected, destroying the conversation and citations. 

To introduce ChatGPT-style persistent history, we can leverage `browser.storage.local`.

## 1. Data Model
We will implement the following structured storage model in `browser.storage.local`:

```typescript
interface Conversation {
  id: string;             // UUID or timestamp
  title: string;          // Auto-generated from the first prompt
  updatedAt: number;     // For sorting the history panel
  messages: Message[];   // Includes original text, citations, and evidence sources
}

interface PagePilotStorage {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
}
```

## 2. Architecture & Lifecycle

### Sidebar UI (`src/sidebar/sidebar.tsx`)
- **Initialization:** Upon mount, a `useEffect` reads `PagePilotStorage`. It loads the active conversation's messages into the local `messages` state.
- **Syncing:** We will implement a `saveConversation` function. It will be called to flush the local `messages` array to storage on key events:
  - When the user sends a prompt.
  - When the background script sends the `SOURCES_USED` port message.
  - When the background script sends the `DONE` port message.
  - *(We will purposefully NOT save during `CHUNK` streaming to avoid overwhelming the Chrome storage I/O limits).*
- **History Panel:** We will add a toggleable left-hand drawer (hamburger menu) over the chat area. This drawer will map over `conversations`, sorted by `updatedAt`, allowing users to switch chats, delete chats, or start a "New Chat".

### Background Scripts (`src/background/index.ts`)
The background script will remain largely stateless, acting as an Ollama proxy. 
- **Continuing Conversations:** Because the UI builds the `history` array from its local state and sends it in the `START_GENERATION` payload, continuing an old conversation will "just work" without modifying the backend.
- **Title Generation:** We will add a new background listener for `GENERATE_TITLE`. When a user creates a new conversation, the UI sends the first prompt to the background. The background briefly hits Ollama with a system prompt: `"Summarize this query into a 3-5 word title"`, and returns it to the UI for storage.

## 3. Potential Issues & Changes Needed

1. **Storage Limits:** 
   `browser.storage.local` has a strict 5MB quota by default. Because we store `msg.sources` (which contains large raw text chunks for evidence), power users will hit this limit quickly.
   **Solution:** We must add the `"unlimitedStorage"` permission to `manifest.json`.
   
2. **State Desync:** 
   Multiple tabs opening the side panel could cause race conditions if they both write to storage simultaneously. 
   **Solution:** Since Chrome Side Panels are globally shared across a window, this is mostly mitigated. We will rely on React's local state as the source of truth while the panel is open, and push to storage periodically.

If you approve this architectural approach, I will begin implementing the UI drawer, the storage manager hooks, the title generation, and the manifest updates.
