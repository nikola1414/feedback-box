const KEY_STORAGE = {
    IDEJE: 'ideje_db',
    KORISNICI: 'korisnici_db',
    TRENUTNI_KORISNIK: 'trenutni_korisnik_db',
    NAREDNI_IDEJA_ID: 'naredni_ideja_id_db',
    NAREDNI_KORISNIK_ID: 'naredni_korisnik_id_db'
};

const INIT_USERS = [
    {
        id: 0,
        korisnickoIme: "admin",
        lozinka: "admin123",
        imePrezime: "Marko Marković",
        uloga: "admin"
    },
    {
        id: 1,
        korisnickoIme: "petar",
        lozinka: "user123",
        imePrezime: "Petar Petrović",
        uloga: "user"
    },
    {
        id: 2,
        korisnickoIme: "ana",
        lozinka: "user123",
        imePrezime: "Ana Anić",
        uloga: "user"
    }
];

const INIT_IDEAS = [
    {
        id: 0,
        naslov: "Fleksibilno radno vreme i rad od kuće petkom",
        opis: "Predlažem da se uvede mogućnost fleksibilnog radnog vremena (dolazak od 08:00 do 10:00h) i obavezni rad od kuće petkom radi bolje produktivnosti i ravnoteže između posla i privatnog života.",
        kategorija: "HR & Benefiti",
        autorId: 1,
        autorIme: "Petar Petrović",
        datumKreiranja: "2026-06-25T09:30:00.000Z",
        status: "Čeka odobrenje",
        glasoviZa: ["petar", "ana"],
        glasoviProtiv: [],
        komentari: [
            {
                id: 0,
                autorIme: "Ana Anić",
                tekst: "Sjajna ideja! Rad petkom od kuće bi znatno smanjio stres u saobraćaju.",
                datum: "2026-06-25T10:15:00.000Z"
            }
        ]
    },
    {
        id: 1,
        naslov: "Besplatno voće i napitci u kuhinjama",
        opis: "Obezbeđivanje svežeg sezonskog voća, više vrsta čajeva i kvalitetnije kafe u kuhinjama na svim spratovima radi poboljšanja energije i zadovoljstva zaposlenih tokom radnog dana.",
        kategorija: "Radno okruženje",
        autorId: 2,
        autorIme: "Ana Anić",
        datumKreiranja: "2026-06-26T11:00:00.000Z",
        status: "U procesu izrade",
        glasoviZa: ["admin", "petar", "ana"],
        glasoviProtiv: [],
        komentari: [
            {
                id: 0,
                autorIme: "Marko Marković",
                tekst: "Ideja je prihvaćena i trenutno pregovaramo sa dobavljačima. Glasanje je zaustavljeno dok ne završimo nabavku.",
                datum: "2026-06-27T14:20:00.000Z"
            }
        ]
    },
    {
        id: 2,
        naslov: "Ergonomske podesive stolice i podizni stolovi",
        opis: "Zamena starih kancelarijskih stolica novim ergonomskim modelima sa podrškom za leđa i nabavka električnih podiznih stolova za zdravije držanje tela tokom dugotrajnog sedenja.",
        kategorija: "Radno okruženje",
        autorId: 0,
        autorIme: "Marko Marković",
        datumKreiranja: "2026-06-20T08:00:00.000Z",
        status: "Implementirano",
        glasoviZa: ["petar", "ana", "admin"],
        glasoviProtiv: [],
        komentari: [
            {
                id: 0,
                autorIme: "Petar Petrović",
                tekst: "Nove stolice su vrhunske, leđa me više uopšte ne bole!",
                datum: "2026-06-24T16:00:00.000Z"
            }
        ]
    },
    {
        id: 3,
        naslov: "Automatizacija nedeljnih izveštaja pomoću Python skripte",
        opis: "Razvoj unutrašnjeg alata koji bi automatski prikupljao statistiku i slao nedeljne izveštaje na email, čime bismo uštedeli preko 3 sata rada po zaposlenom svake nedelje.",
        kategorija: "Tehnologija",
        autorId: 1,
        autorIme: "Petar Petrović",
        datumKreiranja: "2026-06-28T13:45:00.000Z",
        status: "Čeka odobrenje",
        glasoviZa: ["petar"],
        glasoviProtiv: [],
        komentari: []
    }
];

function initStorage() {
    if (!localStorage.getItem(KEY_STORAGE.KORISNICI)) {
        localStorage.setItem(KEY_STORAGE.KORISNICI, JSON.stringify(INIT_USERS));
        localStorage.setItem(KEY_STORAGE.NAREDNI_KORISNIK_ID, "3");
    }
    if (!localStorage.getItem(KEY_STORAGE.IDEJE)) {
        localStorage.setItem(KEY_STORAGE.IDEJE, JSON.stringify(INIT_IDEAS));
        localStorage.setItem(KEY_STORAGE.NAREDNI_IDEJA_ID, "4");
    }
    if (!localStorage.getItem(KEY_STORAGE.TRENUTNI_KORISNIK)) {
        localStorage.setItem(KEY_STORAGE.TRENUTNI_KORISNIK, JSON.stringify(INIT_USERS[1]));
    }
}

function genNextId(dbKljuc, idKljuc) {
    let naredniId = parseInt(localStorage.getItem(idKljuc) || "0", 10);
    localStorage.setItem(idKljuc, (naredniId + 1).toString());
    return naredniId;
}

function loadMemory(kljuc) {
    try {
        const podaci = localStorage.getItem(kljuc);
        return podaci ? JSON.parse(podaci) : null;
    } catch (e) {
        return null;
    }
}

function saveMemory(kljuc, podaci) {
    try {
        localStorage.setItem(kljuc, JSON.stringify(podaci));
    } catch (e) {
    }
}

initStorage();