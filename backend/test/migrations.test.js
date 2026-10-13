import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';
import { migrate } from '../src/db.js';
import { resetDb, setupDb } from './helpers.js';

describe('database schema', () => {
  let pool;

  before(async () => {
    pool = await setupDb();
  });
  beforeEach(() => resetDb(pool));
  after(() => pool.end());

  it('applies migrations idempotently', async () => {
    await migrate(pool);
    await migrate(pool);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM schema_migrations');
    assert.equal(rows[0].n, 1);
  });

  it('rejects unknown roles', async () => {
    await assert.rejects(
      pool.query("INSERT INTO users (username, password_hash, full_name, role) VALUES ('x','h','X','root')"),
      /check constraint/,
    );
  });

  it('enforces unique usernames', async () => {
    const insert = "INSERT INTO users (username, password_hash, full_name, role) VALUES ('ana','h','Ana','user')";
    await pool.query(insert);
    await assert.rejects(pool.query(insert), /duplicate key/);
  });

  it('only allows votes of +1 or -1, one per user and idea', async () => {
    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash, full_name, role) VALUES ('ana','h','Ana','user') RETURNING id",
    );
    const userId = rows[0].id;
    const idea = await pool.query(
      "INSERT INTO ideas (title, description, category, author_id) VALUES ('t','d','technology',$1) RETURNING id",
      [userId],
    );
    const ideaId = idea.rows[0].id;
    await assert.rejects(pool.query('INSERT INTO votes VALUES ($1,$2,5)', [ideaId, userId]), /check constraint/);
    await pool.query('INSERT INTO votes VALUES ($1,$2,1)', [ideaId, userId]);
    await assert.rejects(pool.query('INSERT INTO votes VALUES ($1,$2,-1)', [ideaId, userId]), /duplicate key/);
  });

  it('removes dependent rows when an idea is deleted', async () => {
    const u = await pool.query(
      "INSERT INTO users (username, password_hash, full_name, role) VALUES ('ana','h','Ana','user') RETURNING id",
    );
    const idea = await pool.query(
      "INSERT INTO ideas (title, description, category, author_id) VALUES ('t','d','technology',$1) RETURNING id",
      [u.rows[0].id],
    );
    await pool.query('INSERT INTO comments (idea_id, author_id, text) VALUES ($1,$2,$3)', [idea.rows[0].id, u.rows[0].id, 'hi']);
    await pool.query('DELETE FROM ideas WHERE id = $1', [idea.rows[0].id]);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM comments');
    assert.equal(rows[0].n, 0);
  });
});
