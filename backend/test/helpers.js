import { createPool, migrate } from '../src/db.js';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://feedbackbox:feedbackbox@localhost:5432/feedbackbox_test';

export async function setupDb() {
  const pool = createPool(TEST_DB_URL);
  await migrate(pool);
  return pool;
}

export async function resetDb(pool) {
  await pool.query('TRUNCATE users, sessions, ideas, votes, comments RESTART IDENTITY CASCADE');
}
