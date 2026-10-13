import bcrypt from 'bcryptjs';

const USERS = [
  { username: 'admin', password: 'admin123', fullName: 'Marko Marković', role: 'admin' },
  { username: 'petar', password: 'user123', fullName: 'Petar Petrović', role: 'user' },
  { username: 'ana', password: 'user123', fullName: 'Ana Anić', role: 'user' },
];

const IDEAS = [
  {
    title: 'Fleksibilno radno vreme i rad od kuće petkom',
    description:
      'Predlažem da se uvede mogućnost fleksibilnog radnog vremena (dolazak od 08:00 do 10:00h) i obavezni rad od kuće petkom radi bolje produktivnosti i ravnoteže između posla i privatnog života.',
    category: 'hr_benefits',
    status: 'pending',
    author: 'petar',
    createdAt: '2026-06-25T09:30:00Z',
    up: ['petar', 'ana'],
    comments: [
      { author: 'ana', text: 'Sjajna ideja! Rad petkom od kuće bi znatno smanjio stres u saobraćaju.', at: '2026-06-25T10:15:00Z' },
    ],
  },
  {
    title: 'Besplatno voće i napitci u kuhinjama',
    description:
      'Obezbeđivanje svežeg sezonskog voća, više vrsta čajeva i kvalitetnije kafe u kuhinjama na svim spratovima radi poboljšanja energije i zadovoljstva zaposlenih tokom radnog dana.',
    category: 'workplace',
    status: 'in_progress',
    author: 'ana',
    createdAt: '2026-06-26T11:00:00Z',
    up: ['admin', 'petar', 'ana'],
    comments: [
      {
        author: 'admin',
        text: 'Ideja je prihvaćena i trenutno pregovaramo sa dobavljačima. Glasanje je zaustavljeno dok ne završimo nabavku.',
        at: '2026-06-27T14:20:00Z',
      },
    ],
  },
  {
    title: 'Ergonomske podesive stolice i podizni stolovi',
    description:
      'Zamena starih kancelarijskih stolica novim ergonomskim modelima sa podrškom za leđa i nabavka električnih podiznih stolova za zdravije držanje tela tokom dugotrajnog sedenja.',
    category: 'workplace',
    status: 'implemented',
    author: 'admin',
    createdAt: '2026-06-20T08:00:00Z',
    up: ['petar', 'ana', 'admin'],
    comments: [{ author: 'petar', text: 'Nove stolice su vrhunske, leđa me više uopšte ne bole!', at: '2026-06-24T16:00:00Z' }],
  },
  {
    title: 'Automatizacija nedeljnih izveštaja pomoću Python skripte',
    description:
      'Razvoj unutrašnjeg alata koji bi automatski prikupljao statistiku i slao nedeljne izveštaje na email, čime bismo uštedeli preko 3 sata rada po zaposlenom svake nedelje.',
    category: 'technology',
    status: 'pending',
    author: 'petar',
    createdAt: '2026-06-28T13:45:00Z',
    up: ['petar'],
    comments: [],
  },
];

/** Inserts the demo users and ideas, but only into an empty database. Returns true if it seeded. */
export async function seedDemo(pool, { bcryptRounds = 10 } = {}) {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  if (rows[0].n > 0) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = {};
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, bcryptRounds);
      const res = await client.query(
        'INSERT INTO users (username, password_hash, full_name, role) VALUES ($1,$2,$3,$4) RETURNING id',
        [u.username, hash, u.fullName, u.role],
      );
      ids[u.username] = res.rows[0].id;
    }
    for (const i of IDEAS) {
      const res = await client.query(
        `INSERT INTO ideas (title, description, category, status, author_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id`,
        [i.title, i.description, i.category, i.status, ids[i.author], i.createdAt],
      );
      const ideaId = res.rows[0].id;
      for (const voter of i.up) {
        await client.query('INSERT INTO votes (idea_id, user_id, value) VALUES ($1,$2,1)', [ideaId, ids[voter]]);
      }
      for (const c of i.comments) {
        await client.query('INSERT INTO comments (idea_id, author_id, text, created_at) VALUES ($1,$2,$3,$4)', [
          ideaId,
          ids[c.author],
          c.text,
          c.at,
        ]);
      }
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
