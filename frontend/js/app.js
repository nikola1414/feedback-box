let aktivniKriterijumSort = 'najnovije';
let aktivniStatusFilter = 'sve';
let aktivnaKategorijaFilter = 'sve';
let pretragaTekst = '';

document.addEventListener('DOMContentLoaded', async () => {
    linkEL();
    await loadSession();
    await initApp();
});

async function initApp() {
    renderUI();
    await Promise.all([loadStats(), refreshCards()]);
    renderStats();
}

// Only the latest request may update the screen, so slow responses cannot overwrite newer ones.
let zahtevBroj = 0;

async function refreshCards() {
    const moj = ++zahtevBroj;
    const rez = await loadIdeas(
        aktivniKriterijumSort,
        aktivniStatusFilter,
        aktivnaKategorijaFilter,
        pretragaTekst
    );
    if (moj !== zahtevBroj) return;

    if (!rez.uspeh) {
        showNotif(rez.poruka, 'error');
        return;
    }
    renderIdeaCards(rez.ideje);
    refreshFilterInfo(rez.ideje.length);
}

async function refreshStats() {
    await loadStats();
    renderStats();
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

    formaPrijava.addEventListener('submit', async (e) => {
        e.preventDefault();
        const kIme = document.getElementById('prijava-korisnicko').value;
        const lozinka = document.getElementById('prijava-lozinka').value;

        const rez = await logIn(kIme, lozinka);
        if (rez.uspeh) {
            closeModal('modal-prijava');
            showNotif(`Dobrodošli nazad, ${rez.korisnik.imePrezime}!`, 'success');
            await initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    });

    formaReg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ime = document.getElementById('reg-ime').value;
        const kIme = document.getElementById('reg-korisnicko').value;
        const lozinka = document.getElementById('reg-lozinka').value;

        const rez = await register(ime, kIme, lozinka);
        if (rez.uspeh) {
            closeModal('modal-prijava');
            showNotif(`Uspešna registracija! Prijavljeni ste kao ${rez.korisnik.imePrezime}.`, 'success');
            await initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    });

    document.getElementById('user-actions-container').addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'btn-odjava') {
            await logOut();
            showNotif("Uspešno ste se odjavili.", 'info');
            await initApp();
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

    document.getElementById('forma-ideja').addEventListener('submit', async (e) => {
        e.preventDefault();
        const idejaId = document.getElementById('ideja-id').value;
        const naslov = document.getElementById('ideja-naslov-input').value;
        const kategorija = document.getElementById('ideja-kategorija').value;
        const opis = document.getElementById('ideja-opis').value;

        if (idejaId === "") {
            const rez = await addIdea(naslov, opis, kategorija);
            if (rez.uspeh) {
                closeModal('modal-ideja');
                showNotif("Vaša ideja je uspešno poslata!", 'success');
                await initApp();
            } else {
                showNotif(rez.poruka, 'error');
            }
        } else {
            const rez = await editIdea(parseInt(idejaId, 10), naslov, opis, kategorija);
            if (rez.uspeh) {
                closeModal('modal-ideja');
                showNotif("Ideja je uspešno izmenjena!", 'success');
                await initApp();
            } else {
                showNotif(rez.poruka, 'error');
            }
        }
    });

    document.getElementById('btn-zatvori-status').addEventListener('click', () => closeModal('modal-status'));
    document.getElementById('btn-otkani-status').addEventListener('click', () => closeModal('modal-status'));

    document.getElementById('forma-status').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('status-ideja-id').value, 10);
        const noviStatus = document.getElementById('status-select').value;

        const rez = await changeIdeaStatus(id, noviStatus);
        if (rez.uspeh) {
            closeModal('modal-status');
            showNotif(`Status projekta promijenjen u "${noviStatus}".`, 'success');
            await initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    });

    let pretragaTimer = null;
    document.getElementById('input-pretraga').addEventListener('input', (e) => {
        pretragaTekst = e.target.value;
        clearTimeout(pretragaTimer);
        pretragaTimer = setTimeout(refreshCards, 250);
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

window.handleVotes = async function(idejaId, tipGlasa) {
    const rez = await vote(idejaId, tipGlasa);
    if (rez.uspeh) {
        await Promise.all([refreshCards(), refreshStats()]);
    } else {
        showNotif(rez.poruka, 'warning');
        await refreshCards();
    }
};

window.handleComments = async function(event, idejaId) {
    event.preventDefault();
    const input = event.target.querySelector('.comment-input');
    const tekst = input.value;

    const rez = await comment(idejaId, tekst);
    if (rez.uspeh) {
        showNotif("Komentar je dodat!", 'success');
        await refreshCards();
    } else {
        showNotif(rez.poruka, 'error');
    }
};

window.openModalChanges = function(id) {
    const ideja = findAllIdeas().find(i => i.id === id);
    if (!ideja) return;

    document.getElementById('modal-ideja-naslov').textContent = "Izmeni ideju";
    document.getElementById('ideja-id').value = ideja.id;
    document.getElementById('ideja-naslov-input').value = ideja.naslov;
    document.getElementById('ideja-kategorija').value = ideja.kategorija;
    document.getElementById('ideja-opis').value = ideja.opis;

    openModal('modal-ideja');
};

window.openModalStatus = function(id) {
    const ideja = findAllIdeas().find(i => i.id === id);
    if (!ideja) return;

    document.getElementById('status-ideja-id').value = ideja.id;
    document.getElementById('status-modal-ideja-naslov').textContent = `Ideja: "${ideja.naslov}"`;
    document.getElementById('status-select').value = ideja.status;
    openModal('modal-status');
};

window.handelDeletion = async function(id) {
    if (confirm("Da li ste sigurni da želite da obrišete ovu ideju? Ova akcija je nepovratna.")) {
        const rez = await deleteIdea(id);
        if (rez.uspeh) {
            showNotif("Ideja je uspešno obrisana.", 'info');
            await initApp();
        } else {
            showNotif(rez.poruka, 'error');
        }
    }
};
