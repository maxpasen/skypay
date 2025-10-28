import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load .env file
loadEnv({ path: resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:5173',

  jwt: {
    // Decode base64-encoded keys for safer transmission via environment variables
    privateKey: process.env.JWT_PRIVATE_KEY
      ? (process.env.JWT_PRIVATE_KEY.includes('BEGIN')
        ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
        : Buffer.from(process.env.JWT_PRIVATE_KEY, 'base64').toString('utf-8'))
      : '',
    publicKey: process.env.JWT_PUBLIC_KEY
      ? (process.env.JWT_PUBLIC_KEY.includes('BEGIN')
        ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
        : Buffer.from(process.env.JWT_PUBLIC_KEY, 'base64').toString('utf-8'))
      : '',
    expiration: process.env.JWT_EXPIRATION || '7d',
  },

  database: {
    url: process.env.DATABASE_URL || '',
  },

  smtp: {
    dsn: process.env.SMTP_DSN || '', // Empty means dev mode (console log)
  },

  match: {
    tickRate: parseInt(process.env.MATCH_TICK_RATE || '20', 10),
    maxPlayers: parseInt(process.env.MATCH_MAX_PLAYERS || '8', 10),
  },

  commitSha: process.env.COMMIT_SHA || 'dev',
} as const;

export const isDev = config.nodeEnv === 'development';
export const isProd = config.nodeEnv === 'production';
