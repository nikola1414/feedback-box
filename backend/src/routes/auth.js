import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { conflict, unauthorized } from '../errors.js';
import { requireUser } from '../sessions.js';
import { parseRegistration } from '../validate.js';

// Used to spend the same time on unknown usernames as on wrong passwords.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicUser = (u) => ({ id: Number(u.id), username: u.username, fullName: u.full_name ?? u.fullName, role: u.role });

export function authRoutes({ pool, sessions, bcryptRounds = 10 }) {
  const router = Router();

  router.post('/register', async (req, res) => {
    const { username, fullName, password } = parseRegistration(req.body);
    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    let row;
    try {
      // Self-registration always creates a regular user. Admins are provisioned directly in the database.
      ({ rows: [row] } = await pool.query(
        `INSERT INTO users (username, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'user') RETURNING id, username, full_name, role`,
        [username, passwordHash, fullName],
      ));
    } catch (err) {
      if (err.code === '23505') throw conflict('Korisničko ime je već zauzeto!');
      throw err;
    }
    const token = await sessions.create(row.id);
    res.status(201).json({ token, user: publicUser(row) });
  });

  router.post('/login', async (req, res) => {
    const username = String(req.body?.username ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const { rows } = await pool.query(
      'SELECT id, username, password_hash, full_name, role FROM users WHERE username = $1',
      [username],
    );
    const user = rows[0];
    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Netačno korisničko ime ili lozinka!');
    const token = await sessions.create(user.id);
    res.json({ token, user: publicUser(user) });
  });

  router.get('/me', requireUser, (req, res) => {
    res.json({ user: req.user });
  });

  router.post('/logout', requireUser, async (req, res) => {
    await sessions.destroy(req.token);
    res.status(204).end();
  });

  return router;
}
