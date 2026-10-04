import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  isError?: boolean;
  sources?: Record<string, string>;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Sidebar = () => {
  const [input, setInput] = useState('');
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [activeId, setActiveId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<Record<number, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab selection state
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [openTabs, setOpenTabs] = useState<chrome.tabs.Tab[]>([]);
  const [selectedTabs, setSelectedTabs] = useState<chrome.tabs.Tab[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  const messages = activeId && conversations[activeId] ? conversations[activeId].messages : [];

  // Storage helper
  const updateConversation = (id: string, updater: (conv: Conversation) => Conversation) => {
    setConversations(prev => {
      const current = prev[id];
      if (!current) return prev;
      const updated = updater(current);
      const newState = { ...prev, [id]: updated };
      chrome.storage.local.set({ conversations: newState });
      return newState;
    });
  };

  useEffect(() => {
    // Load from storage
    chrome.storage.local.get(['conversations', 'activeId']).then((res) => {
      const loadedConversations = (res.conversations || {}) as Record<string, Conversation>;
      let loadedActiveId = (res.activeId as string) || '';
      
      if (Object.keys(loadedConversations).length === 0) {
        // Create initial chat
        const newId = Date.now().toString();
        loadedConversations[newId] = { id: newId, title: 'New Chat', updatedAt: Date.now(), messages: [] };
        loadedActiveId = newId;
        chrome.storage.local.set({ conversations: loadedConversations, activeId: loadedActiveId });
      } else if (!loadedActiveId || !loadedConversations[loadedActiveId]) {
        // Pick most recent
        const sorted = Object.values(loadedConversations).sort((a, b) => b.updatedAt - a.updatedAt);
        loadedActiveId = sorted[0].id;
        chrome.storage.local.set({ activeId: loadedActiveId });
      }

      setConversations(loadedConversations);
      setActiveId(loadedActiveId);
    });
  }, []);

  const createNewChat = () => {
    // Check if an empty chat already exists
    const emptyChat = Object.values(conversations).find(conv => conv.messages.length === 0);
    if (emptyChat) {
      switchChat(emptyChat.id);
      return;
    }

    const newId = Date.now().toString();
    const newConv: Conversation = { id: newId, title: 'New Chat', updatedAt: Date.now(), messages: [] };
    setConversations(prev => {
      const newState = { ...prev, [newId]: newConv };
      chrome.storage.local.set({ conversations: newState, activeId: newId });
      return newState;
    });
    setActiveId(newId);
    setIsSidebarOpen(false);
  };

  const switchChat = (id: string) => {
    setActiveId(id);
    chrome.storage.local.set({ activeId: id });
    setIsSidebarOpen(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => {
      const newState = { ...prev };
      delete newState[id];
      
      let nextActiveId = activeId;
      if (activeId === id) {
        const remaining = Object.values(newState).sort((a, b) => b.updatedAt - a.updatedAt);
        if (remaining.length > 0) {
          nextActiveId = remaining[0].id;
        } else {
          // Create an empty one if all are deleted
          nextActiveId = Date.now().toString();
          newState[nextActiveId] = { id: nextActiveId, title: 'New Chat', updatedAt: Date.now(), messages: [] };
        }
        setActiveId(nextActiveId);
        chrome.storage.local.set({ activeId: nextActiveId });
      }
      chrome.storage.local.set({ conversations: newState });
      return newState;
    });
  };

  // Removed aggressive auto-scroll on [messages] so users can read from top to bottom.

  const toggleCitation = (msgId: number, docId: string) => {
    setExpandedCitations(prev => {
      const msgCitations = prev[msgId] || [];
      if (msgCitations.includes(docId)) {
        return { ...prev, [msgId]: msgCitations.filter(id => id !== docId) };
      }
      return { ...prev, [msgId]: [...msgCitations, docId] };
    });
  };

  const activeIdRef = useRef<string>('');
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const connect = (): chrome.runtime.Port => {
    if (portRef.current) return portRef.current;

    const port = chrome.runtime.connect({ name: 'ollama-chat' });
    portRef.current = port;

    port.onMessage.addListener((msg: any) => {
      const currentId = activeIdRef.current;
      if (!currentId) return;

      if (msg.type === 'CHUNK') {
        setConversations(prev => {
          const conv = prev[currentId];
          if (!conv) return prev;
          const newMsgs = conv.messages.map(m => 
            m.id === msg.messageId ? { ...m, text: m.text + msg.text } : m
          );
          return { ...prev, [currentId]: { ...conv, messages: newMsgs } };
        });
      } else if (msg.type === 'SOURCES_USED') {
        updateConversation(currentId, conv => ({
          ...conv,
          messages: conv.messages.map(m => m.id === msg.messageId ? { ...m, sources: msg.sources } : m)
        }));
      } else if (msg.type === 'DONE') {
        updateConversation(currentId, conv => ({
          ...conv,
          messages: conv.messages.map(m => m.id === msg.messageId ? { ...m, isStreaming: false } : m)
        }));
        setIsGenerating(false);
        setActiveMessageId(null);
      } else if (msg.type === 'ERROR') {
        updateConversation(currentId, conv => ({
          ...conv,
          messages: conv.messages.map(m => m.id === msg.messageId ? { ...m, text: m.text + (m.text ? '\n\n' : '') + '⚠️ ' + msg.error, isError: true, isStreaming: false } : m)
        }));
        setIsGenerating(false);
        setActiveMessageId(null);
      } else if (msg.type === 'TITLE_GENERATED') {
        updateConversation(msg.conversationId, conv => ({
          ...conv,
          title: msg.title
        }));
      }
    });

    port.onDisconnect.addListener(() => {
      portRef.current = null;
      const currentId = activeIdRef.current;
      if (currentId) {
        updateConversation(currentId, conv => ({
          ...conv,
          messages: conv.messages.map(m => {
            if (m.isStreaming) {
              return { ...m, text: m.text + '\n\n⚠️ Connection lost. Please try again.', isError: true, isStreaming: false };
            }
            return m;
          })
        }));
      }
      setIsGenerating(false);
      setActiveMessageId(null);
    });

    return port;
  };
  // Listen to input for @ mentions
  useEffect(() => {
    const match = input.match(/(?:^|\s)@([^\s]*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      chrome.tabs.query({}).then(tabs => {
        const filtered = tabs.filter(t => t.url && !t.url.startsWith('chrome-extension://') && (!query || (t.title && t.title.toLowerCase().includes(query))));
        setOpenTabs(filtered);
        setShowTabMenu(true);
      });
    } else {
      setShowTabMenu(false);
    }
  }, [input]);

  const handleTabSelect = (tab: chrome.tabs.Tab) => {
    if (!selectedTabs.find(t => t.id === tab.id)) {
      setSelectedTabs([...selectedTabs, tab]);
    }
    setInput(input.replace(/(^|\s)@[^\s]*$/, ' '));
    setShowTabMenu(false);
  };
  
  const removeTab = (tabId: number) => {
    setSelectedTabs(selectedTabs.filter(t => t.id !== tabId));
  };

  useEffect(() => {
    connect();
    return () => {
      portRef.current?.disconnect();
      portRef.current = null;
    };
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating || !activeId) return;
    
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now(), role: 'user', text };
    const assistantId = Date.now() + 1;
    const assistantMsg: Message = { id: assistantId, role: 'assistant', text: '', isStreaming: true };

    const currentConv = conversations[activeId];
    if (!currentConv) return;
    
    const history = currentConv.messages
      .filter(m => !m.isError && !m.isStreaming && m.text !== '')
      .map(m => ({ role: m.role, content: m.text }));

    const isFirstMessage = history.length === 0;

    updateConversation(activeId, conv => ({
      ...conv,
      updatedAt: Date.now(),
      messages: [...conv.messages, userMsg, assistantMsg],
      title: isFirstMessage ? text.substring(0, 30) + '...' : conv.title
    }));

    setInput('');
    setIsGenerating(true);
    setActiveMessageId(assistantId);
    
    // Scroll to the bottom to see the user's message and the start of the assistant's response.
    // We delay slightly to allow React to render the new message containers first.
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    const port = connect();
    port.postMessage({
      type: 'START_GENERATION',
      prompt: text,
      history,
      messageId: assistantId,
      includeContext: true,
      selectedTabIds: selectedTabs.map(t => t.id)
    });

    if (isFirstMessage) {
      port.postMessage({
        type: 'GENERATE_TITLE',
        prompt: text,
        conversationId: activeId
      });
    }
  };

  const handleStop = () => {
    if (portRef.current && activeMessageId && activeId) {
      portRef.current.postMessage({
        type: 'STOP_GENERATION',
        messageId: activeMessageId
      });
      
      updateConversation(activeId, conv => ({
        ...conv,
        messages: conv.messages.map(m => 
          m.id === activeMessageId ? { ...m, isStreaming: false } : m
        )
      }));
      setIsGenerating(false);
      setActiveMessageId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-slate-200 font-sans relative overflow-hidden">
      {/* Sidebar Drawer */}
      <div className={`absolute inset-y-0 left-0 w-64 bg-[#0F1423]/95 backdrop-blur-xl border-r border-white/10 z-50 transform transition-transform duration-300 flex flex-col shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <span className="font-bold text-white tracking-wide">History</span>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-md hover:bg-white/5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="p-3">
          <button 
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-200 text-black rounded-lg transition-all font-bold cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Chat
          </button>
          
          <div className="mt-3 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {Object.values(conversations)
            .filter(conv => conv.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(conv => (
            <div 
              key={conv.id} 
              onClick={() => switchChat(conv.id)}
              className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200 ${activeId === conv.id ? 'bg-white/10 text-white border border-white/20 shadow-inner' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}`}
            >
              <div className="truncate text-sm flex-1 mr-2">{conv.title}</div>
              <button 
                onClick={(e) => deleteChat(conv.id, e)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-1.5 cursor-pointer rounded-md hover:bg-red-500/10"
                title="Delete Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Header / Branding */}
      <header className="flex-none p-4 border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-xl z-30 sticky top-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Chat History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shadow-lg shadow-[0_0_15px_rgba(255,255,255,0.15)] border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" fill="url(#paint0_linear)" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="currentColor" stopOpacity="0.3"/>
                    <stop offset="1" stopColor="currentColor" stopOpacity="0.1"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gradient">
                PagePilot
              </h1>
              <p className="text-[11px] text-blue-400 font-bold uppercase tracking-wider bg-blue-900/30 px-1.5 py-0.5 rounded inline-block mt-0.5">Powered by Gemma 3 4B</p>
            </div>
          </div>
          <button 
            onClick={() => window.close()}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close Panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 relative">
        {/* Welcome Message */}
        <div className="flex flex-col gap-2 p-5 rounded-2xl glass-bubble animate-slide-up relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-gradient tracking-wide">Yo! What's up? 🚀</h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-[90%] relative z-10 font-medium">
            I'm PagePilot, your local AI buddy. I'm running right here on your machine via Ollama, so everything stays private. Whatcha wanna know about this page? Let's dive in!
          </p>
        </div>
        
        {/* Chat Messages */}
        {messages.map((msg, index) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`} style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}>
            <div className={`max-w-[85%] p-3.5 px-4 rounded-2xl text-[14px] leading-relaxed break-words shadow-sm ${
              msg.role === 'user' 
                ? 'bg-white text-black rounded-br-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                : 'glass-bubble text-slate-200 rounded-bl-sm'
            } ${msg.isError ? 'border border-red-500/30 text-red-200 bg-red-950/40 shadow-red-900/20' : ''}`}>
              {msg.text ? (
                msg.role === 'assistant' && !msg.isError ? (
                  <div className="markdown-content space-y-3 font-medium">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc ml-5 space-y-1.5 marker:text-white/40" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal ml-5 space-y-1.5 marker:text-white/40 font-semibold" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1 text-slate-300 font-normal" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mt-5 mb-3 tracking-tight" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mt-4 mb-2 tracking-tight" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-semibold text-slate-200 mt-3 mb-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-slate-400" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-white/30 pl-4 py-1 my-3 text-slate-400 italic bg-white/5 rounded-r-lg" {...props} />,
                        a: ({node, href, children, ...props}) => {
                          if (href?.startsWith('#citation-Doc-')) {
                            const docId = `[Doc ${href.split('-')[2]}]`;
                            const isActive = expandedCitations[msg.id]?.includes(docId);
                            return (
                              <button 
                                onClick={() => toggleCitation(msg.id, docId)}
                                className={`inline-flex items-center justify-center px-2 py-0.5 mx-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer align-text-top border ${isActive ? 'bg-white text-black shadow-[0_0_10px_rgba(255,255,255,0.3)] active:scale-95' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'}`}
                                title="View Source"
                                type="button"
                              >
                                {children}
                              </button>
                            );
                          }
                          if (href?.startsWith('#invalid-citation')) {
                            return (
                              <span 
                                className="inline-flex items-center justify-center px-2 py-0.5 mx-0.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 line-through cursor-help align-text-top"
                                title="PagePilot caught the AI hallucinating this citation. It does not exist in the page context."
                              >
                                {children}
                              </span>
                            );
                          }
                          return <a href={href} className="text-white/40 hover:text-slate-200 underline underline-offset-4 decoration-white/30 transition-colors" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                        },
                        code: ({node, className, children, ...props}) => {
                          const match = /language-(\w+)/.exec(className || '');
                          return !match ? (
                            <code className="bg-black/30 border border-white/5 px-1.5 py-0.5 rounded-md text-[13px] font-mono text-slate-200" {...props}>
                              {children}
                            </code>
                          ) : (
                            <div className="relative group my-4">
                              <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider bg-white/5 rounded-bl-lg rounded-tr-lg border-b border-l border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">{match[1]}</div>
                              <code className="block bg-[#05070a] p-4 pt-6 rounded-xl text-[13px] font-mono overflow-x-auto text-slate-300 shadow-inner border border-white/5" {...props}>
                                {children}
                              </code>
                            </div>
                          );
                        },
                        table: ({node, ...props}) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="w-full text-left border-collapse text-sm" {...props} /></div>,
                        th: ({node, ...props}) => <th className="border-b border-white/10 py-3 px-4 bg-white/5 font-semibold text-white" {...props} />,
                        td: ({node, ...props}) => <td className="border-b border-white/5 py-3 px-4 text-slate-300 bg-black/20" {...props} />,
                      }}
                    >
                      {msg.text.replace(/\[((?:Doc \d+(?:,\s*)?)+)\]/g, (_, inner) => {
                        const docs = inner.split(/,\s*/);
                        const links = docs.map((doc: string) => {
                          const p1 = doc.replace('Doc ', '').trim();
                          if (msg.sources && msg.sources[`[Doc ${p1}]`]) {
                            return `[[${p1}]](#citation-Doc-${p1})`;
                          }
                          return `[[${p1}!]](#invalid-citation)`;
                        });
                        return links.join(' ');
                      })}
                    </ReactMarkdown>

                    {expandedCitations[msg.id] && expandedCitations[msg.id].length > 0 && (
                      <div className="mt-5 pt-4 border-t border-white/10 space-y-3 animate-slide-up">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          Reference Sources
                        </div>
                        {expandedCitations[msg.id].map(docId => (
                          <div key={docId} className="bg-[#05070a] border border-white/10 rounded-xl overflow-hidden shadow-inner">
                            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/5">
                              <span className="text-[11px] font-semibold text-slate-200">{docId}</span>
                              <button onClick={() => toggleCitation(msg.id, docId)} className="text-slate-500 hover:text-slate-200 transition-colors bg-white/5 hover:bg-white/10 p-1 rounded-md cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            </div>
                            <div className="p-3.5 text-[12px] text-slate-400 leading-relaxed font-mono whitespace-pre-wrap">
                              {msg.sources?.[docId] || 'Source content unavailable.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )
              ) : (
                msg.isStreaming ? (
                  <div className="flex items-center gap-2 text-slate-200 font-medium h-6 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : ''
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="flex-none p-4 pb-6 bg-[#0B0F19]/90 backdrop-blur-xl border-t border-white/5 relative z-20">
        
        {/* Tab Selection Menu */}
        {showTabMenu && openTabs.length > 0 && (
          <div className="absolute bottom-full mb-2 left-4 right-4 bg-[#0a0d14] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50">
            <div className="px-3 py-2 border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Tabs to Include</div>
            {openTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSelect(tab)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                {tab.favIconUrl ? (
                  <img src={tab.favIconUrl} alt="" className="w-4 h-4 rounded-sm" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                )}
                <span className="flex-1 text-[13px] text-slate-200 truncate">{tab.title}</span>
              </button>
            ))}
          </div>
        )}

        <form 
          className="relative max-w-4xl mx-auto flex flex-col gap-2"
          onSubmit={handleSend}
        >
          {/* Selected Tabs Area */}
          {selectedTabs.length > 0 && (
            <div className="w-full flex items-center gap-2 flex-wrap px-1">
              {selectedTabs.map(tab => (
                <div key={tab.id} className="flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-md text-[12px] font-medium shadow-sm max-w-[200px]">
                  {tab.favIconUrl && <img src={tab.favIconUrl} alt="" className="w-3.5 h-3.5 rounded-sm" />}
                  <span className="truncate">{tab.title}</span>
                  <button type="button" onClick={() => removeTab(tab.id!)} className="hover:bg-indigo-500/30 rounded-full p-0.5 ml-1 transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 w-full">
            <div className="relative flex-1 bg-white/5 rounded-[24px] border border-white/10 focus-within:border-white/30 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:bg-white/10 transition-all overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <textarea
              className="w-full max-h-32 min-h-[52px] bg-transparent text-[14px] text-white placeholder-slate-500 p-4 outline-none resize-none disabled:opacity-50 font-medium"
              placeholder="Ask anything... (Press @ to add tabs)"
              rows={1}
              value={input}
              disabled={isGenerating}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          {isGenerating ? (
            <button 
              type="button"
              onClick={handleStop}
              className="flex-none w-[52px] h-[52px] rounded-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-white flex items-center justify-center transition-all shadow-lg cursor-pointer"
              title="Stop generation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current text-slate-300" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
              </svg>
            </button>
          ) : (
            <button 
              type="submit"
              disabled={!input.trim()}
              className="flex-none w-[52px] h-[52px] rounded-full bg-white hover:bg-slate-200 disabled:bg-[#111] disabled:text-slate-600 text-black flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] active:scale-95 disabled:shadow-none cursor-pointer border border-white/10 disabled:border-transparent group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
          </div>
        </form>
        <div className="text-center mt-3">
          <span className="text-[10px] text-slate-500/70 font-semibold tracking-widest uppercase">Powered by Gemma 3 4B</span>
        </div>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Sidebar />
    </React.StrictMode>
  );
}
