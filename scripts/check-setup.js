#!/usr/bin/env node

/**
 * Check if the development environment is set up correctly
 * Run with: node scripts/check-setup.js
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Checking SkiPay development setup...\n');

let hasErrors = false;

// Check Node version
console.log('📦 Node.js version:');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].slice(1));
if (majorVersion >= 20) {
  console.log(`   ✅ ${nodeVersion} (>= 20 required)`);
} else {
  console.log(`   ❌ ${nodeVersion} (>= 20 required)`);
  hasErrors = true;
}

// Check pnpm
console.log('\n📦 pnpm:');
try {
  const { execSync } = await import('child_process');
  const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
  console.log(`   ✅ ${pnpmVersion} installed`);
} catch (error) {
  console.log('   ❌ pnpm not found (install with: npm install -g pnpm)');
  hasErrors = true;
}

// Check if dependencies are installed
console.log('\n📦 Dependencies:');
if (existsSync(join(process.cwd(), 'node_modules'))) {
  console.log('   ✅ node_modules exists');
} else {
  console.log('   ❌ node_modules not found (run: pnpm install)');
  hasErrors = true;
}

// Check .env files
console.log('\n⚙️  Environment files:');

const serverEnv = join(process.cwd(), 'apps', 'server', '.env');
if (existsSync(serverEnv)) {
  console.log('   ✅ apps/server/.env exists');

  // Check if JWT keys are configured
  const envContent = readFileSync(serverEnv, 'utf8');
  if (envContent.includes('JWT_PRIVATE_KEY') && envContent.includes('JWT_PUBLIC_KEY')) {
    console.log('   ✅ JWT keys configured');
  } else {
    console.log('   ⚠️  JWT keys not configured (run: node scripts/generate-keys.js)');
  }

  if (envContent.includes('DATABASE_URL')) {
    console.log('   ✅ DATABASE_URL configured');
  } else {
    console.log('   ⚠️  DATABASE_URL not configured');
  }
} else {
  console.log('   ❌ apps/server/.env not found (copy from .env.example)');
  hasErrors = true;
}

const clientEnv = join(process.cwd(), 'apps', 'client', '.env');
if (existsSync(clientEnv)) {
  console.log('   ✅ apps/client/.env exists');
} else {
  console.log('   ⚠️  apps/client/.env not found (defaults will work for local dev)');
}

// Check Prisma
console.log('\n🗄️  Database:');
const prismaClient = join(process.cwd(), 'apps', 'server', 'node_modules', '.prisma', 'client');
if (existsSync(prismaClient)) {
  console.log('   ✅ Prisma client generated');
} else {
  console.log('   ⚠️  Prisma client not generated (run: pnpm db:migrate)');
}

// Check build
console.log('\n🔨 Build:');
const sharedBuild = join(process.cwd(), 'packages', 'shared', 'dist');
if (existsSync(sharedBuild)) {
  console.log('   ✅ @skipay/shared built');
} else {
  console.log('   ⚠️  @skipay/shared not built (run: pnpm build)');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Setup incomplete. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('✅ Setup looks good! You can run: pnpm dev');
}
console.log('='.repeat(50) + '\n');
