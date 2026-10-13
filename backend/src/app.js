import express from 'express';
import { authRoutes } from './routes/auth.js';
import { ideaRoutes } from './routes/ideas.js';
import { statsRoutes } from './routes/stats.js';
import { HttpError } from './errors.js';
import { attachUser, createSessions } from './sessions.js';

/**
 * Builds the Express application. Routes are async; errors are forwarded to the
 * error handler below (Express 4 does not do this on its own, hence wrapAsync).
 */
export function createApp({ pool, staticDir, tokenTtlDays = 7, bcryptRounds = 10 }) {
  const app = express();
  const sessions = createSessions(pool, tokenTtlDays);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  const api = express.Router();
  api.use(attachUser(sessions));
  api.use('/auth', wrapRouter(authRoutes({ pool, sessions, bcryptRounds })));
  api.use('/ideas', wrapRouter(ideaRoutes({ pool })));
  api.use('/stats', wrapRouter(statsRoutes({ pool })));
  api.use((_req, _res, next) => next(new HttpError(404, 'Resurs nije pronađen.')));
  app.use('/api', api);

  if (staticDir) app.use(express.static(staticDir));

  app.use(errorHandler);
  return app;
}

/** Wraps every handler of a router so rejected promises reach the error handler. */
function wrapRouter(router) {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const l of layer.route.stack) {
      const fn = l.handle;
      if (fn.length <= 3) {
        l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
      }
    }
  }
  return router;
}

export { wrapRouter };

function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Neispravan JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Zahtev je prevelik.' });
  console.error(err);
  res.status(500).json({ error: 'Došlo je do greške na serveru.' });
}
