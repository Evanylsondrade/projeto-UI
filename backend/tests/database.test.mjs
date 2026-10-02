import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate, migrationsDirectory } from '../src/database.mjs';

function database(t) {
  const db = openDatabase(':memory:');
  t.after(() => db.close());
  migrate(db);
  return db;
}

function temporaryDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), 'smartpet-backend-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function fixtures(db) {
  // Marcador exclusivo de teste, não é uma senha nem uma conta de implantação.
  db.exec(`
    INSERT INTO employees (id, name, email, password_hash, role) VALUES ('e1', 'Gerente Teste', 'teste@example.test', 'hash-fixture-only', 'gerente');
    INSERT INTO tutors (id, name, phone) VALUES ('t1', 'Tutor Um', '85999999999'), ('t2', 'Tutor Dois', '85888888888');
    INSERT INTO pets (id, tutor_id, name, species) VALUES ('p1', 't1', 'Rex', 'Cachorro');
    INSERT INTO services (id, name, price_cents, duration_minutes) VALUES ('s1', 'Banho', 5000, 60);
  `);
}

function appointment(db, { id = 'a1', pet = 'p1', service = 's1', tutor = 't1', employee = 'e1', date = '2030-10-01', time = '09:00', status = 'agendado' } = {}) {
  return db.prepare(`INSERT INTO appointments
    (id, pet_id, service_id, tutor_id, created_by_employee_id, date, time, status, price_cents, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 5000, 60)`).run(id, pet, service, tutor, employee, date, time, status);
}

test('migração cria cinco tabelas de negócio vazias e pode ser repetida', t => {
  const db = database(t);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(row => row.name);
  assert.deepEqual(tables, ['appointments', 'employees', 'pets', 'schema_migrations', 'services', 'sessions', 'tutors']);
  for (const table of tables.filter(name => name !== 'schema_migrations')) {
    assert.equal(db.prepare(`SELECT count(*) AS total FROM ${table}`).get().total, 0);
  }
  assert.deepEqual(migrate(db), []);
  assert.equal(db.prepare('SELECT count(*) AS total FROM schema_migrations').get().total, 2);
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
});

test('dados permanecem após fechar e reabrir a conexão', t => {
  const filename = join(temporaryDirectory(t), 'persistent.sqlite');
  const first = openDatabase(filename);
  try { migrate(first); fixtures(first); } finally { first.close(); }
  const second = openDatabase(filename);
  try {
    assert.deepEqual(migrate(second), []);
    assert.equal(second.prepare('SELECT name FROM pets WHERE id = ?').get('p1').name, 'Rex');
  } finally { second.close(); }
});

test('migração de sessões atualiza banco BACK-01 sem perder cadastros existentes', t => {
  const directory = temporaryDirectory(t);
  copyFileSync(join(migrationsDirectory, '001_initial.sql'), join(directory, '001_initial.sql'));
  const db = openDatabase(':memory:'); t.after(() => db.close());
  migrate(db, directory); fixtures(db); appointment(db);
  assert.deepEqual(migrate(db), ['002_sessions.sql']);
  assert.equal(db.prepare('SELECT count(*) AS n FROM tutors').get().n, 2);
  assert.equal(db.prepare("SELECT tutor_id FROM appointments WHERE id = 'a1'").get().tutor_id, 't1');
});

test('pet exige tutor existente e não permite excluir tutor vinculado', t => {
  const db = database(t);
  fixtures(db);
  assert.throws(() => db.exec("INSERT INTO pets (id, tutor_id, name, species) VALUES ('p2', 'missing', 'Pet', 'Gato')"), /FOREIGN KEY/);
  assert.throws(() => db.exec("DELETE FROM tutors WHERE id = 't1'"), /FOREIGN KEY/);
  db.exec("UPDATE tutors SET active = 0 WHERE id = 't1'");
  assert.equal(db.prepare("SELECT tutor_id FROM pets WHERE id = 'p1'").get().tutor_id, 't1');
});

test('agendamento exige os quatro vínculos e protege o histórico contra exclusão', t => {
  const db = database(t);
  fixtures(db);
  for (const key of ['pet', 'service', 'tutor', 'employee']) {
    assert.throws(() => appointment(db, { [key]: 'missing' }), /FOREIGN KEY/);
  }
  appointment(db);
  for (const [table, id] of [['pets', 'p1'], ['services', 's1'], ['employees', 'e1']]) {
    assert.throws(() => db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id), /FOREIGN KEY/);
  }
  db.exec("UPDATE pets SET tutor_id = 't2' WHERE id = 'p1'; UPDATE services SET price_cents = 7000 WHERE id = 's1'");
  const row = db.prepare("SELECT tutor_id, price_cents FROM appointments WHERE id = 'a1'").get();
  assert.equal(row.tutor_id, 't1');
  assert.equal(row.price_cents, 5000);
  assert.throws(() => db.exec("DELETE FROM tutors WHERE id = 't1'"), /FOREIGN KEY/);
});

test('restringe perfis, espécies, estados, valores e campos obrigatórios', t => {
  const db = database(t);
  fixtures(db);
  for (const sql of [
    "UPDATE employees SET role = 'tutor'", "UPDATE employees SET password_hash = ''",
    "UPDATE employees SET active = 2", "UPDATE tutors SET phone = 'abc1234567'",
    "UPDATE tutors SET name = ' '", "UPDATE pets SET species = 'Peixe'",
    "UPDATE services SET price_cents = -1", "UPDATE services SET duration_minutes = 0",
  ]) assert.throws(() => db.exec(sql), /CHECK/);
  assert.throws(() => appointment(db, { status: 'invalido' }), /CHECK/);
  assert.throws(() => db.exec("UPDATE services SET price_cents = 10.5"), /cannot store REAL/);
});

test('emails únicos sem diferenciar letras maiúsculas; tutores sem email são permitidos', t => {
  const db = database(t);
  fixtures(db);
  assert.throws(() => db.exec("INSERT INTO employees (id, name, email, password_hash, role) VALUES ('e2', 'Outro Teste', 'TESTE@example.test', 'fixture', 'atendente')"), /UNIQUE/);
  db.exec("UPDATE tutors SET email = 'tutor@example.test' WHERE id = 't1'");
  assert.throws(() => db.exec("UPDATE tutors SET email = 'TUTOR@example.test' WHERE id = 't2'"), /UNIQUE/);
});

test('rejeita datas e horários inválidos, incluindo dia inexistente', t => {
  const db = database(t);
  fixtures(db);
  for (const date of ['2030-02-30', '2030-13-01', '2030-00-01', '01/10/2030', 'invalid']) {
    assert.throws(() => appointment(db, { date }), /CHECK/);
  }
  for (const time of ['24:00', '09:60', '9:00', 'abcde']) {
    assert.throws(() => appointment(db, { time }), /CHECK/);
  }
  appointment(db, { date: '2032-02-29' });
});

test('impede reserva ativa duplicada para o pet e libera o horário após cancelamento', t => {
  const db = database(t);
  fixtures(db);
  appointment(db);
  assert.throws(() => appointment(db, { id: 'a2', status: 'confirmado' }), /UNIQUE/);
  db.exec("UPDATE appointments SET status = 'cancelado' WHERE id = 'a1'");
  appointment(db, { id: 'a2' });
});

test('data de atualização é preenchida automaticamente em todas as entidades', t => {
  const db = database(t);
  fixtures(db);
  appointment(db);
  for (const table of ['employees', 'tutors', 'pets', 'services', 'appointments']) {
    db.exec(`UPDATE ${table} SET updated_at = '2000-01-01T00:00:00.000Z'`);
    db.exec(`UPDATE ${table} SET id = id`);
    assert.notEqual(db.prepare(`SELECT updated_at FROM ${table}`).get().updated_at, '2000-01-01T00:00:00.000Z');
  }
});

test('falha em uma migração desfaz todo o lote pendente', t => {
  const directory = temporaryDirectory(t);
  writeFileSync(join(directory, '001_test.sql'), 'CREATE TABLE example (id TEXT);');
  writeFileSync(join(directory, '002_invalid.sql'), 'SQL INVALIDO;');
  const db = openDatabase(':memory:');
  t.after(() => db.close());
  assert.throws(() => migrate(db, directory), /syntax error/);
  assert.equal(db.prepare("SELECT count(*) AS total FROM sqlite_master WHERE type = 'table'").get().total, 0);
});

test('recusa modificar ou remover migração já aplicada e permite nova versão', t => {
  const db = database(t);
  const directory = temporaryDirectory(t);
  const original = join(migrationsDirectory, '001_initial.sql');
  copyFileSync(original, join(directory, '001_initial.sql'));
  copyFileSync(join(migrationsDirectory, '002_sessions.sql'), join(directory, '002_sessions.sql'));
  writeFileSync(join(directory, '001_initial.sql'), readFileSync(original, 'utf8').replace(/\r?\n/g, '\r\n'));
  assert.deepEqual(migrate(db, directory), []);
  writeFileSync(join(directory, '003_next.sql'), 'CREATE TABLE next_example (id TEXT);');
  assert.deepEqual(migrate(db, directory), ['003_next.sql']);
  writeFileSync(join(directory, '001_initial.sql'), 'SELECT 1;');
  assert.throws(() => migrate(db, directory), /Histórico de migrações divergente/);
  copyFileSync(original, join(directory, '001_initial.sql'));
  rmSync(join(directory, '003_next.sql'));
  assert.throws(() => migrate(db, directory), /Histórico de migrações divergente/);
});
