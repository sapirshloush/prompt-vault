# PromptVault Chrome Extension

Save prompts directly from any AI chat to your PromptVault with one click!

## Features

- 🖱️ **Floating Button**: Select text and click "Save to PromptVault"
- 🔘 **Right-Click Menu**: Right-click selected text → "Save to PromptVault"
- 🎯 **Auto-Detection**: Automatically detects source (ChatGPT, Gemini, Claude, etc.)
- ⭐ **Full Dialog**: Add title, tags, category, and rating before saving

## Installation

### Step 1: Generate Icons

Before installing, you need to create the icon files. Go to:
👉 [cloudconvert.com/svg-to-png](https://cloudconvert.com/svg-to-png)

1. Upload `icons/icon.svg`
2. Download as PNG
3. Resize to create three versions:
   - `icon16.png` (16x16)
   - `icon48.png` (48x48)  
   - `icon128.png` (128x128)
4. Save them in the `icons/` folder

Or use any image editor to create 16x16, 48x48, and 128x128 PNG icons.

### Step 2: Load in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `browser-extension` folder
5. The extension is now installed! 🎉

## Usage

### Method 1: Floating Button
1. Go to ChatGPT, Gemini, Claude, or any website
2. Select/highlight the text you want to save
3. Click the purple **"Save to PromptVault"** button that appears
4. Fill in the details and click Save

### Method 2: Right-Click Menu
1. Select/highlight text
2. Right-click
3. Click **"💾 Save to PromptVault"**
4. Fill in the details and click Save

## Supported Sites

The extension works on any website, but auto-detects these sources:
- ChatGPT (chat.openai.com, chatgpt.com)
- Gemini (gemini.google.com)
- Claude (claude.ai)
- Nano Banana (nanobanana.com)
- Cursor (cursor.com)

## Troubleshooting

**Extension not working?**
- Make sure you're on a website (not a local file)
- Check that the extension is enabled in `chrome://extensions/`
- Try refreshing the page

**Save button not appearing?**
- Select at least 20 characters of text
- Make sure no other popups are blocking it

**Getting CORS errors?**
- This extension connects to your PromptVault deployment
- Make sure your Vercel deployment is running

