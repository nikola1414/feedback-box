import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createAdmin, registerUser, resetDb, setupDb, startApp } from './helpers.js';

describe('status changes and statistics', () => {
  let pool;
  let api;
  let admin;
  let ana;
  let ideaId;

  before(async () => {
    pool = await setupDb();
    api = await startApp(pool);
  });
  beforeEach(async () => {
    await resetDb(pool);
    admin = await createAdmin(pool, api);
    ana = await registerUser(api, 'ana', 'Ana');
    const res = await api.post('/ideas', { title: 'Ideja', description: 'Opis', category: 'technology' }, { token: ana.token });
    ideaId = res.body.id;
  });
  after(async () => {
    await api.close();
    await pool.end();
  });

  describe('PUT /ideas/:id/status', () => {
    it('lets an administrator change the status', async () => {
      const res = await api.put(`/ideas/${ideaId}/status`, { status: 'in_progress' }, { token: admin.token });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'in_progress');
    });

    it('forbids regular users, including the idea author', async () => {
      const res = await api.put(`/ideas/${ideaId}/status`, { status: 'implemented' }, { token: ana.token });
      assert.equal(res.status, 403);
      assert.equal((await api.put(`/ideas/${ideaId}/status`, { status: 'implemented' })).status, 401);
      assert.equal((await api.get(`/ideas/${ideaId}`)).body.status, 'pending');
    });

    it('rejects unknown statuses and missing ideas', async () => {
      assert.equal((await api.put(`/ideas/${ideaId}/status`, { status: 'done' }, { token: admin.token })).status, 400);
      assert.equal((await api.put('/ideas/9999/status', { status: 'rejected' }, { token: admin.token })).status, 404);
    });
  });

  describe('GET /stats', () => {
    it('is empty for an empty database', async () => {
      await pool.query('TRUNCATE ideas CASCADE');
      const res = await api.get('/stats');
      assert.deepEqual(res.body, { total: 0, inProgress: 0, implemented: 0, votes: 0, byCategory: {} });
    });

    it('summarises ideas, statuses, votes and categories', async () => {
      const second = await api.post('/ideas', { title: 'Druga', description: 'Opis', category: 'workplace' }, { token: ana.token });
      await api.post(`/ideas/${ideaId}/vote`, { type: 'up' }, { token: ana.token });
      await api.post(`/ideas/${ideaId}/vote`, { type: 'down' }, { token: admin.token });
      await api.put(`/ideas/${second.body.id}/status`, { status: 'implemented' }, { token: admin.token });
      const res = await api.get('/stats');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, {
        total: 2,
        inProgress: 0,
        implemented: 1,
        votes: 2,
        byCategory: { technology: 1, workplace: 1 },
      });
    });
  });
});
