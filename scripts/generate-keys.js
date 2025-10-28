#!/usr/bin/env node

/**
 * Generate RSA key pair for JWT signing
 * Run with: node scripts/generate-keys.js
 */

import { generateKeyPairSync } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';

console.log('🔑 Generating RSA key pair for JWT...\n');

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Save to files
const keysDir = join(process.cwd(), 'apps', 'server');
writeFileSync(join(keysDir, 'private.pem'), privateKey);
writeFileSync(join(keysDir, 'public.pem'), publicKey);

console.log('✅ Keys generated and saved to apps/server/');
console.log('   - private.pem');
console.log('   - public.pem\n');

// Format for .env (with \n escapes)
const privateKeyEnv = privateKey.replace(/\n/g, '\\n');
const publicKeyEnv = publicKey.replace(/\n/g, '\\n');

console.log('📝 Add these to your apps/server/.env:\n');
console.log('JWT_PRIVATE_KEY="' + privateKeyEnv + '"');
console.log('\nJWT_PUBLIC_KEY="' + publicKeyEnv + '"\n');

console.log('⚠️  IMPORTANT: Never commit private.pem or share your private key!');
console.log('   Add private.pem and public.pem to .gitignore if not already there.\n');
