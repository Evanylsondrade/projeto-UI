import { loadConfig } from './config.mjs';
import { openDatabase, migrate } from './database.mjs';

let db;
try {
  db = openDatabase(loadConfig().databasePath);
  const applied = migrate(db);
  console.log(applied.length ? `Migrações aplicadas: ${applied.join(', ')}` : 'Banco atualizado: nenhuma migração pendente.');
} catch (error) {
  console.error('Falha ao preparar o banco:', error.message);
  process.exitCode = 1;
} finally {
  db?.close();
}
