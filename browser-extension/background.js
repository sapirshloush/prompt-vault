// PromptVault Browser Extension - Background Script

const API_URL = 'https://prompt-vault-ebon-psi.vercel.app';

// ============================================
// AUTH MANAGEMENT
// ============================================

// Get stored auth data
async function getAuthData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['promptvault_auth'], (result) => {
      resolve(result.promptvault_auth || null);
    });
  });
}

// Save auth data
async function saveAuthData(authData) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ promptvault_auth: authData }, resolve);
  });
}

// Clear auth data (logout)
async function clearAuthData() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['promptvault_auth'], resolve);
  });
}

// Check if user is authenticated
async function isAuthenticated() {
  const authData = await getAuthData();
  if (!authData || !authData.token) return false;
  
  // Check if token is expired
  if (authData.expiresAt && Date.now() / 1000 > authData.expiresAt) {
    await clearAuthData();
    return false;
  }
  
  return true;
}

// ============================================
// CONTEXT MENU
// ============================================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-to-promptvault',
    title: '💾 Save to PromptVault',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-promptvault' && info.selectionText) {
    const selectedText = info.selectionText.trim();
    const source = detectSource(tab.url);
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'showSaveDialog',
      text: selectedText,
      source: source
    });
  }
});

// ============================================
// MESSAGE HANDLERS
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // Check auth status
  if (request.action === 'checkAuth') {
    (async () => {
      const authenticated = await isAuthenticated();
      const authData = await getAuthData();
      sendResponse({ 
        authenticated, 
        user: authenticated ? { email: authData?.email } : null 
      });
    })();
    return true;
  }
  
  // Handle login
  if (request.action === 'login') {
    chrome.tabs.create({ url: `${API_URL}/auth/extension` });
    sendResponse({ success: true });
    return true;
  }
  
  // Handle logout
  if (request.action === 'logout') {
    clearAuthData().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Save auth data from extension auth page
  if (request.action === 'saveAuthData') {
    saveAuthData(request.data).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Save prompt
  if (request.action === 'savePrompt') {
    savePrompt(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Get categories
  if (request.action === 'getCategories') {
    fetchCategories()
      .then(categories => sendResponse({ success: true, categories }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Get tags
  if (request.action === 'getTags') {
    fetchTags()
      .then(tags => sendResponse({ success: true, tags }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // Analyze prompt
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

// ============================================
// API FUNCTIONS
// ============================================

function detectSource(url) {
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('claude.ai') || url.includes('anthropic.com')) return 'claude';
  if (url.includes('nanobanana.com')) return 'nano_banana';
  if (url.includes('cursor.com') || url.includes('cursor.sh')) return 'cursor';
  return 'other';
}

async function savePrompt(data) {
  const authData = await getAuthData();
  
  if (!authData || !authData.token) {
    throw new Error('Please log in to save prompts');
  }
  
  const response = await fetch(`${API_URL}/api/extension/auth-save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.token}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) {
      // Token expired - clear auth
      await clearAuthData();
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(error.error || 'Failed to save prompt');
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
