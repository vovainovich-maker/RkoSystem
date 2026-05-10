import { copyFileSync, mkdirSync, readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
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
    console.log('📂 Merging server assets into client assets folder...');
    const files = readdirSync(serverAssets);
    for (const file of files) {
      copyFileSync(join(serverAssets, file), join(clientAssets, file));
    }
  }

  // 4. Copy server.js to client root as server.js
  // This is CRITICAL because assets in dist/client/assets look for ../server.js
  if (existsSync(join(distServer, 'server.js'))) {
    console.log('📝 Copying server.js to client root...');
    copyFileSync(join(distServer, 'server.js'), join(distClient, 'server.js'));
    
    // 5. Create a proxy _worker.js that Cloudflare will use
    console.log('🛠 Creating proxy _worker.js...');
    const proxyContent = "export * from './server.js';\nexport { default } from './server.js';";
    writeFileSync(join(distClient, '_worker.js'), proxyContent);
  } else {
    throw new Error('❌ Could not find server.js in dist/server!');
  }

  console.log('✨ Build and merge complete! Cloudflare is ready to deploy.');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
