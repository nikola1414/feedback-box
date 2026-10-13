function findCurUser() {
    return loadMemory(KEY_STORAGE.TRENUTNI_KORISNIK);
}

function isAdmin() {
    const korisnik = findCurUser();
    return korisnik && korisnik.uloga === 'admin';
}

function logIn(korisnickoIme, lozinka) {
    const korisnici = loadMemory(KEY_STORAGE.KORISNICI) || [];
    const pronadjen = korisnici.find(k => 
        k.korisnickoIme.toLowerCase() === korisnickoIme.trim().toLowerCase() && 
        k.lozinka === lozinka
    );

    if (pronadjen) {
        saveMemory(KEY_STORAGE.TRENUTNI_KORISNIK, pronadjen);
        return { uspeh: true, korisnik: pronadjen };
    }
    return { uspeh: false, poruka: "Netačno korisničko ime ili lozinka!" };
}

function logOut() {
    localStorage.removeItem(KEY_STORAGE.TRENUTNI_KORISNIK);
}

function register(imePrezime, korisnickoIme, lozinka, uloga) {
    const korisnici = loadMemory(KEY_STORAGE.KORISNICI) || [];
    
    const postoji = korisnici.find(k => k.korisnickoIme.toLowerCase() === korisnickoIme.trim().toLowerCase());
    if (postoji) {
        return { uspeh: false, poruka: "Korisničko ime je već zauzeto!" };
    }

    const novId = genNextId(KEY_STORAGE.KORISNICI, KEY_STORAGE.NAREDNI_KORISNIK_ID);
    const noviKorisnik = {
        id: novId,
        korisnickoIme: korisnickoIme.trim(),
        lozinka: lozinka,
        imePrezime: imePrezime.trim(),
        uloga: uloga || 'user'
    };

    korisnici.push(noviKorisnik);
    saveMemory(KEY_STORAGE.KORISNICI, korisnici);
    saveMemory(KEY_STORAGE.TRENUTNI_KORISNIK, noviKorisnik);

    return { uspeh: true, korisnik: noviKorisnik };
}
