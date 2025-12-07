// PromptVault Extension Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const loggedInEl = document.getElementById('logged-in');
  const loggedOutEl = document.getElementById('logged-out');
  const userEmailEl = document.getElementById('user-email');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const aiToggle = document.getElementById('ai-toggle');
  const aiUsageEl = document.getElementById('ai-usage');

  // Load AI setting
  chrome.storage.local.get(['ai_enabled'], (result) => {
    // Default to enabled if not set
    const aiEnabled = result.ai_enabled !== false;
    if (aiToggle) {
      aiToggle.checked = aiEnabled;
    }
  });

  // Handle AI toggle change
  aiToggle?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ ai_enabled: enabled }, () => {
      console.log('[PromptVault] AI Analysis:', enabled ? 'Enabled' : 'Disabled');
      
      // Update usage text
      if (aiUsageEl) {
        if (enabled) {
          aiUsageEl.innerHTML = '<strong>Unlimited</strong> AI analyses (Pro)';
        } else {
          aiUsageEl.innerHTML = 'AI analysis <strong>disabled</strong>';
        }
      }
    });
  });

  // Check auth status
  chrome.runtime.sendMessage({ action: 'checkAuth' }, (response) => {
    loadingEl.classList.add('hidden');
    
    if (response && response.authenticated) {
      loggedInEl.classList.remove('hidden');
      userEmailEl.textContent = response.user?.email || 'Logged in';
    } else {
      loggedOutEl.classList.remove('hidden');
    }
  });

  // Login button
  loginBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'login' });
    window.close();
  });

  // Logout button
  logoutBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'logout' }, () => {
      loggedInEl.classList.add('hidden');
      loggedOutEl.classList.remove('hidden');
    });
  });
});
