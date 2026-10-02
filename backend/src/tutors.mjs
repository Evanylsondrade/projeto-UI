import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.mjs';

const columns = `t.*, (SELECT count(*) FROM pets p WHERE p.tutor_id = t.id) AS pet_count`;
const mapTutor = row => ({ id: row.id, name: row.name, phone: row.phone, email: row.email ?? '', address: row.address, notes: row.notes,
  active: Boolean(row.active), petCount: row.pet_count, createdAt: row.created_at, updatedAt: row.updated_at });

function validate(input) {
  const allowed = ['name', 'phone', 'email', 'address', 'notes'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new HttpError(400, 'INVALID_INPUT', 'Campo não permitido no cadastro de tutor.');
  const result = {};
  for (const key of allowed) {
    if (typeof (input[key] ?? '') !== 'string') throw new HttpError(400, 'INVALID_INPUT', `O campo ${key} deve ser texto.`);
    result[key] = (input[key] ?? '').trim();
  }
  if (result.name.length < 2 || result.name.length > 100) throw new HttpError(400, 'INVALID_NAME', 'Informe um nome entre 2 e 100 caracteres.');
  if (!/^[\d\s()+.-]+$/.test(result.phone)) throw new HttpError(400, 'INVALID_PHONE', 'Informe um telefone válido com DDD.');
  result.phone = result.phone.replace(/\D/g, '');
  if (!/^\d{10,11}$/.test(result.phone)) throw new HttpError(400, 'INVALID_PHONE', 'O telefone deve ter 10 ou 11 dígitos, incluindo DDD.');
  result.email = result.email.toLowerCase();
  if (result.email && (result.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))) throw new HttpError(400, 'INVALID_EMAIL', 'Informe um email válido.');
  if (result.address.length > 500 || result.notes.length > 2000) throw new HttpError(400, 'INVALID_INPUT', 'Endereço limitado a 500 caracteres e observações a 2000.');
  return result;
}

export function createTutors(db) {
  const find = id => {
    const row = db.prepare(`SELECT ${columns} FROM tutors t WHERE t.id = ?`).get(id);
    if (!row) throw new HttpError(404, 'TUTOR_NOT_FOUND', 'Tutor não encontrado.');
    return mapTutor(row);
  };
  const ensureEmail = (email, id = '') => {
    if (email && db.prepare('SELECT 1 FROM tutors WHERE email = ? AND id <> ?').get(email, id)) {
      throw new HttpError(409, 'EMAIL_IN_USE', 'Este email já está vinculado a outro tutor, ativo ou inativo.');
    }
  };
  function write(operation) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return {
    list(query) {
      const status = query.get('status') ?? 'active';
      const search = (query.get('q') ?? '').trim();
      const pageText = query.get('page') ?? '1';
      const limitText = query.get('limit') ?? '30';
      if (!['active', 'inactive', 'all'].includes(status) || search.length > 100 || !/^\d+$/.test(pageText) || !/^\d+$/.test(limitText)) throw new HttpError(400, 'INVALID_QUERY', 'Filtros de consulta inválidos.');
      const page = Number(pageText), limit = Number(limitText);
      if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || limit < 1 || limit > 100) throw new HttpError(400, 'INVALID_QUERY', 'Paginação inválida. O limite máximo é 100.');
      const escaped = search.replace(/[\\%_]/g, '\\$&');
      const phone = search.replace(/\D/g, '');
      const phoneSearch = phone && /^[\d\s()+.-]+$/.test(search) ? `%${phone}%` : `%${escaped}%`;
      const condition = `(? = 'all' OR t.active = ?) AND (t.name LIKE ? ESCAPE '\\' OR t.email LIKE ? ESCAPE '\\' OR t.phone LIKE ? ESCAPE '\\')`;
      const args = [status, status === 'inactive' ? 0 : 1, `%${escaped}%`, `%${escaped}%`, phoneSearch];
      const total = db.prepare(`SELECT count(*) AS total FROM tutors t WHERE ${condition}`).get(...args).total;
      const items = db.prepare(`SELECT ${columns} FROM tutors t WHERE ${condition} ORDER BY t.name COLLATE NOCASE, t.id LIMIT ? OFFSET ?`).all(...args, limit, (page - 1) * limit).map(mapTutor);
      return { items, total, page, limit };
    },
    detail(id) {
      const tutor = find(id);
      const pets = db.prepare('SELECT id, name, species, breed, active FROM pets WHERE tutor_id = ? ORDER BY name').all(id).map(row => ({ ...row, active: Boolean(row.active) }));
      return { ...tutor, pets };
    },
    create(input) {
      const value = validate(input);
      return write(() => {
        ensureEmail(value.email);
        const id = randomUUID();
        db.prepare('INSERT INTO tutors (id, name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?)').run(id, value.name, value.phone, value.email || null, value.address, value.notes);
        return find(id);
      });
    },
    update(id, input) {
      const value = validate(input);
      return write(() => {
        const current = find(id);
        if (!current.active) throw new HttpError(409, 'TUTOR_INACTIVE', 'O cadastro está inativo e não pode ser editado.');
        ensureEmail(value.email, id);
        db.prepare('UPDATE tutors SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?').run(value.name, value.phone, value.email || null, value.address, value.notes, id);
        return find(id);
      });
    },
    deactivate(id) {
      return write(() => {
        find(id);
        db.prepare('UPDATE tutors SET active = 0 WHERE id = ?').run(id);
        return find(id);
      });
    },
  };
}
