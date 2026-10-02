import { loadConfig } from './config.mjs';
import { openDatabase, migrate } from './database.mjs';
import { createApp } from './app.mjs';

let db;
try {
  const config = loadConfig();
  db = openDatabase(config.databasePath);
  const applied = migrate(db);
  if (applied.length) console.log(`Migrações aplicadas: ${applied.join(', ')}`);
  const server = createApp({ db, secureCookies: config.secureCookies, allowedOrigins: config.allowedOrigins });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  });
  console.log(`SmartPet API disponível em http://${config.host}:${config.port}/api/health`);
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => server.closeAllConnections(), 5000);
    timeout.unref();
    server.close(error => {
      clearTimeout(timeout);
      db.close();
      process.removeListener('SIGINT', shutdown);
      process.removeListener('SIGTERM', shutdown);
      if (error) process.exitCode = 1;
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('Não foi possível iniciar o servidor:', error.message);
  db?.close();
  process.exitCode = 1;
}
