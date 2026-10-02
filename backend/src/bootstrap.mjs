import { loadConfig } from './config.mjs';
import { openDatabase, migrate } from './database.mjs';
import { bootstrapManager } from './auth.mjs';

let db;
try {
  const config = loadConfig();
  db = openDatabase(config.databasePath);
  migrate(db);
  await bootstrapManager(db, { name: process.env.BOOTSTRAP_NAME, email: process.env.BOOTSTRAP_EMAIL, password: process.env.BOOTSTRAP_PASSWORD });
  console.log('Primeira conta gerencial criada. Remova BOOTSTRAP_PASSWORD do ambiente e do arquivo .env.');
} catch (error) {
  console.error('Não foi possível criar a primeira conta:', error.message);
  process.exitCode = 1;
} finally { db?.close(); }
