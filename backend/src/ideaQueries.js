import { CATEGORIES, STATUSES } from './validate.js';

const SORTS = {
  newest: 'i.created_at DESC, i.id DESC',
  oldest: 'i.created_at ASC, i.id ASC',
  popular: 'score DESC, i.created_at DESC, i.id DESC',
};

/** Escapes LIKE wildcards so user input is matched literally. */
const likePattern = (q) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const toIdea = (r, comments = []) => ({
  id: Number(r.id),
  title: r.title,
  description: r.description,
  category: r.category,
  status: r.status,
  author: { id: Number(r.author_id), fullName: r.author_name },
  createdAt: r.created_at.toISOString(),
  upvotes: r.upvotes,
  downvotes: r.downvotes,
  myVote: r.my_vote === null ? null : r.my_vote === 1 ? 'up' : 'down',
  comments,
});

/**
 * Loads ideas together with vote counts, the caller's own vote and all comments,
 * using three queries regardless of how many ideas match.
 */
export async function findIdeas(db, { userId = null, id = null, status, category, q, sort = 'newest' } = {}) {
  const orderBy = SORTS[sort] ?? SORTS.newest;
  const params = [
    userId,
    id,
    STATUSES.includes(status) ? status : null,
    CATEGORIES.includes(category) ? category : null,
    typeof q === 'string' && q.trim() ? likePattern(q.trim()) : null,
  ];

  const { rows } = await db.query(
    `SELECT i.id, i.title, i.description, i.category, i.status, i.created_at,
            u.id AS author_id, u.full_name AS author_name,
            COUNT(v.user_id) FILTER (WHERE v.value = 1)::int  AS upvotes,
            COUNT(v.user_id) FILTER (WHERE v.value = -1)::int AS downvotes,
            COALESCE(SUM(v.value), 0)::int AS score,
            MAX(v.value) FILTER (WHERE v.user_id = $1::bigint) AS my_vote
       FROM ideas i
       JOIN users u ON u.id = i.author_id
       LEFT JOIN votes v ON v.idea_id = i.id
      WHERE ($2::bigint IS NULL OR i.id = $2::bigint)
        AND ($3::text IS NULL OR i.status = $3::text)
        AND ($4::text IS NULL OR i.category = $4::text)
        AND ($5::text IS NULL OR i.title ILIKE $5::text OR i.description ILIKE $5::text)
      GROUP BY i.id, u.id
      ORDER BY ${orderBy}`,
    params,
  );
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { rows: commentRows } = await db.query(
    `SELECT c.id, c.idea_id, c.text, c.created_at, u.full_name AS author_name
       FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.idea_id = ANY($1::bigint[])
      ORDER BY c.created_at, c.id`,
    [ids],
  );
  const byIdea = new Map();
  for (const c of commentRows) {
    const list = byIdea.get(String(c.idea_id)) ?? [];
    list.push({ id: Number(c.id), authorName: c.author_name, text: c.text, createdAt: c.created_at.toISOString() });
    byIdea.set(String(c.idea_id), list);
  }
  return rows.map((r) => toIdea(r, byIdea.get(String(r.id)) ?? []));
}
