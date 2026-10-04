# PagePilot: Remaining Limitations & Architectural Boundaries

After migrating to the Ollama `api/chat` endpoint and implementing dual-layer DOM extraction, PagePilot is significantly more stable. However, a few fundamental limitations remain due to the nature of running a 4B parameter local LLM against raw, unstructured DOM data on Single Page Applications (SPAs).

## 1. Single Page Application (SPA) DOM Ghosting
**The Issue:** When you navigate between posts on complex SPAs like LinkedIn or Twitter, the browser does not load a fresh page. Instead, it dynamically swaps out content. Often, SPAs will hide the "old" post using CSS (`display: none` or off-screen positioning) rather than actually deleting it from the DOM to make the "back" button faster. 
**The Impact:** When PagePilot extracts `document.body.innerText` or `<main>`, the browser sometimes still returns the text of the *previous* post because it's technically still in the HTML. 
**The Workaround:** A hard page refresh (F5) clears the DOM cache and forces the browser to only render the current post. Without writing brittle, site-specific scrapers for every website on the internet, this is an unavoidable limitation of general DOM extraction.

## 2. Metric and Math Hallucinations
**The Issue:** Raw DOM extraction clumps text together without context (e.g., `"Mohd Shamsuddin and 226 others \n 28 comments"`).
**The Impact:** Small models like Gemma 3 4B (unlike massive models like GPT-4) struggle heavily with spatial reasoning and math. When asked "how many reactions", it often conflates the comment count with the reaction count, or gets confused by UI elements like "840 Profile viewers".
**The Workaround:** We have hardcoded a system limitation instructing the AI to refuse to do math and simply quote the text verbatim. However, it will still occasionally struggle to isolate the correct number if the DOM dump is particularly messy.

## 3. Context Window Truncation
**The Issue:** Gemma 3 4B operates optimally within a 4,000-8,000 token context window.
**The Impact:** If a webpage has massive comment sections or extremely long articles, PagePilot forcibly truncates the text at 5,000 characters to prevent the model from crashing or losing its instruction memory (the "lost in the middle" phenomenon).
**The Workaround:** Information at the very bottom of long pages (like deep comment threads) will be invisible to the AI.

## 4. Multi-Page Research (RAG)
**The Issue:** Currently, PagePilot only knows about the *active* tab.
**The Impact:** You cannot ask it to "compare this LinkedIn post to the one I was looking at 10 minutes ago" because it does not maintain a vector database of your browsing history.
**The Workaround:** This requires implementing a local embedding model (like `nomic-embed-text`) and a vector database (like ChromaDB or an in-memory cosine similarity search), which was intentionally excluded from this sprint.
