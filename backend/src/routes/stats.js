import { Router } from 'express';

export function statsRoutes({ pool }) {
  const router = Router();

  router.get('/', async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT (SELECT count(*) FROM ideas)::int                                  AS total,
              (SELECT count(*) FROM ideas WHERE status = 'in_progress')::int      AS in_progress,
              (SELECT count(*) FROM ideas WHERE status = 'implemented')::int      AS implemented,
              (SELECT count(*) FROM votes)::int                                   AS votes`,
    );
    const byCategory = await pool.query('SELECT category, count(*)::int AS n FROM ideas GROUP BY category');
    const r = rows[0];
    res.json({
      total: r.total,
      inProgress: r.in_progress,
      implemented: r.implemented,
      votes: r.votes,
      byCategory: Object.fromEntries(byCategory.rows.map((c) => [c.category, c.n])),
    });
  });

  return router;
}
