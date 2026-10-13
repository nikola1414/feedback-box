function findCurUser() {
    return state.user;
}

function isAdmin() {
    return !!state.user && state.user.uloga === 'admin';
}

async function logIn(korisnickoIme, lozinka) {
    const res = await apiRequest('POST', '/auth/login', {
        username: korisnickoIme,
        password: lozinka
    });
    if (!res.ok) return failure(res);

    setToken(res.data.token);
    state.user = fromApiUser(res.data.user);
    return { uspeh: true, korisnik: state.user };
}

async function logOut() {
    await apiRequest('POST', '/auth/logout');
    setToken(null);
    state.user = null;
}

async function register(imePrezime, korisnickoIme, lozinka) {
    const res = await apiRequest('POST', '/auth/register', {
        fullName: imePrezime,
        username: korisnickoIme,
        password: lozinka
    });
    if (!res.ok) return failure(res);

    setToken(res.data.token);
    state.user = fromApiUser(res.data.user);
    return { uspeh: true, korisnik: state.user };
}
