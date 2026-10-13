import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { registerUser, resetDb, setupDb, startApp } from './helpers.js';

describe('comments API', () => {
  let pool;
  let api;
  let ana;
  let petar;
  let ideaId;

  before(async () => {
    pool = await setupDb();
    api = await startApp(pool);
  });
  beforeEach(async () => {
    await resetDb(pool);
    ana = await registerUser(api, 'ana', 'Ana Anić');
    petar = await registerUser(api, 'petar', 'Petar Petrović');
    const res = await api.post('/ideas', { title: 'Ideja', description: 'Opis', category: 'technology' }, { token: ana.token });
    ideaId = res.body.id;
  });
  after(async () => {
    await api.close();
    await pool.end();
  });

  it('requires authentication', async () => {
    assert.equal((await api.post(`/ideas/${ideaId}/comments`, { text: 'hej' })).status, 401);
  });

  it('adds a trimmed comment attributed to the caller', async () => {
    const res = await api.post(`/ideas/${ideaId}/comments`, { text: '  Sjajna ideja!  ' }, { token: petar.token });
    assert.equal(res.status, 201);
    assert.equal(res.body.text, 'Sjajna ideja!');
    assert.equal(res.body.authorName, 'Petar Petrović');
  });

  it('rejects empty and oversized comments', async () => {
    for (const text of ['', '   ', 'x'.repeat(1001), undefined]) {
      const res = await api.post(`/ideas/${ideaId}/comments`, { text }, { token: ana.token });
      assert.equal(res.status, 400);
    }
  });

  it('returns comments with the idea, oldest first', async () => {
    await api.post(`/ideas/${ideaId}/comments`, { text: 'prvi' }, { token: ana.token });
    await api.post(`/ideas/${ideaId}/comments`, { text: 'drugi' }, { token: petar.token });
    const { body } = await api.get(`/ideas/${ideaId}`);
    assert.deepEqual(body.comments.map((c) => c.text), ['prvi', 'drugi']);
    assert.equal(body.comments[1].authorName, 'Petar Petrović');
  });

  it('returns 404 for comments on a missing idea', async () => {
    assert.equal((await api.post('/ideas/12345/comments', { text: 'x' }, { token: ana.token })).status, 404);
  });

  it('removes comments together with their idea', async () => {
    await api.post(`/ideas/${ideaId}/comments`, { text: 'prvi' }, { token: ana.token });
    await api.delete(`/ideas/${ideaId}`, { token: ana.token });
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM comments');
    assert.equal(rows[0].n, 0);
  });
});
