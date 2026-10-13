CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    full_name     TEXT        NOT NULL,
    role          TEXT        NOT NULL CHECK (role IN ('user', 'admin')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Login sessions. Only the SHA-256 hash of the bearer token is stored.
CREATE TABLE sessions (
    token_hash TEXT        PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE ideas (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title       TEXT        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
    description TEXT        NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
    category    TEXT        NOT NULL
        CHECK (category IN ('technology', 'hr_benefits', 'workplace', 'processes')),
    status      TEXT        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'implemented', 'rejected')),
    author_id   BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ideas_status   ON ideas (status);
CREATE INDEX idx_ideas_category ON ideas (category);
CREATE INDEX idx_ideas_author   ON ideas (author_id);

-- value: 1 = upvote, -1 = downvote. One vote per user per idea.
CREATE TABLE votes (
    idea_id BIGINT   NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    user_id BIGINT   NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    value   SMALLINT NOT NULL CHECK (value IN (-1, 1)),
    PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE comments (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    idea_id    BIGINT      NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    author_id  BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    text       TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_idea ON comments (idea_id);
