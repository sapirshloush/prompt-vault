// Simple icon generator for PromptVault Chrome Extension
// Run: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Simple 16x16 purple square PNG (minimal valid PNG)
// This is a base64 encoded 16x16 PNG with purple color
const icon16Base64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAP0lEQVQ4T2NkYGD4z0ABYBw1YNQAhqEQBv8pDIP/DAyM/xkYGP4zEuUCBgYGBkYGRob/DAwMDIxEuYCBgQEAK6YHDX7RwfkAAAAASUVORK5CYII=';

// 48x48 purple square
const icon48Base64 = 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAV0lEQVRoQ+3OMQEAIAzAsKH/zkMCDrgSseXMbP4cN3D5ghrQJdAl0CXQJdAl0CXQJdAl0CXQJdAl0CXQJdAl0CXQJdAl0CXQJdAl0CXQJdAl0CXQJXABG/4CMGJmJQMAAAAASUVORK5CYII=';

// 128x128 purple square  
const icon128Base64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAdklEQVR4Ae3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC3AcUIAAFkqh/DAAAAAElFTkSuQmCC';

const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Write icons
fs.writeFileSync(path.join(iconsDir, 'icon16.png'), Buffer.from(icon16Base64, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), Buffer.from(icon48Base64, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), Buffer.from(icon128Base64, 'base64'));

console.log('✅ Icons generated successfully!');
console.log('   - icons/icon16.png');
console.log('   - icons/icon48.png');
console.log('   - icons/icon128.png');

