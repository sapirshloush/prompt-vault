// PromptVault Extension Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const loggedInEl = document.getElementById('logged-in');
  const loggedOutEl = document.getElementById('logged-out');
  const userEmailEl = document.getElementById('user-email');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');

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

