import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { registerUser, resetDb, setupDb, startApp } from './helpers.js';

describe('voting API', () => {
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
    ana = await registerUser(api, 'ana', 'Ana');
    petar = await registerUser(api, 'petar', 'Petar');
    const res = await api.post('/ideas', { title: 'Ideja', description: 'Opis', category: 'technology' }, { token: ana.token });
    ideaId = res.body.id;
  });
  after(async () => {
    await api.close();
    await pool.end();
  });

  const vote = (type, token) => api.post(`/ideas/${ideaId}/vote`, { type }, { token });

  it('requires authentication and a valid vote type', async () => {
    assert.equal((await vote('up')).status, 401);
    assert.equal((await vote('sideways', ana.token)).status, 400);
    assert.equal((await api.post(`/ideas/${ideaId}/vote`, {}, { token: ana.token })).status, 400);
  });

  it('counts upvotes and downvotes and reports the caller\'s own vote', async () => {
    await vote('up', ana.token);
    const res = await vote('down', petar.token);
    assert.equal(res.status, 200);
    assert.equal(res.body.upvotes, 1);
    assert.equal(res.body.downvotes, 1);
    assert.equal(res.body.myVote, 'down');
    const asAna = await api.get(`/ideas/${ideaId}`, { token: ana.token });
    assert.equal(asAna.body.myVote, 'up');
    const anonymous = await api.get(`/ideas/${ideaId}`);
    assert.equal(anonymous.body.myVote, null);
  });

  it('withdraws a vote when the same vote is cast twice', async () => {
    await vote('up', ana.token);
    const res = await vote('up', ana.token);
    assert.equal(res.body.upvotes, 0);
    assert.equal(res.body.myVote, null);
  });

  it('switches a vote to the opposite side without double counting', async () => {
    await vote('up', ana.token);
    const res = await vote('down', ana.token);
    assert.equal(res.body.upvotes, 0);
    assert.equal(res.body.downvotes, 1);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM votes');
    assert.equal(rows[0].n, 1);
  });

  it('lets authors vote on their own ideas just like anyone else', async () => {
    const res = await vote('up', ana.token);
    assert.equal(res.status, 200);
    assert.equal(res.body.upvotes, 1);
  });

  it('closes voting once an idea is no longer pending', async () => {
    for (const status of ['in_progress', 'implemented', 'rejected']) {
      await pool.query('UPDATE ideas SET status = $1', [status]);
      const res = await vote('up', ana.token);
      assert.equal(res.status, 409, status);
    }
  });

  it('returns 404 when voting on a missing idea', async () => {
    assert.equal((await api.post('/ideas/4040/vote', { type: 'up' }, { token: ana.token })).status, 404);
  });

  it('sorts by net score when asked for the most popular ideas', async () => {
    const second = await api.post('/ideas', { title: 'Druga', description: 'Opis', category: 'workplace' }, { token: ana.token });
    const third = await api.post('/ideas', { title: 'Treća', description: 'Opis', category: 'workplace' }, { token: ana.token });
    await api.post(`/ideas/${second.body.id}/vote`, { type: 'up' }, { token: ana.token });
    await api.post(`/ideas/${second.body.id}/vote`, { type: 'up' }, { token: petar.token });
    await api.post(`/ideas/${third.body.id}/vote`, { type: 'down' }, { token: petar.token });
    await vote('up', ana.token);
    const list = await api.get('/ideas?sort=popular');
    assert.deepEqual(list.body.map((i) => i.title), ['Druga', 'Ideja', 'Treća']);
  });
});
