import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createApp } from '../src/app.mjs';
import { hashPassword, verifyPassword, bootstrapManager, createAuth, SESSION_MS } from '../src/auth.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, migrate } from '../src/database.mjs';

const password = 'Somente teste! 123456';
const passwordHash = await hashPassword(password);
const input = { name: 'Ana Souza', phone: '(85) 99999-0000', email: 'ANA@example.test', address: 'Rua Um', notes: 'Contato à tarde' };

async function setup(t, options = {}) {
  const db = openDatabase(':memory:'); migrate(db);
  for (const role of ['gerente', 'atendente']) {
    db.prepare('INSERT INTO employees (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(role, role, `${role}@example.test`, passwordHash, role);
  }
  let time = Date.now();
  const server = createApp({ db, now: () => time, ...options });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', cookie = '', body, headers = {} } = {}) {
    const response = await fetch(url + path, { method, headers: {
      'Content-Type': 'application/json', 'X-SmartPet-Request': '1', Cookie: cookie, ...headers,
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { response, status: response.status, json: await response.json() };
  }
  async function login(role = 'gerente', cookie = '') {
    const result = await request('/api/auth/login', { method: 'POST', cookie, body: { email: `${role}@example.test`, password } });
    assert.equal(result.status, 200);
    return { ...result, cookie: result.response.headers.get('set-cookie').split(';')[0] };
  }
  return { db, request, login, url, advance: milliseconds => { time += milliseconds; } };
}

test('hash com salt aleatório verifica senha sem armazená-la', async () => {
  const other = await hashPassword(password);
  assert.notEqual(other, passwordHash);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword('senha errada', passwordHash), false);
  assert.equal(await verifyPassword(password, 'hash inválido'), false);
  assert.equal(passwordHash.includes(password), false);
  await assert.rejects(hashPassword('curta'), /15 e 128/);
});

test('primeiro gerente é criado sem senha padrão e segunda implantação não sobrescreve', async t => {
  const db = openDatabase(':memory:'); migrate(db); t.after(() => db.close());
  await assert.rejects(bootstrapManager(db, { name: 'Gerente', email: 'bad', password }), /email/);
  const user = await bootstrapManager(db, { name: 'Primeiro Gerente', email: ' GERENTE@example.test ', password });
  assert.equal(user.role, 'gerente');
  assert.equal(user.email, 'gerente@example.test');
  assert.equal('password_hash' in user, false);
  assert.equal(await verifyPassword(password, db.prepare('SELECT password_hash FROM employees').get().password_hash), true);
  await assert.rejects(bootstrapManager(db, { name: 'Segundo', email: 'outro@example.test', password }), /Já existem/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM employees').get().n, 1);
});

test('login usa cookie HttpOnly, sessão expira em 8h e não retorna hash nem token no JSON', async t => {
  const { login, request, db, advance } = await setup(t);
  const result = await login();
  const header = result.response.headers.get('set-cookie');
  assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Strict/); assert.match(header, /Max-Age=28800/);
  assert.deepEqual(Object.keys(result.json.data.user).sort(), ['email', 'id', 'name', 'role']);
  const token = result.cookie.split('=')[1];
  assert.equal(db.prepare('SELECT token_hash FROM sessions').get().token_hash, createHash('sha256').update(token).digest('hex'));
  assert.equal(JSON.stringify(result.json).includes(token), false);
  assert.equal((await request('/api/auth/me', { cookie: result.cookie })).status, 200);
  advance(SESSION_MS);
  assert.equal((await request('/api/auth/me', { cookie: result.cookie })).status, 401);
});

test('produção usa cookie Secure com prefixo __Host', async t => {
  const { login } = await setup(t, { secureCookies: true });
  assert.match((await login()).response.headers.get('set-cookie'), /^__Host-smartpet_session=.*; Secure$/);
});

test('sessão persiste ao reabrir o banco e logout permanece revogado', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'smartpet-session-test-'));
  const filename = join(directory, 'session.sqlite');
  let db = openDatabase(filename);
  t.after(() => { db?.close(); rmSync(directory, { recursive: true, force: true }); });
  migrate(db);
  db.prepare("INSERT INTO employees (id,name,email,password_hash,role) VALUES ('e1','Gerente','g@example.test',?,'gerente')").run(passwordHash);
  let cookie;
  await createAuth(db).login({ headers: {}, socket: { remoteAddress: 'test' } }, { setHeader(name, value) { cookie = value.split(';')[0]; } }, { email: 'g@example.test', password });
  db.close(); db = null; db = openDatabase(filename); migrate(db);
  const auth = createAuth(db);
  assert.equal(auth.session({ headers: { cookie } }).user.id, 'e1');
  auth.logout({ headers: { cookie } }, { setHeader() {} });
  db.close(); db = null; db = openDatabase(filename);
  assert.throws(() => createAuth(db).session({ headers: { cookie } }), error => error.status === 401);
});

test('credenciais inválidas, conta inexistente e inativa produzem a mesma resposta', async t => {
  const { request, db } = await setup(t);
  db.exec("UPDATE employees SET active = 0 WHERE id = 'atendente'");
  for (const [email, attempt] of [['gerente@example.test', 'errada'], ['naoexiste@example.test', password], ['atendente@example.test', password]]) {
    const result = await request('/api/auth/login', { method: 'POST', body: { email, password: attempt } });
    assert.equal(result.status, 401);
    assert.equal(result.json.error.code, 'INVALID_CREDENTIALS');
    assert.equal(result.response.headers.get('set-cookie'), null);
  }
});

test('logout revoga sessão e novo login troca o token anterior', async t => {
  const { request, login } = await setup(t);
  const first = await login(); const second = await login('gerente', first.cookie);
  assert.notEqual(first.cookie, second.cookie);
  assert.equal((await request('/api/auth/me', { cookie: first.cookie })).status, 401);
  const logout = await request('/api/auth/logout', { method: 'POST', cookie: second.cookie });
  assert.equal(logout.status, 200); assert.match(logout.response.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await request('/api/auth/me', { cookie: second.cookie })).status, 401);
  assert.equal((await request('/api/auth/logout', { method: 'POST' })).status, 200);
});

test('mudanças de perfil, senha e inativação revogam sessões no servidor', async t => {
  const { request, login, db } = await setup(t);
  for (const sql of ["UPDATE employees SET role = 'atendente' WHERE id = 'gerente'", "UPDATE employees SET password_hash = password_hash WHERE id = 'gerente'", "UPDATE employees SET active = 0 WHERE id = 'gerente'"]) {
    const { cookie } = await login(); db.exec(sql);
    assert.equal((await request('/api/tutors', { cookie })).status, 401);
  }
});

test('todas as operações de tutores exigem autenticação', async t => {
  const { request } = await setup(t);
  for (const [path, method] of [['/api/tutors', 'GET'], ['/api/tutors', 'POST'], ['/api/tutors/id', 'GET'], ['/api/tutors/id', 'PUT'], ['/api/tutors/id/deactivate', 'POST']]) {
    assert.equal((await request(path, { method, body: method === 'GET' ? undefined : input })).status, 401);
  }
});

test('CSRF: origem externa e ausência de cabeçalho são rejeitadas inclusive no login', async t => {
  const { request, login } = await setup(t);
  const { cookie } = await login();
  for (const headers of [{ Origin: 'https://externo.example' }, { 'X-SmartPet-Request': '' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await request('/api/tutors', { cookie, method: 'POST', body: input, headers })).status, 403);
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'gerente@example.test', password }, headers })).status, 403);
  }
});

test('atendente cadastra, pesquisa, consulta e edita, mas não inativa; gerente inativa', async t => {
  const { request, login, db } = await setup(t);
  const attendant = (await login('atendente')).cookie;
  const manager = (await login()).cookie;
  const created = await request('/api/tutors', { method: 'POST', cookie: attendant, body: input });
  assert.equal(created.status, 201);
  const tutor = created.json.data;
  assert.equal(tutor.phone, '85999990000'); assert.equal(tutor.email, 'ana@example.test');
  db.prepare("INSERT INTO pets (id, tutor_id, name, species) VALUES ('p1', ?, 'Rex', 'Cachorro')").run(tutor.id);
  db.exec("INSERT INTO services (id,name,price_cents,duration_minutes) VALUES ('s1','Banho',5000,60)");
  db.prepare("INSERT INTO appointments (id,pet_id,service_id,tutor_id,created_by_employee_id,date,time,status,price_cents,duration_minutes) VALUES ('a1','p1','s1',?,'gerente','2030-10-01','09:00','agendado',5000,60)").run(tutor.id);
  const detail = await request('/api/tutors/' + tutor.id, { cookie: attendant });
  assert.equal(detail.json.data.pets[0].id, 'p1');
  assert.equal(detail.json.data.petCount, 1);
  const update = await request('/api/tutors/' + tutor.id, { method: 'PUT', cookie: attendant, body: { ...input, name: 'Ana Editada' } });
  assert.equal(update.status, 200); assert.equal(update.json.data.name, 'Ana Editada');
  for (const q of ['Editada', 'ana@example.test', '(85) 99999']) {
    const result = await request('/api/tutors?q=' + encodeURIComponent(q), { cookie: attendant });
    assert.equal(result.json.data.total, 1);
  }
  const path = '/api/tutors/' + tutor.id + '/deactivate';
  assert.equal((await request(path, { method: 'POST', cookie: attendant })).status, 403);
  assert.equal((await request(path, { method: 'POST', cookie: manager })).status, 200);
  assert.equal(db.prepare("SELECT tutor_id FROM pets WHERE id = 'p1'").get().tutor_id, tutor.id);
  assert.equal(db.prepare("SELECT tutor_id FROM appointments WHERE id = 'a1'").get().tutor_id, tutor.id);
  assert.equal((await request('/api/tutors', { cookie: attendant })).json.data.total, 0);
  assert.equal((await request('/api/tutors?status=inactive', { cookie: attendant })).json.data.total, 1);
  assert.equal((await request('/api/tutors/' + tutor.id, { cookie: attendant })).json.data.active, false);
  assert.equal((await request('/api/tutors/' + tutor.id, { method: 'PUT', cookie: manager, body: input })).status, 409);
  assert.equal((await request('/api/tutors/' + tutor.id, { method: 'DELETE', cookie: manager })).status, 405);
});

test('valida campos no servidor, rejeita mass assignment e mantém unicidade mesmo após inativar', async t => {
  const { request, login, db } = await setup(t); const { cookie } = await login();
  for (const body of [{ ...input, name: ' ' }, { ...input, phone: 'abc85999990000' }, { ...input, phone: '123' }, { ...input, email: 'invalido' }, { ...input, active: false }, { ...input, name: 123 }, { ...input, notes: 'a'.repeat(2001) }]) {
    assert.equal((await request('/api/tutors', { method: 'POST', cookie, body })).status, 400);
  }
  assert.equal(db.prepare('SELECT count(*) AS n FROM tutors').get().n, 0);
  const id = (await request('/api/tutors', { method: 'POST', cookie, body: input })).json.data.id;
  assert.equal((await request('/api/tutors', { method: 'POST', cookie, body: { ...input, email: 'ana@EXAMPLE.test' } })).status, 409);
  await request('/api/tutors/' + id + '/deactivate', { method: 'POST', cookie });
  assert.equal((await request('/api/tutors', { method: 'POST', cookie, body: input })).status, 409);
  for (let index = 0; index < 2; index++) assert.equal((await request('/api/tutors', { method: 'POST', cookie, body: { ...input, email: '' } })).status, 201);
});

test('consulta paginada valida parâmetros e busca trata SQL e curingas como dados', async t => {
  const { request, login } = await setup(t); const { cookie } = await login();
  await request('/api/tutors', { method: 'POST', cookie, body: input });
  for (const query of ['limit=101', 'page=0', 'page=abc', 'status=invalid']) assert.equal((await request('/api/tutors?' + query, { cookie })).status, 400);
  for (const search of ["' OR 1=1 --", '%', '_']) assert.equal((await request('/api/tutors?q=' + encodeURIComponent(search), { cookie })).json.data.total, 0);
  const paginated = await request('/api/tutors?limit=1&page=2', { cookie });
  assert.equal(paginated.json.data.total, 1); assert.equal(paginated.json.data.items.length, 0);
  assert.equal((await request('/api/tutors/unknown', { cookie })).status, 404);
});

test('rejeita JSON inválido, corpo grande e formato não JSON', async t => {
  const { url, login, request } = await setup(t); const { cookie } = await login();
  const response = await fetch(url + '/api/tutors', { method: 'POST', headers: { Cookie: cookie, 'X-SmartPet-Request': '1', 'Content-Type': 'application/json' }, body: '{broken' });
  assert.equal(response.status, 400); await response.arrayBuffer();
  assert.equal((await request('/api/tutors', { method: 'POST', cookie, body: { ...input, notes: 'x'.repeat(17000) } })).status, 413);
  assert.equal((await request('/api/tutors', { method: 'POST', cookie, body: input, headers: { 'Content-Type': 'text/plain' } })).status, 415);
});

test('limite de tentativas bloqueia repetição e volta a permitir após a janela', async t => {
  const { request, advance } = await setup(t);
  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'gerente@example.test', password: 'errada' } })).status, 401);
  }
  const blocked = await request('/api/auth/login', { method: 'POST', body: { email: 'gerente@example.test', password } });
  assert.equal(blocked.status, 429); assert.equal(blocked.response.headers.get('retry-after'), '900');
  advance(15 * 60 * 1000);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { email: 'gerente@example.test', password } })).status, 200);
});
