// PromptVault Browser Extension - Content Script

let saveDialog = null;
let floatingButton = null;
let lastSelectedText = '';

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showSaveDialog') {
    showSaveDialog(request.text, request.source);
  }
});

// Create floating save button on text selection
document.addEventListener('mouseup', (e) => {
  // Small delay to ensure selection is complete
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 20) { // Only show for meaningful selections
      lastSelectedText = selectedText; // Store the text
      showFloatingButton(e.clientX, e.clientY, selectedText);
    } else if (!floatingButton?.contains(e.target)) {
      hideFloatingButton();
    }
  }, 10);
});

// Hide button when clicking elsewhere (but not on the button itself)
document.addEventListener('mousedown', (e) => {
  // Don't hide if clicking on the floating button or save dialog
  if (floatingButton && floatingButton.contains(e.target)) {
    return;
  }
  if (saveDialog && saveDialog.contains(e.target)) {
    return;
  }
  
  // Small delay to allow button click to register
  setTimeout(() => {
    if (!saveDialog) {
      hideFloatingButton();
    }
  }, 100);
});

function showFloatingButton(x, y, text) {
  hideFloatingButton();
  
  floatingButton = document.createElement('div');
  floatingButton.id = 'promptvault-floating-btn';
  floatingButton.innerHTML = `
    <button id="pv-save-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
      </svg>
      Save to PromptVault
    </button>
  `;
  
  // Position near selection
  floatingButton.style.position = 'fixed';
  floatingButton.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
  floatingButton.style.top = `${Math.min(y + 10, window.innerHeight - 50)}px`;
  floatingButton.style.zIndex = '2147483647';
  
  document.body.appendChild(floatingButton);
  
  // Store text in a data attribute as backup
  floatingButton.dataset.text = text;
  
  // Add click handler
  const saveBtn = floatingButton.querySelector('#pv-save-btn');
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use stored text (more reliable than re-reading selection)
    const textToSave = lastSelectedText || floatingButton.dataset.text || text;
    const source = detectSourceFromUrl(window.location.href);
    
    console.log('[PromptVault] Saving text:', textToSave.substring(0, 50) + '...');
    
    showSaveDialog(textToSave, source);
    hideFloatingButton();
  });
  
  // Also handle mousedown to prevent selection loss
  saveBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.remove();
    floatingButton = null;
  }
}

function showLoadingDialog() {
  saveDialog = document.createElement('div');
  saveDialog.id = 'promptvault-dialog';
  saveDialog.innerHTML = `
    <div class="pv-dialog-overlay">
      <div class="pv-dialog pv-loading-dialog">
        <div class="pv-loading-content">
          <div class="pv-loading-spinner"></div>
          <div class="pv-loading-text">
            <span class="pv-loading-title">🤖 AI is analyzing your prompt...</span>
            <span class="pv-loading-subtitle">Generating title, tags, and suggestions</span>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(saveDialog);
}

function detectSourceFromUrl(url) {
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('gemini.google.com')) return 'gemini';
  if (url.includes('claude.ai') || url.includes('anthropic.com')) return 'claude';
  if (url.includes('nanobanana.com')) return 'nano_banana';
  return 'other';
}

async function showSaveDialog(text, source) {
  // Remove existing dialog
  if (saveDialog) {
    saveDialog.remove();
  }
  
  // Show loading dialog first
  showLoadingDialog();
  
  // Fetch categories, tags, and AI analysis in parallel
  let categories = [];
  let tags = [];
  let aiAnalysis = null;
  
  try {
    const [catResponse, tagResponse, aiResponse] = await Promise.all([
      new Promise(resolve => 
        chrome.runtime.sendMessage({ action: 'getCategories' }, resolve)
      ),
      new Promise(resolve => 
        chrome.runtime.sendMessage({ action: 'getTags' }, resolve)
      ),
      new Promise(resolve => 
        chrome.runtime.sendMessage({ action: 'analyzePrompt', data: { content: text, source } }, resolve)
      )
    ]);
    
    if (catResponse?.success) categories = catResponse.categories;
    if (tagResponse?.success) tags = tagResponse.tags;
    if (aiResponse?.success) aiAnalysis = aiResponse.analysis;
    
    console.log('[PromptVault] AI Analysis:', aiAnalysis);
  } catch (e) {
    console.error('Failed to fetch data:', e);
  }
  
  // Remove loading dialog
  if (saveDialog) {
    saveDialog.remove();
  }
  
  // Use AI suggestions or fallback to basic
  const suggestedTitle = aiAnalysis?.title || generateBasicTitle(text);
  const suggestedTags = aiAnalysis?.tags || [];
  const suggestedCategory = aiAnalysis?.category_id || '';
  const suggestedScore = aiAnalysis?.effectiveness_score || 0;
  const effectivenessReason = aiAnalysis?.effectiveness_reason || '';
  const isAiPowered = aiAnalysis?.ai_powered || false;
  
  function generateBasicTitle(content) {
    const firstLine = content.split('\n')[0];
    return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
  }
  
  // Source labels
  const sourceLabels = {
    chatgpt: '🤖 ChatGPT',
    gemini: '✨ Gemini', 
    claude: '🧠 Claude',
    nano_banana: '🍌 Nano Banana',
    cursor: '💻 Cursor',
    other: '📝 Other'
  };
  
  saveDialog = document.createElement('div');
  saveDialog.id = 'promptvault-dialog';
  saveDialog.innerHTML = `
    <div class="pv-dialog-overlay">
      <div class="pv-dialog">
        <div class="pv-header">
          <div class="pv-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <span>Save to PromptVault</span>
            ${isAiPowered ? '<span class="pv-ai-badge">🤖 AI</span>' : ''}
          </div>
          <button class="pv-close" id="pv-close-btn">&times;</button>
        </div>
        
        ${isAiPowered && effectivenessReason ? `
        <div class="pv-ai-insight">
          <span class="pv-ai-icon">✨</span>
          <span>${effectivenessReason}</span>
        </div>
        ` : ''}
        
        <div class="pv-body">
          <div class="pv-field">
            <label>Title ${isAiPowered ? '<span class="pv-auto-tag">AI Generated</span>' : ''}</label>
            <input type="text" id="pv-title" value="${suggestedTitle.replace(/"/g, '&quot;')}" placeholder="Give your prompt a name...">
          </div>
          
          <div class="pv-field">
            <label>Prompt Content</label>
            <textarea id="pv-content" rows="6">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          </div>
          
          <div class="pv-row">
            <div class="pv-field pv-half">
              <label>Source</label>
              <select id="pv-source">
                ${Object.entries(sourceLabels).map(([key, label]) => 
                  `<option value="${key}" ${key === source ? 'selected' : ''}>${label}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="pv-field pv-half">
              <label>Category ${isAiPowered && suggestedCategory ? '<span class="pv-auto-tag">AI</span>' : ''}</label>
              <select id="pv-category">
                <option value="">No category</option>
                ${categories.map(cat => 
                  `<option value="${cat.id}" ${cat.id === suggestedCategory ? 'selected' : ''}>${cat.icon || ''} ${cat.name}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          
          <div class="pv-field">
            <label>Tags ${isAiPowered && suggestedTags.length > 0 ? '<span class="pv-auto-tag">AI Suggested</span>' : ''}</label>
            <input type="text" id="pv-tags" value="${suggestedTags.join(', ')}" placeholder="hooks, copywriting, automation...">
            ${tags.length > 0 ? `
              <div class="pv-tag-suggestions">
                ${tags.slice(0, 8).map(tag => 
                  `<span class="pv-tag-chip ${suggestedTags.includes(tag.name) ? 'selected' : ''}" data-tag="${tag.name}">#${tag.name}</span>`
                ).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="pv-field">
            <label>Effectiveness (1-10) ${isAiPowered && suggestedScore ? '<span class="pv-auto-tag">AI: ' + suggestedScore + '/10</span>' : ''}</label>
            <div class="pv-stars" id="pv-stars">
              ${[1,2,3,4,5,6,7,8,9,10].map(n => 
                `<span class="pv-star ${n <= suggestedScore ? 'active' : ''}" data-score="${n}">★</span>`
              ).join('')}
            </div>
            <input type="hidden" id="pv-score" value="${suggestedScore || 0}">
          </div>
        </div>
        
        <div class="pv-footer">
          <button class="pv-btn pv-btn-secondary" id="pv-cancel-btn">Cancel</button>
          <button class="pv-btn pv-btn-primary" id="pv-save-btn">
            <span class="pv-btn-text">Save Prompt</span>
            <span class="pv-btn-loading" style="display:none;">Saving...</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(saveDialog);
  
  // Focus title input
  setTimeout(() => {
    document.getElementById('pv-title').focus();
    document.getElementById('pv-title').select();
  }, 100);
  
  // Event listeners
  document.getElementById('pv-close-btn').addEventListener('click', closeSaveDialog);
  document.getElementById('pv-cancel-btn').addEventListener('click', closeSaveDialog);
  document.getElementById('pv-save-btn').addEventListener('click', handleSave);
  
  // Star rating
  const stars = document.querySelectorAll('.pv-star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const score = parseInt(star.dataset.score);
      document.getElementById('pv-score').value = score;
      stars.forEach((s, i) => {
        s.classList.toggle('active', i < score);
      });
    });
    star.addEventListener('mouseenter', () => {
      const score = parseInt(star.dataset.score);
      stars.forEach((s, i) => {
        s.classList.toggle('hover', i < score);
      });
    });
    star.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.remove('hover'));
    });
  });
  
  // Tag chip clicks
  document.querySelectorAll('.pv-tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tagInput = document.getElementById('pv-tags');
      const currentTags = tagInput.value.split(',').map(t => t.trim()).filter(Boolean);
      const tagName = chip.dataset.tag;
      if (!currentTags.includes(tagName)) {
        currentTags.push(tagName);
        tagInput.value = currentTags.join(', ');
      }
      chip.classList.add('selected');
    });
  });
  
  // Close on escape
  document.addEventListener('keydown', handleEscapeKey);
}

function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    closeSaveDialog();
  }
}

function closeSaveDialog() {
  if (saveDialog) {
    saveDialog.remove();
    saveDialog = null;
  }
  document.removeEventListener('keydown', handleEscapeKey);
}

async function handleSave() {
  const title = document.getElementById('pv-title').value.trim();
  const content = document.getElementById('pv-content').value.trim();
  const source = document.getElementById('pv-source').value;
  const categoryId = document.getElementById('pv-category').value;
  const tagsInput = document.getElementById('pv-tags').value;
  const score = parseInt(document.getElementById('pv-score').value);
  
  if (!title || !content) {
    alert('Please enter a title and content');
    return;
  }
  
  const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  
  const saveBtn = document.getElementById('pv-save-btn');
  const btnText = saveBtn.querySelector('.pv-btn-text');
  const btnLoading = saveBtn.querySelector('.pv-btn-loading');
  
  // Show loading state
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  saveBtn.disabled = true;
  
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'savePrompt',
        data: {
          title,
          content,
          source,
          category_id: categoryId || undefined,
          effectiveness_score: score || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }
      }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
    
    // Show success message
    showNotification('✅ Prompt saved to PromptVault!');
    closeSaveDialog();
    
  } catch (error) {
    console.error('Error saving prompt:', error);
    alert('Failed to save prompt. Please try again.');
    
    // Reset button
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    saveBtn.disabled = false;
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.id = 'promptvault-notification';
  notification.innerHTML = `
    <div class="pv-notification">
      ${message}
    </div>
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('pv-fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

