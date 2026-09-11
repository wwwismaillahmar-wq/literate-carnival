const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const nextDir = path.join(rootDir, '.next');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy static app files if present
const appServerDir = path.join(nextDir, 'server', 'app');
if (fs.existsSync(appServerDir)) {
  const indexPath = path.join(appServerDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, path.join(distDir, 'index.html'));
  }
  const notFoundPath = path.join(appServerDir, '_not-found.html');
  if (fs.existsSync(notFoundPath)) {
    fs.copyFileSync(notFoundPath, path.join(distDir, '404.html'));
  }
}

// Copy _next/static to dist/_next/static
const staticDir = path.join(nextDir, 'static');
const distNextStatic = path.join(distDir, '_next', 'static');
if (fs.existsSync(staticDir)) {
  fs.mkdirSync(path.dirname(distNextStatic), { recursive: true });
  fs.cpSync(staticDir, distNextStatic, { recursive: true });
}

// Copy public assets if public directory exists
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
}

console.log('Dist directory prepared successfully with Next.js build output.');
