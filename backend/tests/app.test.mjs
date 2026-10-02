import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.mjs';
import { openDatabase, migrate } from '../src/database.mjs';
import { errorResponse, HttpError } from '../src/errors.mjs';

async function application(t, override = {}) {
  const db = openDatabase(':memory:');
  migrate(db);
  const logs = [];
  const app = createApp({ db, logger: { error: entry => logs.push(entry) }, ...override });
  t.after(async () => {
    await new Promise((resolve, reject) => app.close(error => error ? reject(error) : resolve()));
    db.close();
  });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  return { url: `http://127.0.0.1:${app.address().port}`, logs };
}

test('servidor e conexão real respondem às verificações de saúde', async t => {
  const { url } = await application(t);
  for (const route of ['/api/health', '/api/ready']) {
    const response = await fetch(url + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(response.headers.get('x-request-id'));
    const { data } = await response.json();
    assert.equal(data.status, 'ok');
    if (route === '/api/ready') assert.equal(data.database, 'connected');
  }
});

test('rotas fora do escopo retornam erro padronizado', async t => {
  const { url } = await application(t);
  for (const route of ['/api/pets', '/api/login', '/missing']) {
    const response = await fetch(url + route);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: {
      code: 'NOT_FOUND', message: 'Rota não encontrada.', requestId: response.headers.get('x-request-id'),
    } });
  }
});

test('métodos não permitidos retornam 405 e HEAD não retorna corpo', async t => {
  const { url } = await application(t);
  const response = await fetch(url + '/api/health', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
  assert.equal((await response.json()).error.code, 'METHOD_NOT_ALLOWED');
  const head = await fetch(url + '/api/health', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('falha no banco retorna 503 sem expor SQL ou detalhes internos', async t => {
  const { url, logs } = await application(t, { db: { prepare() { throw new Error('sensitive SQL path password'); } } });
  const response = await fetch(url + '/api/ready');
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, 'DATABASE_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(body) + JSON.stringify(logs), /sensitive|password/);
  assert.equal((await fetch(url + '/api/health')).status, 200);
});

test('erro desconhecido é convertido em 500 genérico; erros públicos preservam contrato', () => {
  const result = errorResponse(new Error('sensitive SQL path password'), 'request-test');
  assert.equal(result.status, 500);
  assert.equal(result.body.error.code, 'INTERNAL_ERROR');
  assert.equal(result.body.error.requestId, 'request-test');
  assert.doesNotMatch(JSON.stringify(result), /sensitive|password/);
  assert.equal(errorResponse(new HttpError(400, 'INVALID_INPUT', 'Dados inválidos.'), 'id').status, 400);
});
