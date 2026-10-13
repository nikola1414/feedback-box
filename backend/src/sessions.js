import { createHash, randomBytes } from 'node:crypto';
import { forbidden, unauthorized } from './errors.js';

const hash = (token) => createHash('sha256').update(token).digest('hex');

export function createSessions(pool, ttlDays = 7) {
  return {
    async create(userId) {
      const token = randomBytes(32).toString('hex');
      await pool.query(
        `INSERT INTO sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(days => $3))`,
        [hash(token), userId, ttlDays],
      );
      return token;
    },

    async destroy(token) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hash(token)]);
    },

    /** Resolves the user behind a bearer token, or null if it is missing, unknown or expired. */
    async userFor(token) {
      if (!token) return null;
      const { rows } = await pool.query(
        `SELECT u.id, u.username, u.full_name, u.role
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [hash(token)],
      );
      if (rows.length === 0) return null;
      const u = rows[0];
      return { id: Number(u.id), username: u.username, fullName: u.full_name, role: u.role };
    },
  };
}

export function bearerToken(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/** Populates req.user (or null) from the Authorization header. */
export function attachUser(sessions) {
  return async (req, _res, next) => {
    try {
      req.token = bearerToken(req);
      req.user = await sessions.userFor(req.token);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireUser(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'admin') return next(forbidden('Samo administrator može da izvrši ovu akciju.'));
  next();
}
