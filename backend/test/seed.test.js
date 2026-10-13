import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { seedDemo } from '../src/seed.js';
import { resetDb, setupDb, startApp } from './helpers.js';

describe('demo seed', () => {
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

  it('fills an empty database and the demo accounts can log in', async () => {
    assert.equal(await seedDemo(pool, { bcryptRounds: 4 }), true);
    const login = await api.post('/auth/login', { username: 'admin', password: 'admin123' });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.role, 'admin');
    const ideas = await api.get('/ideas');
    assert.equal(ideas.body.length, 4);
    assert.equal(ideas.body.find((i) => i.title.startsWith('Besplatno')).upvotes, 3);
  });

  it('never touches a database that already has users', async () => {
    await seedDemo(pool, { bcryptRounds: 4 });
    assert.equal(await seedDemo(pool, { bcryptRounds: 4 }), false);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
    assert.equal(rows[0].n, 3);
  });
});
