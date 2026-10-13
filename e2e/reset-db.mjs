// Empties the end-to-end database so every run starts from the demo seed.
import { createPool, migrate } from '../backend/src/db.js';

const pool = createPool(process.env.DATABASE_URL);
await migrate(pool);
await pool.query('TRUNCATE users, sessions, ideas, votes, comments RESTART IDENTITY CASCADE');
await pool.end();
