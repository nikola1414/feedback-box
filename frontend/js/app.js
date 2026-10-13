let aktivniKriterijumSort = 'najnovije';
let aktivniStatusFilter = 'sve';
let aktivnaKategorijaFilter = 'sve';
let pretragaTekst = '';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    linkEL();
});

function initApp() {
    renderUI();
    renderStats();
    refreshCards();
}

function refreshCards() {
    const filtriraneIdeje = filter(
        aktivniKriterijumSort, 
        aktivniStatusFilter, 
        aktivnaKategorijaFilter, 
        pretragaTekst
    );
    renderIdeaCards(filtriraneIdeje);
    refreshFilterInfo(filtriraneIdeje.length);
}

function refreshFilterInfo(brojPrikazanih) {
    const infoBar = document.getElementById('filter-info-bar');
    let poruka = `Prikazano <b>${brojPrikazanih}</b> ideja`;

    if (aktivnaKategorijaFilter !== 'sve') {
        poruka += ` u kategoriji <i>"${aktivnaKategorijaFilter}"</i>`;
    }
    if (aktivniStatusFilter !== 'sve') {
        poruka += ` sa statusom <i>"${aktivniStatusFilter}"</i>`;
    }
    if (pretragaTekst) {
        poruka += ` za pretragu <i>"${pretragaTekst}"</i>`;
    }

    infoBar.innerHTML = poruka;
}

function linkEL() {
    const btnOtvoriPrijavu = document.getElementById('btn-otvori-prijavu');
    if (btnOtvoriPrijavu) btnOtvoriPrijavu.addEventListener('click', () => openModal('modal-prijava'));

    document.getElementById('btn-zatvori-prijavu').addEventListener('click', () => closeModal('modal-prijava'));

    const tabPrijavaBtn = document.getElementById('tab-prijava-btn');
    const tabRegBtn = document.getElementById('tab-registracija-btn');
    const formaPrijava = document.getElementById('forma-prijava');
    const formaReg = document.getElementById('forma-registracija');

    tabPrijavaBtn.addEventListener('click', () => {
        tabPrijavaBtn.classList.add('active');
        tabRegBtn.classList.remove('active');
        formaPrijava.classList.remove('hidden');
        formaReg.classList.add('hidden');
    });

    tabRegBtn.addEventListener('click', () => {
        tabRegBtn.classList.add('active');
        tabPrijavaBtn.classList.remove('active');
        formaReg.classList.remove('hidden');
        formaPrijava.classList.add('hidden');
    });

    formaPrijava.addEventListener('submit', (e) => {
        e.preventDefault();
        const kIme = document.getElementById('prijava-korisnicko').value;
        const lozinka = document.getElementById('prijava-lozinka').value;

        const rez = logIn(kIme, lozinka);
        if (rez.uspeh) {
            closeModal('modal-prijava');
            showNotif(`Dobrodošli nazad, ${rez.korisnik.imePrezime}!`, 'success');
            initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    });

    formaReg.addEventListener('submit', (e) => {
        e.preventDefault();
        const ime = document.getElementById('reg-ime').value;
        const kIme = document.getElementById('reg-korisnicko').value;
        const lozinka = document.getElementById('reg-lozinka').value;
        const uloga = document.getElementById('reg-uloga').value;

        const rez = register(ime, kIme, lozinka, uloga);
        if (rez.uspeh) {
            closeModal('modal-prijava');
            showNotif(`Uspešna registracija! Prijavljeni ste kao ${rez.korisnik.imePrezime}.`, 'success');
            initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    });

    document.getElementById('user-actions-container').addEventListener('click', (e) => {
        if (e.target && e.target.id === 'btn-odjava') {
            logOut();
            showNotif("Uspešno ste se odjavili.", 'info');
            initApp();
        } else if (e.target && e.target.id === 'btn-otvori-prijavu') {
            openModal('modal-prijava');
        }
    });

    const btnNovaIdeja = document.getElementById('btn-otvori-novu-ideju');
    btnNovaIdeja.addEventListener('click', () => {
        const trenutniKorisnik = findCurUser();
        if (!trenutniKorisnik) {
            showNotif("Morate se prijaviti da biste predložili ideju!", 'warning');
            openModal('modal-prijava');
            return;
        }
        document.getElementById('modal-ideja-naslov').textContent = "Predloži novu ideju";
        document.getElementById('forma-ideja').reset();
        document.getElementById('ideja-id').value = "";
        openModal('modal-ideja');
    });

    document.getElementById('btn-zatvori-ideju').addEventListener('click', () => closeModal('modal-ideja'));
    document.getElementById('btn-otkani-ideju').addEventListener('click', () => closeModal('modal-ideja'));

    document.getElementById('forma-ideja').addEventListener('submit', (e) => {
        e.preventDefault();
        const idejaId = document.getElementById('ideja-id').value;
        const naslov = document.getElementById('ideja-naslov-input').value;
        const kategorija = document.getElementById('ideja-kategorija').value;
        const opis = document.getElementById('ideja-opis').value;

        if (idejaId === "") {
            const rez = addIdea(naslov, opis, kategorija);
            if (rez.uspeh) {
                closeModal('modal-ideja');
                showNotif("Vaša ideja je uspešno poslata!", 'success');
                initApp();
            } else {
                showNotif(rez.poruka, 'error');
            }
        } else {
            const rez = editIdea(parseInt(idejaId, 10), naslov, opis, kategorija);
            if (rez.uspeh) {
                closeModal('modal-ideja');
                showNotif("Ideja je uspešno izmenjena!", 'success');
                initApp();
            } else {
                showNotif(rez.poruka, 'error');
            }
        }
    });

    document.getElementById('btn-zatvori-status').addEventListener('click', () => closeModal('modal-status'));
    document.getElementById('btn-otkani-status').addEventListener('click', () => closeModal('modal-status'));

    document.getElementById('forma-status').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('status-ideja-id').value, 10);
        const noviStatus = document.getElementById('status-select').value;

        const rez = changeIdeaStatus(id, noviStatus);
        if (rez.uspeh) {
            closeModal('modal-status');
            showNotif(`Status projekta promijenjen u "${noviStatus}".`, 'success');
            initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    });

    document.getElementById('input-pretraga').addEventListener('input', (e) => {
        pretragaTekst = e.target.value;
        refreshCards();
    });

    document.getElementById('select-sort').addEventListener('change', (e) => {
        aktivniKriterijumSort = e.target.value;
        refreshCards();
    });

    document.getElementById('select-status-filter').addEventListener('change', (e) => {
        aktivniStatusFilter = e.target.value;
        refreshCards();
    });

    const kategorijeLista = document.getElementById('kategorije-lista');
    kategorijeLista.addEventListener('click', (e) => {
        const item = e.target.closest('.category-item');
        if (!item) return;

        document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        aktivnaKategorijaFilter = item.dataset.kategorija;
        refreshCards();
    });
}

window.handleVotes = function(idejaId, tipGlasa) {
    const rez = vote(idejaId, tipGlasa);
    if (rez.uspeh) {
        renderStats();
        refreshCards();
    } else {
        showNotif(rez.poruka, 'warning');
    }
};

window.handleComments = function(event, idejaId) {
    event.preventDefault();
    const input = event.target.querySelector('.comment-input');
    const tekst = input.value;

    const rez = comment(idejaId, tekst);
    if (rez.uspeh) {
        showNotif("Komentar je dodat!", 'success');
        renderStats();
        refreshCards();
    } else {
        showNotif(rez.poruka, 'error');
    }
};

window.openModalChanges = function(id) {
    const ideje = findAllIdeas();
    const ideja = ideje.find(i => i.id === id);
    if (!ideja) return;

    document.getElementById('modal-ideja-naslov').textContent = "Izmeni ideju";
    document.getElementById('ideja-id').value = ideja.id;
    document.getElementById('ideja-naslov-input').value = ideja.naslov;
    document.getElementById('ideja-kategorija').value = ideja.kategorija;
    document.getElementById('ideja-opis').value = ideja.opis;

    openModal('modal-ideja');
};

window.openModalStatus = function(id, naslov, trenutniStatus) {
    document.getElementById('status-ideja-id').value = id;
    document.getElementById('status-modal-ideja-naslov').textContent = `Ideja: "${naslov}"`;
    document.getElementById('status-select').value = trenutniStatus;
    openModal('modal-status');
};

window.handelDeletion = function(id) {
    if (confirm("Da li ste sigurni da želite da obrišete ovu ideju? Ova akcija je nepovratna.")) {
        const rez = deleteIdea(id);
        if (rez.uspeh) {
            showNotif("Ideja je uspešno obrisana.", 'info');
            initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    }
};
