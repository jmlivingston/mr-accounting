import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  dataDir: process.env.DATA_DIR ?? path.join(apiRoot, 'data'),
  tlsKeyPath: process.env.TLS_KEY_PATH,
  tlsCertPath: process.env.TLS_CERT_PATH,
  jwtSecret: new TextEncoder().encode(process.env.JWT_SECRET ?? randomBytes(32).toString('hex')),
  isProduction,
};

export const files = {
  transactions: 'transactions.json',
  auth: 'auth.json',
};

export const session = {
  cookieName: 'accessToken',
  lifetimeSeconds: 60 * 60,
  issuer: 'mr-accounting-api',
  csrfHeader: 'x-csrf-token',
};

export const scopes = {
  transactionsRead: 'transactions:read',
  transactionsWrite: 'transactions:write',
};

export const limits = {
  bodySize: '10kb',
  requestsPerMinute: 100,
  loginAttemptsPerWindow: 10,
  loginWindowMs: 15 * 60 * 1000,
  recentTransactions: 5,
};

export const allowedMethods = ['GET', 'POST', 'OPTIONS'];
