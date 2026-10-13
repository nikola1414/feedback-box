function findAllIdeas() {
    return loadMemory(KEY_STORAGE.IDEJE) || [];
}

function addIdea(naslov, opis, kategorija) {
    const trenutniKorisnik = findCurUser();
    if (!trenutniKorisnik) {
        return { uspeh: false, poruka: "Morate biti prijavljeni da biste poslali ideju!" };
    }

    const ideje = findAllIdeas();
    const novId = genNextId(KEY_STORAGE.IDEJE, KEY_STORAGE.NAREDNI_IDEJA_ID);

    const novaIdeja = {
        id: novId,
        naslov: naslov.trim(),
        opis: opis.trim(),
        kategorija: kategorija,
        autorId: trenutniKorisnik.id,
        autorIme: trenutniKorisnik.imePrezime,
        datumKreiranja: new Date().toISOString(),
        status: "Čeka odobrenje",
        glasoviZa: [],
        glasoviProtiv: [],
        komentari: []
    };

    ideje.unshift(novaIdeja);
    saveMemory(KEY_STORAGE.IDEJE, ideje);
    return { uspeh: true, ideja: novaIdeja };
}

function editIdea(id, naslov, opis, kategorija) {
    const trenutniKorisnik = findCurUser();
    if (!trenutniKorisnik) return { uspeh: false, poruka: "Niste prijavljeni!" };

    const ideje = findAllIdeas();
    const indeks = ideje.findIndex(i => i.id === id);
    
    if (indeks === -1) return { uspeh: false, poruka: "Ideja nije pronađena!" };

    if (ideje[indeks].autorId !== trenutniKorisnik.id && trenutniKorisnik.uloga !== 'admin') {
        return { uspeh: false, poruka: "Nemate pravo da menjate tuđu ideju!" };
    }

    ideje[indeks].naslov = naslov.trim();
    ideje[indeks].opis = opis.trim();
    ideje[indeks].kategorija = kategorija;

    saveMemory(KEY_STORAGE.IDEJE, ideje);
    return { uspeh: true, ideja: ideje[indeks] };
}

function deleteIdea(id) {
    const trenutniKorisnik = findCurUser();
    if (!trenutniKorisnik) return { uspeh: false, poruka: "Niste prijavljeni!" };

    let ideje = findAllIdeas();
    const ideja = ideje.find(i => i.id === id);
    
    if (!ideja) return { uspeh: false, poruka: "Ideja ne postoji!" };

    if (ideja.autorId !== trenutniKorisnik.id && trenutniKorisnik.uloga !== 'admin') {
        return { uspeh: false, poruka: "Nemate pravo da obrišete ovu ideju!" };
    }

    ideje = ideje.filter(i => i.id !== id);
    saveMemory(KEY_STORAGE.IDEJE, ideje);
    return { uspeh: true };
}

function changeIdeaStatus(id, noviStatus) {
    if (!isAdmin()) {
        return { uspeh: false, poruka: "Samo administrator može menjati status projekta!" };
    }

    const ideje = findAllIdeas();
    const ideja = ideje.find(i => i.id === id);
    
    if (!ideja) return { uspeh: false, poruka: "Ideja ne postoji!" };

    ideja.status = noviStatus;
    saveMemory(KEY_STORAGE.IDEJE, ideje);
    return { uspeh: true, ideja };
}

function vote(idejaId, tipGlasa) { 
    const trenutniKorisnik = findCurUser();
    if (!trenutniKorisnik) {
        return { uspeh: false, poruka: "Morate biti prijavljeni da biste glasali!" };
    }

    const ideje = findAllIdeas();
    const ideja = ideje.find(i => i.id === idejaId);

    if (!ideja) return { uspeh: false, poruka: "Ideja ne postoji!" };

    if (ideja.status === "U procesu izrade" || ideja.status === "Implementirano" || ideja.status === "Odbijeno") {
        return { uspeh: false, poruka: "Glasanje je zaustavljeno za ovaj projekat!" };
    }

    const korIme = trenutniKorisnik.korisnickoIme;
    const vecGlasaoZa = ideja.glasoviZa.includes(korIme);
    const vecGlasaoProtiv = ideja.glasoviProtiv.includes(korIme);

    if (tipGlasa === 'za') {
        if (vecGlasaoZa) {
            ideja.glasoviZa = ideja.glasoviZa.filter(username => username !== korIme);
        } else {
            ideja.glasoviZa.push(korIme);
            ideja.glasoviProtiv = ideja.glasoviProtiv.filter(username => username !== korIme);
        }
    } else if (tipGlasa === 'protiv') {
        if (vecGlasaoProtiv) {
            ideja.glasoviProtiv = ideja.glasoviProtiv.filter(username => username !== korIme);
        } else {
            ideja.glasoviProtiv.push(korIme);
            ideja.glasoviZa = ideja.glasoviZa.filter(username => username !== korIme);
        }
    }

    saveMemory(KEY_STORAGE.IDEJE, ideje);
    return { uspeh: true, ideja };
}

function comment(idejaId, tekst) {
    const trenutniKorisnik = findCurUser();
    if (!trenutniKorisnik) {
        return { uspeh: false, poruka: "Morate biti prijavljeni da biste ostavili komentar!" };
    }

    if (!tekst.trim()) {
        return { uspeh: false, poruka: "Komentar ne može biti prazan!" };
    }

    const ideje = findAllIdeas();
    const ideja = ideje.find(i => i.id === idejaId);

    if (!ideja) return { uspeh: false, poruka: "Ideja ne postoji!" };

    const novKomentarId = ideja.komentari.length > 0 
        ? Math.max(...ideja.komentari.map(k => k.id)) + 1 
        : 0;

    const noviKomentar = {
        id: novKomentarId,
        autorIme: trenutniKorisnik.imePrezime,
        tekst: tekst.trim(),
        datum: new Date().toISOString()
    };

    ideja.komentari.push(noviKomentar);
    saveMemory(KEY_STORAGE.IDEJE, ideje);
    return { uspeh: true, komentar: noviKomentar };
}

function filter(kriterijumSort, statusFilter, kategorijaFilter, pretragaTekst) {
    let rez = findAllIdeas();

    if (pretragaTekst && pretragaTekst.trim() !== '') {
        const upit = pretragaTekst.toLowerCase().trim();
        rez = rez.filter(i => 
            i.naslov.toLowerCase().includes(upit) || 
            i.opis.toLowerCase().includes(upit)
        );
    }

    if (statusFilter && statusFilter !== 'sve') {
        rez = rez.filter(i => i.status === statusFilter);
    }

    if (kategorijaFilter && kategorijaFilter !== 'sve') {
        rez = rez.filter(i => i.kategorija === kategorijaFilter);
    }

    if (kriterijumSort === 'najnovije') {
        rez.sort((a, b) => new Date(b.datumKreiranja) - new Date(a.datumKreiranja));
    } else if (kriterijumSort === 'najstarije') {
        rez.sort((a, b) => new Date(a.datumKreiranja) - new Date(a.datumKreiranja));
    } else if (kriterijumSort === 'najpopularnije') {
        rez.sort((a, b) => {
            const netoA = a.glasoviZa.length - a.glasoviProtiv.length;
            const netoB = b.glasoviZa.length - b.glasoviProtiv.length;
            return netoB - netoA;
        });
    }

    return rez;
}
