# Feedback Box

[![CI](https://github.com/nikola1414/feedback-box/actions/workflows/ci.yml/badge.svg)](https://github.com/nikola1414/feedback-box/actions/workflows/ci.yml)

An internal innovation portal where employees submit ideas, comment on them and vote. Administrators decide what happens to each proposal. The interface is in Serbian.

![Feedback Box dashboard signed in as an administrator](docs/screenshot.png)

The project is a full-stack application: a vanilla JavaScript client, a REST API built with Node.js and Express, and a PostgreSQL database with versioned SQL migrations.

## Features

- Registration, sign-in and sign-out with bcrypt-hashed passwords and expiring bearer-token sessions
- Role-based access: employees manage their own ideas, administrators manage every idea and decide its status
- Create, edit and delete ideas; comments on every idea
- One vote per user and idea: voting again withdraws the vote, voting the other way switches it
- Voting closes automatically once an idea is approved, implemented or rejected
- Sign-in is rate-limited: five failed attempts per user and client lock further attempts for 15 minutes
- Text search, category and status filters, and sorting by newest, oldest or most popular, all done in SQL
- Dashboard statistics served by the API

## Architecture

```text
frontend/   Static client (HTML, CSS, vanilla JS). Talks to the API through js/api.js
backend/    Express REST API, PostgreSQL access, migrations, seed data and API tests
e2e/        Playwright browser tests that run the real server against PostgreSQL
```

The API serves the static client too, so one process runs the whole application.

## Run locally

Requirements: Node.js 22 or newer and PostgreSQL 14 or newer (or Docker).

```bash
docker compose up -d            # PostgreSQL on localhost:5432 (skip if you run your own)
cd backend
npm install
cp .env.example .env            # optional, defaults match docker-compose.yml
npm start
```

Open [http://localhost:8080](http://localhost:8080). On the first start the server applies the migrations and, because the database is empty, inserts demo data.

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `admin123` |
| Employee | `petar` | `user123` |
| Employee | `ana` | `user123` |

Set `SEED_DEMO=false` to start with an empty database. These are demo credentials; change them before any real deployment.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://feedbackbox:feedbackbox@localhost:5432/feedbackbox` | PostgreSQL connection string |
| `PORT` | `8080` | HTTP port |
| `SEED_DEMO` | `true` | Insert demo users and ideas into an empty database |

## REST API

All routes are under `/api`. Authenticated routes expect `Authorization: Bearer <token>`. Errors are returned as `{ "error": "message" }`.

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create an employee account and sign in |
| POST | `/auth/login` | public | Sign in, returns a token |
| GET | `/auth/me` | signed in | Current user |
| POST | `/auth/logout` | signed in | End the session |
| GET | `/ideas` | public | List ideas. Query: `q`, `category`, `status`, `sort=newest\|oldest\|popular` |
| GET | `/ideas/:id` | public | One idea with comments |
| POST | `/ideas` | signed in | Create an idea |
| PUT | `/ideas/:id` | author or admin | Edit an idea |
| DELETE | `/ideas/:id` | author or admin | Delete an idea |
| PUT | `/ideas/:id/status` | admin | Set `pending`, `in_progress`, `implemented` or `rejected` |
| POST | `/ideas/:id/vote` | signed in | Body `{ "type": "up" \| "down" }` |
| POST | `/ideas/:id/comments` | signed in | Body `{ "text": "..." }` |
| GET | `/stats` | public | Totals and counts per category |

Example:

```bash
TOKEN=$(curl -s localhost:8080/api/auth/login -H 'content-type: application/json' \
  -d '{"username":"petar","password":"user123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -s localhost:8080/api/ideas -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"title":"Bike parking","description":"Safe racks by the entrance.","category":"workplace"}'
```

## Database

Migrations live in `backend/migrations` and are applied in filename order at start-up; applied files are recorded in `schema_migrations`. The schema has `users`, `sessions`, `ideas`, `votes` and `comments` tables with foreign keys, `CHECK` constraints for roles, categories, statuses and vote values, and a composite primary key on `votes (idea_id, user_id)` that enforces one vote per user.

## Security notes

- Passwords are hashed with bcrypt; session tokens are random 256-bit values and only their SHA-256 hash is stored.
- Self-registration always creates an employee. Administrators are provisioned directly in the database (`UPDATE users SET role = 'admin' WHERE username = '...'`).
- All SQL uses parameterised queries, and the client escapes user text before rendering it.
- Unknown usernames and wrong passwords return the same response, and the same amount of hashing work is done for both.
- Repeated failed sign-ins are rate-limited (in memory, per process).

## Tests

```bash
cd backend
npm run lint
npm test                        # 57 API tests against a real PostgreSQL database
```

The API tests use the database in `TEST_DATABASE_URL` (default `postgres://feedbackbox:feedbackbox@localhost:5432/feedbackbox_test`). Create it once with `createdb feedbackbox_test`.

```bash
cd e2e
npm install
npx playwright install chromium
npm test                        # 12 browser tests: sign-in, voting, comments, filters, admin flow, XSS escaping
```

GitHub Actions runs lint, the API tests and the browser tests against a PostgreSQL service on every push and pull request.

## Project structure

```text
.
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── api.js       # fetch wrapper, session token, label <-> API code mapping
│       ├── auth.js      # sign-in, registration, sign-out
│       ├── ideas.js     # ideas, votes, comments
│       ├── ui.js        # rendering
│       └── app.js       # events and orchestration
├── backend/
│   ├── migrations/      # SQL schema
│   ├── src/
│   │   ├── app.js       # Express app factory and error handling
│   │   ├── db.js        # pool and migration runner
│   │   ├── sessions.js  # token sessions and auth middleware
│   │   ├── validate.js  # request validation
│   │   ├── ideaQueries.js
│   │   ├── seed.js
│   │   └── routes/      # auth, ideas, stats
│   └── test/
├── e2e/                 # Playwright tests
└── docker-compose.yml   # local PostgreSQL
```

## Possible next steps

- Pagination for the idea list
- Email notifications when an idea's status changes
