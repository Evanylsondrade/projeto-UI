import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;');
    if (db.prepare('PRAGMA foreign_keys').get().foreign_keys !== 1) {
      throw new Error('Não foi possível habilitar os relacionamentos do banco.');
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

// Uma transação cobre todo o lote: falhas não deixam migrações parcialmente aplicadas.
export function migrate(db, directory = migrationsDirectory) {
  const migrations = readdirSync(directory).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort()
    .map(name => {
      // O checkout do Git no Windows pode converter LF para CRLF sem mudar o SQL.
      const sql = readFileSync(join(directory, name), 'utf8').replace(/\r\n/g, '\n');
      return { name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
    });
  if (!migrations.length) throw new Error('Nenhuma migração encontrada.');
  const versions = migrations.map(migration => migration.name.slice(0, 3));
  if (new Set(versions).size !== versions.length) throw new Error('Versões de migração duplicadas.');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ) STRICT`);
    const applied = db.prepare('SELECT name, checksum FROM schema_migrations ORDER BY name').all();
    // O histórico deve ser um prefixo exato: não aceitar migrações removidas, alteradas ou inseridas no passado.
    for (const [index, previous] of applied.entries()) {
      const current = migrations[index];
      if (!current || current.name !== previous.name || current.checksum !== previous.checksum) {
        throw new Error(`Histórico de migrações divergente: ${previous.name}. Crie uma nova migração, sem alterar as aplicadas.`);
      }
    }
    const pending = migrations.slice(applied.length);
    const record = db.prepare('INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)');
    for (const migration of pending) {
      db.exec(migration.sql);
      record.run(migration.name, migration.checksum);
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Relacionamentos inválidos no banco.');
    db.exec('COMMIT');
    return pending.map(migration => migration.name);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
