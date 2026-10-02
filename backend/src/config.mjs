import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { localOrigins } from './app.mjs';

export const backendDirectory = fileURLToPath(new URL('../', import.meta.url));

export function loadConfig() {
  const envFile = resolve(backendDirectory, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const portText = process.env.PORT ?? '3001';
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
    throw new Error('PORT deve ser um número entre 1 e 65535.');
  }
  const host = process.env.HOST?.trim() ?? '127.0.0.1';
  const databasePath = process.env.DATABASE_PATH?.trim() ?? './data/smartpet.sqlite';
  if (!host || !databasePath || databasePath === ':memory:') {
    throw new Error('HOST e DATABASE_PATH devem estar preenchidos; o servidor exige banco persistente.');
  }
  const production = process.env.NODE_ENV === 'production';
  const secureCookies = production || process.env.COOKIE_SECURE === 'true';
  const allowedOrigins = process.env.APP_ORIGINS ? process.env.APP_ORIGINS.split(',').map(value => value.trim()) : localOrigins;
  if (production && !process.env.APP_ORIGINS) throw new Error('Em produção, configure APP_ORIGINS com a origem HTTPS do site.');
  for (const origin of allowedOrigins) {
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) throw new Error('APP_ORIGINS deve conter origens válidas; HTTPS é obrigatório em produção.');
  }
  return { host, port: Number(portText), databasePath: resolve(backendDirectory, databasePath), secureCookies, allowedOrigins };
}
