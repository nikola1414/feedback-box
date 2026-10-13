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

import { createApp } from '../src/app.js';

/** Starts the app on an ephemeral port and returns a tiny JSON client. */
export async function startApp(pool) {
  // Low bcrypt cost keeps the suite fast; production uses the default of 10.
  const app = createApp({ pool, bcryptRounds: 4 });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  async function request(method, path, { body, token } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await res.text();
    return { status: res.status, body: raw ? JSON.parse(raw) : null };
  }

  async function raw(method, path, rawBody) {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: rawBody });
    return { status: res.status, body: await res.json() };
  }

  return {
    raw,
    get: (p, o) => request('GET', p, o),
    post: (p, body, o) => request('POST', p, { ...o, body }),
    put: (p, body, o) => request('PUT', p, { ...o, body }),
    delete: (p, o) => request('DELETE', p, o),
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/** Registers a user through the API and returns { token, user }. */
export async function registerUser(api, username, fullName = username, password = 'secret123') {
  const res = await api.post('/auth/register', { username, fullName, password });
  if (res.status !== 201) throw new Error(`register failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

/** Creates an admin directly in the database (self-registration cannot create admins). */
export async function createAdmin(pool, api, username = 'admin') {
  const { token, user } = await registerUser(api, username, 'Admin');
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  return { token, user: { ...user, role: 'admin' } };
}
