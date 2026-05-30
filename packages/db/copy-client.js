const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src', 'generated', 'client');
const dest = path.join(__dirname, 'dist', 'generated', 'client');

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(src)) {
  copyRecursive(src, dest);
  console.log('[copy-client] Prisma client declarations copied to dist successfully.');
} else {
  console.error('[copy-client] Source directory does not exist:', src);
}
