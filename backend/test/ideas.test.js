import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createAdmin, registerUser, resetDb, setupDb, startApp } from './helpers.js';

const idea = (over = {}) => ({
  title: 'Fleksibilno radno vreme',
  description: 'Dolazak od 8 do 10h.',
  category: 'hr_benefits',
  ...over,
});

describe('ideas API', () => {
  let pool;
  let api;
  let ana;
  let petar;

  before(async () => {
    pool = await setupDb();
    api = await startApp(pool);
  });
  beforeEach(async () => {
    await resetDb(pool);
    ana = await registerUser(api, 'ana', 'Ana Anić');
    petar = await registerUser(api, 'petar', 'Petar Petrović');
  });
  after(async () => {
    await api.close();
    await pool.end();
  });

  describe('create and read', () => {
    it('requires authentication to create', async () => {
      assert.equal((await api.post('/ideas', idea())).status, 401);
    });

    it('creates a pending idea owned by the caller', async () => {
      const res = await api.post('/ideas', idea(), { token: ana.token });
      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'pending');
      assert.equal(res.body.author.fullName, 'Ana Anić');
      assert.equal(res.body.upvotes, 0);
      assert.deepEqual(res.body.comments, []);
      assert.equal(res.body.myVote, null);
    });

    it('validates title, description and category', async () => {
      const bad = [
        idea({ title: '' }),
        idea({ title: 'x'.repeat(121) }),
        idea({ description: '   ' }),
        idea({ category: 'nonsense' }),
        {},
      ];
      for (const body of bad) {
        assert.equal((await api.post('/ideas', body, { token: ana.token })).status, 400, JSON.stringify(body).slice(0, 60));
      }
    });

    it('lists ideas publicly and fetches one by id', async () => {
      const created = await api.post('/ideas', idea(), { token: ana.token });
      const list = await api.get('/ideas');
      assert.equal(list.status, 200);
      assert.equal(list.body.length, 1);
      const one = await api.get(`/ideas/${created.body.id}`);
      assert.equal(one.body.title, 'Fleksibilno radno vreme');
    });

    it('returns 404 for missing ideas and 400 for malformed ids', async () => {
      assert.equal((await api.get('/ideas/9999')).status, 404);
      assert.equal((await api.get('/ideas/abc')).status, 400);
    });
  });

  describe('update and delete', () => {
    it('lets the author edit their idea', async () => {
      const { body } = await api.post('/ideas', idea(), { token: ana.token });
      const res = await api.put(`/ideas/${body.id}`, idea({ title: 'Novi naslov', category: 'technology' }), { token: ana.token });
      assert.equal(res.status, 200);
      assert.equal(res.body.title, 'Novi naslov');
      assert.equal(res.body.category, 'technology');
    });

    it("forbids editing or deleting someone else's idea", async () => {
      const { body } = await api.post('/ideas', idea(), { token: ana.token });
      assert.equal((await api.put(`/ideas/${body.id}`, idea(), { token: petar.token })).status, 403);
      assert.equal((await api.delete(`/ideas/${body.id}`, { token: petar.token })).status, 403);
      assert.equal((await api.put(`/ideas/${body.id}`, idea())).status, 401);
    });

    it("lets an admin edit and delete anyone's idea", async () => {
      const admin = await createAdmin(pool, api);
      const { body } = await api.post('/ideas', idea(), { token: ana.token });
      assert.equal((await api.put(`/ideas/${body.id}`, idea({ title: 'Admin edit' }), { token: admin.token })).status, 200);
      assert.equal((await api.delete(`/ideas/${body.id}`, { token: admin.token })).status, 204);
      assert.equal((await api.get(`/ideas/${body.id}`)).status, 404);
    });

    it('returns 404 when editing or deleting a missing idea', async () => {
      assert.equal((await api.put('/ideas/777', idea(), { token: ana.token })).status, 404);
      assert.equal((await api.delete('/ideas/777', { token: ana.token })).status, 404);
    });
  });

  describe('filtering and sorting', () => {
    beforeEach(async () => {
      const make = (body, token) => api.post('/ideas', body, { token });
      await make(idea({ title: 'Besplatno voće', description: 'U kuhinjama', category: 'workplace' }), ana.token);
      await make(idea({ title: 'Python skripta', description: 'Automatizacija izveštaja', category: 'technology' }), petar.token);
      await make(idea({ title: 'Ergonomske stolice', description: '100% novi modeli_', category: 'workplace' }), ana.token);
      await pool.query("UPDATE ideas SET status = 'implemented' WHERE title = 'Ergonomske stolice'");
    });

    const titles = (res) => res.body.map((i) => i.title);

    it('filters by category and status', async () => {
      assert.deepEqual(titles(await api.get('/ideas?category=technology')), ['Python skripta']);
      assert.deepEqual(titles(await api.get('/ideas?status=implemented')), ['Ergonomske stolice']);
      assert.equal((await api.get('/ideas?category=workplace&status=pending')).body.length, 1);
    });

    it('ignores unknown filter values instead of failing', async () => {
      assert.equal((await api.get('/ideas?category=whatever')).body.length, 3);
    });

    it('searches title and description case-insensitively', async () => {
      assert.deepEqual(titles(await api.get('/ideas?q=PYTHON')), ['Python skripta']);
      assert.deepEqual(titles(await api.get('/ideas?q=izveštaja')), ['Python skripta']);
    });

    it('treats LIKE wildcards in the search text literally', async () => {
      assert.equal((await api.get('/ideas?q=%25')).body.length, 1);
      assert.equal((await api.get('/ideas?q=_')).body.length, 1);
      assert.equal((await api.get('/ideas?q=%25%25xyz')).body.length, 0);
    });

    it('sorts newest first by default and oldest first on request', async () => {
      await pool.query("UPDATE ideas SET created_at = now() - interval '3 days' WHERE title = 'Besplatno voće'");
      await pool.query("UPDATE ideas SET created_at = now() - interval '1 day' WHERE title = 'Python skripta'");
      assert.deepEqual(titles(await api.get('/ideas')), ['Ergonomske stolice', 'Python skripta', 'Besplatno voće']);
      assert.deepEqual(titles(await api.get('/ideas?sort=oldest')), ['Besplatno voće', 'Python skripta', 'Ergonomske stolice']);
    });
  });
});
