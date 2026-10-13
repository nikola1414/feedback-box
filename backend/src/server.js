import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createPool, migrate } from './db.js';
import { seedDemo } from './seed.js';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://feedbackbox:feedbackbox@localhost:5432/feedbackbox';
const port = Number(process.env.PORT ?? 8080);
const frontendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend');

const pool = createPool(databaseUrl);
await migrate(pool);
if (process.env.SEED_DEMO !== 'false' && (await seedDemo(pool))) {
  console.log('Seeded demo users (admin, petar, ana) and ideas.');
}

const server = createApp({ pool, staticDir: frontendDir }).listen(port, () => {
  console.log(`Feedback Box listening on http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
