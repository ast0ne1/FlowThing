import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

console.log('🚀 Setting up FlowThing...');

try {
  // Check if node_modules exists
  if (!existsSync(join(__dirname, 'node_modules'))) {
    console.log('📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  } else {
    console.log('✅ Dependencies already installed');
  }

  // Check if DeskThing CLI is available
  try {
    execSync('npx @deskthing/cli --version', { stdio: 'pipe' });
    console.log('✅ DeskThing CLI is available');
  } catch (error) {
    console.log('📥 Installing DeskThing CLI...');
    execSync('npx @deskthing/cli@latest', { stdio: 'inherit' });
  }

  console.log('🎉 FlowThing setup complete!');
  console.log('');
  console.log('To start development:');
  console.log('  npm run dev');
  console.log('');
  console.log('To build the app:');
  console.log('  npm run build');
  console.log('');
  console.log('To install in DeskThing:');
  console.log('  1. Run: npm run build');
  console.log('  2. Copy the generated package to DeskThing apps folder');
  console.log('  3. Restart DeskThing');

} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
