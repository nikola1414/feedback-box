// Thin client for the Feedback Box REST API. The UI keeps working with Serbian labels,
// so this module translates between API codes (e.g. "in_progress") and display labels.

const TOKEN_KEY = 'feedbackbox_token';

const STATUS_LABELS = {
    pending: 'Čeka odobrenje',
    in_progress: 'U procesu izrade',
    implemented: 'Implementirano',
    rejected: 'Odbijeno'
};

const CATEGORY_LABELS = {
    technology: 'Tehnologija',
    hr_benefits: 'HR & Benefiti',
    workplace: 'Radno okruženje',
    processes: 'Procesi & Organizacija'
};

const SORT_CODES = {
    najnovije: 'newest',
    najstarije: 'oldest',
    najpopularnije: 'popular'
};

// Everything the UI renders comes from this in-memory cache.
const state = {
    user: null,
    ideas: [],
    stats: null
};

function codeFor(labels, label) {
    return Object.keys(labels).find(code => labels[code] === label) || null;
}

function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
        return null;
    }
}

function setToken(token) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
        // Storage can be unavailable (private mode); the session then lasts until reload.
    }
}

/** Sends a JSON request. Never throws: network problems become { ok: false }. */
async function apiRequest(method, path, body) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    try {
        const res = await fetch(`/api${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (res.status === 401 && token && path !== '/auth/login') {
            // The saved session expired or was revoked.
            setToken(null);
            state.user = null;
        }
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        return { ok: false, status: 0, data: { error: 'Server nije dostupan. Pokušajte ponovo.' } };
    }
}

function failure(res) {
    return { uspeh: false, poruka: (res.data && res.data.error) || 'Došlo je do greške.' };
}

function fromApiUser(u) {
    return {
        id: u.id,
        korisnickoIme: u.username,
        imePrezime: u.fullName,
        uloga: u.role
    };
}

function fromApiIdea(i) {
    return {
        id: i.id,
        naslov: i.title,
        opis: i.description,
        kategorija: CATEGORY_LABELS[i.category] || i.category,
        status: STATUS_LABELS[i.status] || i.status,
        autorId: i.author.id,
        autorIme: i.author.fullName,
        datumKreiranja: i.createdAt,
        glasoviZa: i.upvotes,
        glasoviProtiv: i.downvotes,
        mojGlas: i.myVote,
        komentari: i.comments.map(c => ({
            id: c.id,
            autorIme: c.authorName,
            tekst: c.text,
            datum: c.createdAt
        }))
    };
}

/** Restores the signed-in user from a saved token, if there is one. */
async function loadSession() {
    state.user = null;
    if (!getToken()) return;
    const res = await apiRequest('GET', '/auth/me');
    if (res.ok) state.user = fromApiUser(res.data.user);
    else if (res.status === 401) setToken(null);
}

async function loadStats() {
    const res = await apiRequest('GET', '/stats');
    if (res.ok) state.stats = res.data;
}
