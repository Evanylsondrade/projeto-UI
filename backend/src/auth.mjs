import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './errors.mjs';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
const DUMMY = `scrypt$131072$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;
export const SESSION_MS = 8 * 60 * 60 * 1000;
const digest = token => createHash('sha256').update(token).digest('hex');
export const publicEmployee = row => ({ id: row.id, name: row.name, email: row.email, role: row.role });

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 15 || password.length > 128) {
    throw new HttpError(400, 'INVALID_PASSWORD', 'Use uma senha entre 15 e 128 caracteres.');
  }
  const salt = randomBytes(16);
  const hash = await derive(password, salt, 64, options);
  return `scrypt$131072$8$1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const valid = typeof encoded === 'string' && /^scrypt\$131072\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const parts = (valid ? encoded : DUMMY).split('$');
  const hash = await derive(password, Buffer.from(parts[4], 'hex'), 64, options);
  return timingSafeEqual(hash, Buffer.from(parts[5], 'hex')) && valid;
}

export async function bootstrapManager(db, { name, email, password }) {
  if (db.prepare('SELECT 1 FROM employees LIMIT 1').get()) throw new Error('Já existem funcionários. A implantação inicial não altera contas existentes.');
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) throw new Error('Informe um nome entre 2 e 100 caracteres.');
  if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Informe um email válido.');
  const hash = await hashPassword(password);
  // O cálculo do hash é assíncrono: revalidar dentro da transação evita duas contas iniciais.
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare('SELECT 1 FROM employees LIMIT 1').get()) throw new Error('Já existem funcionários.');
    const user = { id: randomUUID(), name: name.trim(), email: email.trim().toLowerCase(), role: 'gerente' };
    db.prepare('INSERT INTO employees (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(user.id, user.name, user.email, hash, user.role);
    db.exec('COMMIT');
    return user;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function createAuth(db, { secureCookies = false, now = Date.now } = {}) {
  const cookieName = secureCookies ? '__Host-smartpet_session' : 'smartpet_session';
  const attempts = new Map();
  let hashing = 0;
  function cookie(token = '', maxAge = 0) {
    return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`;
  }
  function readToken(request) {
    const value = (request.headers.cookie ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
  }
  function limit(request, email) {
    const time = now();
    for (const [key, entry] of attempts) if (entry.until <= time) attempts.delete(key);
    const keys = [`ip:${request.socket.remoteAddress}`, `email:${digest(email)}`];
    if (attempts.size > 10000 || hashing >= 2 || keys.some(key => (attempts.get(key)?.count ?? 0) >= (key.startsWith('ip:') ? 30 : 10))) {
      throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Muitas tentativas. Aguarde 15 minutos e tente novamente.');
    }
    for (const key of keys) {
      const entry = attempts.get(key) ?? { count: 0, until: time + 15 * 60 * 1000 };
      entry.count++;
      attempts.set(key, entry);
    }
  }
  function session(request) {
    const token = readToken(request);
    const row = token ? db.prepare(`SELECT e.id, e.name, e.email, e.role, s.expires_at FROM sessions s
      JOIN employees e ON e.id = s.employee_id WHERE s.token_hash = ? AND s.expires_at > ? AND e.active = 1`).get(digest(token), now()) : null;
    if (!row) throw new HttpError(401, 'UNAUTHENTICATED', 'Sua sessão expirou ou não existe. Entre novamente.');
    return { user: publicEmployee(row), expiresAt: row.expires_at };
  }
  return {
    session,
    authorize(request, roles = ['gerente', 'atendente']) {
      const current = session(request);
      if (!roles.includes(current.user.role)) throw new HttpError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');
      return current;
    },
    async login(request, response, body) {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!email || email.length > 254 || typeof body.password !== 'string' || !body.password.length || body.password.length > 128) {
        throw new HttpError(400, 'INVALID_INPUT', 'Informe email e senha válidos.');
      }
      limit(request, email);
      const employee = db.prepare('SELECT * FROM employees WHERE email = ?').get(email);
      hashing++;
      let matches;
      try { matches = await verifyPassword(body.password, employee?.password_hash); }
      finally { hashing--; }
      // Reconsultar após o hash: o funcionário pode ter sido inativado durante a espera.
      const current = employee && db.prepare('SELECT * FROM employees WHERE id = ?').get(employee.id);
      if (!matches || !current?.active || current.password_hash !== employee.password_hash) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email ou senha incorretos.');
      }
      const token = randomBytes(32).toString('hex');
      const expiresAt = now() + SESSION_MS;
      const previous = readToken(request);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
        if (previous) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(previous));
        db.prepare('INSERT INTO sessions (token_hash, employee_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(digest(token), current.id, expiresAt, now());
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      response.setHeader('Set-Cookie', cookie(token, SESSION_MS / 1000));
      return { user: publicEmployee(current), expiresAt };
    },
    logout(request, response) {
      const token = readToken(request);
      if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token));
      response.setHeader('Set-Cookie', cookie());
      return { message: 'Sessão encerrada.' };
    },
  };
}
