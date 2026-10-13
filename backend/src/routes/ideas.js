import { Router } from 'express';
import { findIdeas } from '../ideaQueries.js';
import { conflict, forbidden, notFound } from '../errors.js';
import { requireUser } from '../sessions.js';
import { parseId, parseIdea, parseVote } from '../validate.js';

export function ideaRoutes({ pool }) {
  const router = Router();

  /** Loads an idea row or throws 404. */
  async function loadIdea(id) {
    const { rows } = await pool.query('SELECT id, author_id, status FROM ideas WHERE id = $1', [id]);
    if (rows.length === 0) throw notFound('Ideja ne postoji!');
    return { id: Number(rows[0].id), authorId: Number(rows[0].author_id), status: rows[0].status };
  }

  const canModify = (user, idea) => user.role === 'admin' || user.id === idea.authorId;

  router.get('/', async (req, res) => {
    const { status, category, q, sort } = req.query;
    res.json(await findIdeas(pool, { userId: req.user?.id ?? null, status, category, q, sort }));
  });

  router.get('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    const [idea] = await findIdeas(pool, { userId: req.user?.id ?? null, id });
    if (!idea) throw notFound('Ideja ne postoji!');
    res.json(idea);
  });

  router.post('/', requireUser, async (req, res) => {
    const { title, description, category } = parseIdea(req.body);
    const { rows } = await pool.query(
      'INSERT INTO ideas (title, description, category, author_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, description, category, req.user.id],
    );
    const [idea] = await findIdeas(pool, { userId: req.user.id, id: rows[0].id });
    res.status(201).json(idea);
  });

  router.put('/:id', requireUser, async (req, res) => {
    const existing = await loadIdea(parseId(req.params.id));
    if (!canModify(req.user, existing)) throw forbidden('Nemate pravo da menjate tuđu ideju!');
    const { title, description, category } = parseIdea(req.body);
    await pool.query(
      'UPDATE ideas SET title = $1, description = $2, category = $3, updated_at = now() WHERE id = $4',
      [title, description, category, existing.id],
    );
    const [idea] = await findIdeas(pool, { userId: req.user.id, id: existing.id });
    res.json(idea);
  });

  router.delete('/:id', requireUser, async (req, res) => {
    const existing = await loadIdea(parseId(req.params.id));
    if (!canModify(req.user, existing)) throw forbidden('Nemate pravo da obrišete ovu ideju!');
    await pool.query('DELETE FROM ideas WHERE id = $1', [existing.id]);
    res.status(204).end();
  });

  /**
   * Casting the same vote again withdraws it; casting the opposite vote switches it.
   * Voting is only open while the idea is still pending.
   */
  router.post('/:id/vote', requireUser, async (req, res) => {
    const existing = await loadIdea(parseId(req.params.id));
    const value = parseVote(req.body);
    if (existing.status !== 'pending') throw conflict('Glasanje je zaustavljeno za ovaj projekat!');

    const withdrawn = await pool.query('DELETE FROM votes WHERE idea_id = $1 AND user_id = $2 AND value = $3', [
      existing.id,
      req.user.id,
      value,
    ]);
    if (withdrawn.rowCount === 0) {
      await pool.query(
        `INSERT INTO votes (idea_id, user_id, value) VALUES ($1, $2, $3)
         ON CONFLICT (idea_id, user_id) DO UPDATE SET value = EXCLUDED.value`,
        [existing.id, req.user.id, value],
      );
    }
    const [idea] = await findIdeas(pool, { userId: req.user.id, id: existing.id });
    res.json(idea);
  });

  return router;
}
