import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createAdmin, registerUser, resetDb, setupDb, startApp } from './helpers.js';

describe('auth API', () => {
  let pool;
  let api;

  before(async () => {
    pool = await setupDb();
    api = await startApp(pool);
  });
  beforeEach(() => resetDb(pool));
  after(async () => {
    await api.close();
    await pool.end();
  });

  it('registers a user and returns a session token', async () => {
    const res = await api.post('/auth/register', { username: 'Petar', fullName: ' Petar Petrović ', password: 'user123' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.username, 'petar');
    assert.equal(res.body.user.fullName, 'Petar Petrović');
    assert.equal(res.body.user.role, 'user');
    assert.match(res.body.token, /^[0-9a-f]{64}$/);
    assert.equal(JSON.stringify(res.body).includes('password'), false);
  });

  it('never lets self-registration create an administrator', async () => {
    const res = await api.post('/auth/register', { username: 'sneaky', fullName: 'S', password: 'secret1', role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'user');
  });

  it('stores passwords hashed and tokens hashed', async () => {
    const { token } = await registerUser(api, 'ana');
    const { rows: users } = await pool.query('SELECT password_hash FROM users');
    assert.match(users[0].password_hash, /^\$2[aby]\$/);
    const { rows: sessions } = await pool.query('SELECT token_hash FROM sessions');
    assert.notEqual(sessions[0].token_hash, token);
  });

  it('rejects duplicate usernames case-insensitively with 409', async () => {
    await registerUser(api, 'ana');
    const res = await api.post('/auth/register', { username: 'ANA', fullName: 'Ana', password: 'secret123' });
    assert.equal(res.status, 409);
  });

  it('validates registration input', async () => {
    const bad = [
      { username: 'ab', fullName: 'A', password: 'secret123' },
      { username: 'has space', fullName: 'A', password: 'secret123' },
      { username: 'valid', fullName: '   ', password: 'secret123' },
      { username: 'valid', fullName: 'A', password: '123' },
      {},
    ];
    for (const body of bad) {
      const res = await api.post('/auth/register', body);
      assert.equal(res.status, 400, JSON.stringify(body));
    }
  });

  it('logs in with correct credentials, ignoring username case and whitespace', async () => {
    await registerUser(api, 'ana', 'Ana Anić', 'user123');
    const res = await api.post('/auth/login', { username: ' Ana ', password: 'user123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.fullName, 'Ana Anić');
  });

  it('rejects wrong passwords and unknown users with the same 401', async () => {
    await registerUser(api, 'ana', 'Ana', 'user123');
    const wrong = await api.post('/auth/login', { username: 'ana', password: 'nope' });
    const unknown = await api.post('/auth/login', { username: 'ghost', password: 'nope' });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(wrong.body, unknown.body);
  });

  it('returns the current user for a valid token and 401 otherwise', async () => {
    const { token } = await registerUser(api, 'ana');
    const ok = await api.get('/auth/me', { token });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.user.username, 'ana');
    assert.equal((await api.get('/auth/me')).status, 401);
    assert.equal((await api.get('/auth/me', { token: 'f'.repeat(64) })).status, 401);
  });

  it('invalidates the token on logout', async () => {
    const { token } = await registerUser(api, 'ana');
    assert.equal((await api.post('/auth/logout', undefined, { token })).status, 204);
    assert.equal((await api.get('/auth/me', { token })).status, 401);
  });

  it('rejects expired sessions', async () => {
    const { token } = await registerUser(api, 'ana');
    await pool.query("UPDATE sessions SET expires_at = now() - interval '1 minute'");
    assert.equal((await api.get('/auth/me', { token })).status, 401);
  });

  it('keeps administrators provisioned in the database as admins', async () => {
    const { token } = await createAdmin(pool, api);
    const res = await api.get('/auth/me', { token });
    assert.equal(res.body.user.role, 'admin');
  });

  it('answers malformed JSON with 400 and unknown routes with 404', async () => {
    const bad = await api.raw('POST', '/auth/login', '{not json');
    assert.equal(bad.status, 400);
    assert.equal((await api.get('/nope')).status, 404);
  });
});
