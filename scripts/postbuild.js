/*
 Post-build script:
 1) Copy assets folder into dist/assets
 2) Create builds/YYYY-MM-DD trolley-problem.zip with contents of dist at zip root
*/

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = process.cwd();
const distDir = path.join(root, 'dist');
const srcAssetsDirCandidates = [
  path.join(root, 'src', 'assets'),
  path.join(root, 'assets'),
];
const distAssetsDir = path.join(distDir, 'assets');
const buildsDir = path.join(root, 'builds');

function log(msg) { console.log(`[postbuild] ${msg}`); }

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

(async function main() {
  try {
    if (!fs.existsSync(distDir)) {
      console.error('[postbuild] dist folder not found. Did the build succeed?');
      process.exit(1);
    }

    // 1) Copy assets (prefer src/assets, fall back to /assets)
    const srcAssetsDir = srcAssetsDirCandidates.find(p => fs.existsSync(p));
    if (srcAssetsDir) {
      log(`Copying assets from ${path.relative(root, srcAssetsDir)} to ${path.relative(root, distAssetsDir)}`);
      copyDirSync(srcAssetsDir, distAssetsDir);
    } else {
      log('No assets folder found (src/assets or assets); skipping assets copy.');
    }

    // 2) Create builds dir and zip
    if (!fs.existsSync(buildsDir)) {
      fs.mkdirSync(buildsDir, { recursive: true });
    }

    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const zipName = `${yyyy}-${mm}-${dd} trolley-problem.zip`;
    const zipPath = path.join(buildsDir, zipName);

    log(`Creating zip ${path.relative(root, zipPath)} from dist contents`);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        log(`Zip created (${archive.pointer()} bytes)`);
        resolve();
      });
      output.on('error', reject);
      archive.on('error', reject);

      archive.pipe(output);
      // Add dist contents so that index.html sits at root of zip
      archive.directory(distDir + path.sep, false);
      archive.finalize();
    });

    log('Post-build completed successfully.');
  } catch (err) {
    console.error('[postbuild] Error:', err);
    process.exit(1);
  }
})();
