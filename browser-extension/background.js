// PromptVault Browser Extension - Background Script

const API_URL = 'https://sap-prompt-vault.vercel.app';

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-promptvault',
    title: '💾 Save to PromptVault',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-promptvault' && info.selectionText) {
    const selectedText = info.selectionText.trim();
    
    // Detect source from URL
    const source = detectSource(tab.url);
    
    // Send to content script to show the save dialog
    chrome.tabs.sendMessage(tab.id, {
      action: 'showSaveDialog',
      text: selectedText,
      source: source
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'savePrompt') {
    savePrompt(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getCategories') {
    fetchCategories()
      .then(categories => sendResponse({ success: true, categories }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getTags') {
    fetchTags()
      .then(tags => sendResponse({ success: true, tags }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'analyzePrompt') {
    analyzePrompt(request.data)
      .then(analysis => sendResponse({ success: true, analysis }))
      .catch(error => {
        console.error('AI analysis error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

function detectSource(url) {
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('claude.ai') || url.includes('anthropic.com')) return 'claude';
  if (url.includes('nanobanana.com')) return 'nano_banana';
  if (url.includes('cursor.com') || url.includes('cursor.sh')) return 'cursor';
  return 'other';
}

async function savePrompt(data) {
  const response = await fetch(`${API_URL}/api/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save prompt');
  }
  
  return response.json();
}

async function fetchCategories() {
  const response = await fetch(`${API_URL}/api/categories`);
  if (!response.ok) throw new Error('Failed to fetch categories');
  const data = await response.json();
  return data.categories || [];
}

async function fetchTags() {
  const response = await fetch(`${API_URL}/api/tags`);
  if (!response.ok) throw new Error('Failed to fetch tags');
  const data = await response.json();
  return data.tags || [];
}

async function analyzePrompt(data) {
  const response = await fetch(`${API_URL}/api/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to analyze prompt');
  }
  
  return response.json();
}

