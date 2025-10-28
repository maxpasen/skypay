#!/usr/bin/env node

/**
 * Reset the database (drop all tables and re-run migrations)
 * Run with: node scripts/reset-db.js
 *
 * WARNING: This will delete all data!
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

console.log('⚠️  WARNING: This will delete all data in your database!\n');

// Prompt for confirmation (simple version for Node.js)
const readline = await import('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() !== 'yes') {
    console.log('Aborted.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🗑️  Resetting database...\n');

  const serverDir = resolve(process.cwd(), 'apps', 'server');

  try {
    // Reset migrations
    console.log('1. Resetting migrations...');
    execSync('pnpm prisma migrate reset --force', {
      cwd: serverDir,
      stdio: 'inherit',
    });

    console.log('\n✅ Database reset complete!');
    console.log('   Run `pnpm db:seed` to add default data.\n');
  } catch (error) {
    console.error('\n❌ Error resetting database:', error.message);
    process.exit(1);
  }

  rl.close();
});
