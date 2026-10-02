import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { HttpError, errorResponse } from './errors.mjs';
import { createAuth } from './auth.mjs';
import { createTutors } from './tutors.mjs';

export const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173', 'http://localhost:3001', 'http://127.0.0.1:3001'];

async function readJson(request) {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    request.resume();
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envie os dados como application/json.');
  }
  const text = await new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', chunk => {
      size += chunk.length;
      if (size > 16 * 1024) { chunks.length = 0; reject(new HttpError(413, 'BODY_TOO_LARGE', 'Solicitação muito grande.')); }
      else chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
    request.on('aborted', () => reject(new HttpError(400, 'ABORTED_REQUEST', 'Solicitação interrompida.')));
  });
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new HttpError(400, 'INVALID_JSON', 'Envie um objeto JSON válido.'); }
}

function sendJson(response, status, body, requestId, headOnly) {
  const json = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(json),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
  });
  response.end(headOnly ? undefined : json);
}

export function createApp({ db, logger = console, allowedOrigins = localOrigins, secureCookies = false, now = Date.now }) {
  const auth = createAuth(db, { secureCookies, now });
  const tutors = createTutors(db);
  return createServer({ requestTimeout: 15_000, headersTimeout: 10_000 }, async (request, response) => {
    const requestId = randomUUID();
    const headOnly = request.method === 'HEAD';
    try {
      let url;
      try { url = new URL(request.url, 'http://localhost'); }
      catch { throw new HttpError(400, 'INVALID_URL', 'Endereço da solicitação inválido.'); }
      const path = url.pathname;
      const tutorMatch = path.match(/^\/api\/tutors\/([a-zA-Z0-9-]+)(\/deactivate)?$/);
      const methods = ['/api/health', '/api/ready', '/api/auth/me'].includes(path) ? ['GET', 'HEAD']
        : ['/api/auth/login', '/api/auth/logout'].includes(path) ? ['POST']
        : path === '/api/tutors' ? ['GET', 'HEAD', 'POST']
        : tutorMatch ? (tutorMatch[2] ? ['POST'] : ['GET', 'HEAD', 'PUT']) : null;
      if (!methods) {
        throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
      }
      if (!methods.includes(request.method)) {
        response.setHeader('Allow', methods.join(', '));
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Método não permitido para esta rota.');
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        if (request.headers['x-smartpet-request'] !== '1' || request.headers['sec-fetch-site'] === 'cross-site' ||
          (request.headers.origin && !allowedOrigins.includes(request.headers.origin))) {
          throw new HttpError(403, 'UNTRUSTED_REQUEST', 'Origem da solicitação não permitida.');
        }
      }
      let data;
      let status = 200;
      if (path === '/api/auth/login') data = await auth.login(request, response, await readJson(request));
      else if (path === '/api/auth/logout') data = auth.logout(request, response);
      else if (path === '/api/auth/me') data = auth.session(request);
      else if (path === '/api/tutors') {
        auth.authorize(request);
        if (request.method === 'POST') {
          const body = await readJson(request);
          auth.authorize(request);
          data = tutors.create(body); status = 201;
        }
        else data = tutors.list(url.searchParams);
      } else if (tutorMatch) {
        auth.authorize(request, tutorMatch[2] ? ['gerente'] : ['gerente', 'atendente']);
        if (tutorMatch[2]) data = tutors.deactivate(tutorMatch[1]);
        else if (request.method === 'PUT') {
          const body = await readJson(request);
          auth.authorize(request);
          data = tutors.update(tutorMatch[1], body);
        }
        else data = tutors.detail(tutorMatch[1]);
      }
      if (url.pathname === '/api/ready') {
        try { db.prepare('SELECT 1').get(); }
        catch {
          logger.error({ requestId, code: 'DATABASE_UNAVAILABLE' });
          throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Banco de dados indisponível.');
        }
      }
      request.resume();
      sendJson(response, status, { data: data ?? { status: 'ok', ...(url.pathname === '/api/ready' ? { database: 'connected' } : {}) } }, requestId, headOnly);
    } catch (error) {
      const result = errorResponse(error, requestId);
      // Não registrar SQL, credenciais ou informações pessoais em erros de requisição.
      if (result.status === 500) logger.error({ requestId, code: 'INTERNAL_ERROR' });
      request.resume();
      if (result.status === 429) response.setHeader('Retry-After', '900');
      if (!response.destroyed) sendJson(response, result.status, result.body, requestId, headOnly);
    }
  });
}
