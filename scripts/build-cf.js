import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

console.log('🚀 Starting custom Cloudflare build script...');

try {
  // 1. Run the build
  console.log('📦 Running npm run build...');
  execSync('npm run build', { 
    stdio: 'inherit',
    env: { ...process.env, VINXI_SERVER_PRESET: 'cloudflare-pages' } 
  });

  const distClient = join(process.cwd(), 'dist', 'client');
  const distServer = join(process.cwd(), 'dist', 'server');
  const clientAssets = join(distClient, 'assets');
  const serverAssets = join(distServer, 'assets');

  // 2. Ensure client assets dir exists
  if (!existsSync(clientAssets)) {
    mkdirSync(clientAssets, { recursive: true });
  }

  // 3. Copy ALL server assets to client assets
  if (existsSync(serverAssets)) {
    console.log('📂 Merging server assets into client...');
    const files = readdirSync(serverAssets);
    for (const file of files) {
      copyFileSync(join(serverAssets, file), join(clientAssets, file));
    }
  }

  // 4. Find the worker entry point
  let workerEntryPath = null;
  
  // Look for worker-entry-*.js first (usually in assets)
  if (existsSync(clientAssets)) {
    const files = readdirSync(clientAssets);
    const entry = files.find(f => f.startsWith('worker-entry-') && f.endsWith('.js'));
    if (entry) workerEntryPath = join(clientAssets, entry);
  }

  // Fallback to server.js in dist/server
  if (!workerEntryPath && existsSync(join(distServer, 'server.js'))) {
    workerEntryPath = join(distServer, 'server.js');
  }

  if (workerEntryPath) {
    console.log(`✅ Found entry point: ${basename(workerEntryPath)}`);
    console.log('📝 Copying to _worker.js...');
    copyFileSync(workerEntryPath, join(distClient, '_worker.js'));
  } else {
    throw new Error('❌ Could not find server entry point (worker-entry or server.js)!');
  }

  console.log('✨ Build and merge complete! Cloudflare is ready to deploy.');

} catch (error) {
  console.error(error.message);
  process.exit(1);
}
