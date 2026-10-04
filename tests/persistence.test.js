// Tests for Conversation Persistence Logic

class MockStorage {
  constructor() {
    this.data = {};
  }
  async get(keys) {
    const res = {};
    keys.forEach(k => {
      res[k] = this.data[k];
    });
    return res;
  }
  async set(obj) {
    Object.assign(this.data, obj);
  }
}

async function runPersistenceTests() {
  console.log('Running Persistence Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  };

  const storage = new MockStorage();

  // 1. Initial Load
  let loadedConversations = (await storage.get(['conversations'])).conversations || {};
  let loadedActiveId = (await storage.get(['activeId'])).activeId || '';

  if (Object.keys(loadedConversations).length === 0) {
    const newId = 'test-id-1';
    loadedConversations[newId] = { id: newId, title: 'New Chat', updatedAt: 100, messages: [] };
    loadedActiveId = newId;
    await storage.set({ conversations: loadedConversations, activeId: loadedActiveId });
  }

  assert(Object.keys(loadedConversations).length === 1, 'Initial load creates one new chat');
  assert(loadedActiveId === 'test-id-1', 'Active ID is set correctly on initial load');

  // 2. Add Message and Citation (Citation Preservation)
  loadedConversations['test-id-1'].messages.push({
    id: 1,
    role: 'assistant',
    text: 'Hello [Doc 1]',
    sources: { '[Doc 1]': 'Extract text' }
  });
  await storage.set({ conversations: loadedConversations });
  
  const saved = await storage.get(['conversations']);
  assert(saved.conversations['test-id-1'].messages[0].sources['[Doc 1]'] === 'Extract text', 'Citation sources are preserved in storage');

  // 3. Create New Chat (Switching Conversations)
  const newId2 = 'test-id-2';
  loadedConversations[newId2] = { id: newId2, title: 'Second Chat', updatedAt: 200, messages: [] };
  loadedActiveId = newId2;
  await storage.set({ conversations: loadedConversations, activeId: loadedActiveId });

  assert(Object.keys(loadedConversations).length === 2, 'New chat added to storage');
  assert((await storage.get(['activeId'])).activeId === 'test-id-2', 'Active ID switches to new chat');

  // 4. Delete Chat
  delete loadedConversations['test-id-2'];
  loadedActiveId = 'test-id-1'; // fallback logic
  await storage.set({ conversations: loadedConversations, activeId: loadedActiveId });

  assert(Object.keys(loadedConversations).length === 1, 'Chat deleted from storage');
  assert((await storage.get(['activeId'])).activeId === 'test-id-1', 'Active ID falls back correctly after deletion');

  // 5. Test Title Generation API (Ollama)
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        messages: [
          { role: 'system', content: 'Summarize the user\'s prompt into a 3-5 word title. Only output the title string without quotes or punctuation.' },
          { role: 'user', content: 'What is the capital of France and how big is it?' }
        ],
        stream: false,
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const title = data.message?.content?.trim().replace(/^["']|["']$/g, '');
      assert(title && title.length > 0, `Title generation successful: "${title}"`);
    } else {
      assert(false, 'Title generation request failed');
    }
  } catch (e) {
    assert(false, `Title generation API error: ${e.message}`);
  }

  console.log(`\nTests Complete: ${passed} passed, ${failed} failed.`);
}

runPersistenceTests();
