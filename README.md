<div align="center">
  <img src="public/icon128.png" alt="PagePilot Logo" width="128" />
  <h1>PagePilot 🚀</h1>
  <p><strong>Your local-first, privacy-focused browser assistant powered by Gemma 3 4B.</strong></p>
  <p>
    Built for the <a href="https://dev.to/challenges">Hacktoberfest 2026 Weekend Challenge: Build for a Friend</a><br/>
    📖 <strong>Read the full story and development journey on <a href="https://dev.to/yaser-123/from-windows-to-linux-chrome-to-brave-one-missing-feature-one-solution-pagepilot-4d33">DEV.to</a>!</strong>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Powered%20by-Gemma-blue" alt="Powered by Gemma" />
    <img src="https://img.shields.io/badge/AI-Ollama-white" alt="AI Ollama" />
    <img src="https://img.shields.io/badge/Hacktoberfest-2026-forest" alt="Hacktoberfest 2026" />
  </p>
</div>

---

## 🌟 What is PagePilot?

PagePilot is a sleek, modern browser extension that puts a powerful AI assistant right in your sidebar. Unlike other AI extensions that send your browsing data to the cloud, **PagePilot runs 100% locally on your machine** using Ollama and Gemma 3 4B.

I built this for a friend who does deep research across multiple tabs but was uncomfortable sending sensitive documents and private tabs to third-party APIs. With PagePilot, they get a brilliant AI that reads what they read, right from their machine, keeping their data completely off external servers.

## 🏆 Hacktoberfest 2026: Build for a Friend

This project was built during the **Hacktoberfest 2026 Weekend Challenge**.

- **Theme:** Build for a Friend
- **Featured Category:** Best Use of Gemma

### Why Open Matters Here
Open-weight models are the core of PagePilot. By leveraging **Gemma 3 4B** via Ollama, PagePilot can run on a laptop with zero internet connection. It keeps personal data off servers you don't control, costs absolutely nothing to run (no API fees!), and gives users the freedom to chat with their active browser tabs in total privacy.

## ✨ Features

- 🧠 **100% Local AI:** Powered seamlessly by local Ollama. Zero latency, zero cost, zero data harvesting.
- 📑 **Intelligent Context Extraction:** Reads the current webpage—or specific highlighted text—and uses it as evidence to answer your questions.
- 📚 **Multi-Tab Selection:** Type `@` in the chat to summon a sleek popover. Select multiple open tabs to fuse them into one massive local knowledge base!
- 🎯 **Clickable Citations:** When Gemma quotes a fact, she provides a `[Doc X]` citation. Click it to immediately see exactly what part of the page she's referencing!
- 💬 **Real-time Markdown Streaming:** Watch your answers generate instantly with beautiful formatting, code highlighting, and a smooth, non-disruptive auto-scroll.
- 🎨 **Glassmorphism UI:** A stunning, modern dark-mode aesthetic that looks incredible on any webpage.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS (Glassmorphism & Dark Mode)
- **Extension API:** Chrome Manifest V3
- **AI Backend:** Ollama running [Gemma 3 4B](https://ollama.com/library/gemma3)

## 🚀 Getting Started

### Prerequisites

1. Install [Ollama](https://ollama.com/).
2. Pull the Gemma model:
   ```bash
   ollama run gemma3:4b
   ```
   *(Note: Adjust the model in `src/background/index.ts` if you are using a different model name).*
3. Ensure Ollama is running and accessible (default is `http://localhost:11434`).
4. Install Node.js (v18+).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Yaser-123/PagePilot.git
   cd PagePilot
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load into your browser (Chrome/Brave/Edge):
   - Go to `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `dist` folder generated from the build.

## 💡 How to Use

1. Click the PagePilot extension icon to open the sidebar.
2. Ask any question about the page you are on.
3. Type `@` to select other open tabs to include in your question context.
4. Enjoy private, local AI!

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
