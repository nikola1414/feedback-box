function formatDate(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleDateString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderUI() {
    const trenutniKorisnik = findCurUser();
    const headerContainer = document.getElementById('user-actions-container');
    const sidebarUserCard = document.getElementById('sidebar-user-card');

    if (trenutniKorisnik) {
        headerContainer.innerHTML = `
            <div class="user-badge-header">
                <div class="user-avatar-small">${trenutniKorisnik.imePrezime.charAt(0).toUpperCase()}</div>
                <div class="user-info-small">
                    <span class="user-name-small">${trenutniKorisnik.imePrezime}</span>
                    <span class="user-role-small">${trenutniKorisnik.uloga === 'admin' ? 'Administrator' : 'Zaposleni'}</span>
                </div>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-odjava">Odjavi se</button>
        `;

        sidebarUserCard.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.8rem;">
                <div class="user-avatar-small" style="width: 42px; height: 42px; font-size: 1.2rem;">
                    ${trenutniKorisnik.imePrezime.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${trenutniKorisnik.imePrezime}</h4>
                    <span style="font-size: 0.8rem; color: var(--primary); font-weight: 500;">
                        ${trenutniKorisnik.uloga === 'admin' ? 'Administrator' : 'Zaposleni'}
                    </span>
                </div>
            </div>
        `;
    } else {
        headerContainer.innerHTML = `
            <button class="btn btn-primary btn-sm" id="btn-otvori-prijavu" onclick="openModal('modal-prijava')">Prijava / Registracija</button>
        `;

        sidebarUserCard.innerHTML = `
            <div style="text-align: center; padding: 0.5rem;">
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Niste prijavljeni na portal.</p>
                <button class="btn btn-secondary btn-sm btn-block" onclick="openModal('modal-prijava')">Prijavi se</button>
            </div>
        `;
    }
}

function renderStats() {
    const ideje = findAllIdeas();
    
    const ukupno = ideje.length;
    const uProcesu = ideje.filter(i => i.status === "U procesu izrade").length;
    const implementirano = ideje.filter(i => i.status === "Implementirano").length;
    
    let ukupnoGlasova = 0;
    ideje.forEach(i => {
        ukupnoGlasova += (i.glasoviZa ? i.glasoviZa.length : 0) + (i.glasoviProtiv ? i.glasoviProtiv.length : 0);
    });

    document.getElementById('stat-ukupno').textContent = ukupno;
    document.getElementById('stat-u-procesu').textContent = uProcesu;
    document.getElementById('stat-implementirano').textContent = implementirano;
    document.getElementById('stat-glasovi').textContent = ukupnoGlasova;

    document.getElementById('kat-count-sve').textContent = ukupno;
    document.getElementById('kat-count-tehnologija').textContent = ideje.filter(i => i.kategorija === "Tehnologija").length;
    document.getElementById('kat-count-hr').textContent = ideje.filter(i => i.kategorija === "HR & Benefiti").length;
    document.getElementById('kat-count-okruzenje').textContent = ideje.filter(i => i.kategorija === "Radno okruženje").length;
    document.getElementById('kat-count-procesi').textContent = ideje.filter(i => i.kategorija === "Procesi & Organizacija").length;
}

function findStatus(status) {
    switch (status) {
        case "Čeka odobrenje": return "status-ceka";
        case "U procesu izrade": return "status-u-procesu";
        case "Implementirano": return "status-implementirano";
        case "Odbijeno": return "status-odbijeno";
        default: return "status-ceka";
    }
}

function renderIdeaCards(ideje) {
    const kontejner = document.getElementById('ideje-kontejner');
    kontejner.innerHTML = '';

    if (ideje.length === 0) {
        kontejner.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background-color: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                <h3 style="color: var(--text-primary); font-size: 1.2rem; margin-bottom: 0.5rem;">Nema pronađenih ideja</h3>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Pokušajte sa drugim kriterijumima pretrage ili predložite novu ideju.</p>
            </div>
        `;
        return;
    }

    const trenutniKorisnik = findCurUser();
    const korIme = trenutniKorisnik ? trenutniKorisnik.korisnickoIme : null;

    ideje.forEach(ideja => {
        const kartica = document.createElement('div');
        kartica.className = 'idea-card';
        kartica.dataset.id = ideja.id;

        const netoGlasovi = ideja.glasoviZa.length - ideja.glasoviProtiv.length;
        const vecGlasaoZa = korIme && ideja.glasoviZa.includes(korIme);
        const vecGlasaoProtiv = korIme && ideja.glasoviProtiv.includes(korIme);
        
        const jeZaustavljeno = ideja.status === "U procesu izrade" || ideja.status === "Implementirano" || ideja.status === "Odbijeno";
        const glasanjeOnemoguceno = jeZaustavljeno || !trenutniKorisnik;
        const glasanjePoruka = jeZaustavljeno ? `Glasanje je zaustavljeno (${ideja.status})` : "Prijavite se za glasanje";

        const mozaEditovati = trenutniKorisnik && (trenutniKorisnik.uloga === 'admin' || trenutniKorisnik.id === ideja.autorId);
        const mozaBrisati = trenutniKorisnik && (trenutniKorisnik.uloga === 'admin' || trenutniKorisnik.id === ideja.autorId);
        const jeAdminKorisnik = isAdmin();

        kartica.innerHTML = `
            <div class="idea-header">
                <span class="category-tag">${ideja.kategorija}</span>
                <span class="status-badge ${findStatus(ideja.status)}">
                    ${ideja.status}
                </span>
            </div>

            <h3 class="idea-title">${pobegniHtml(ideja.naslov)}</h3>
            <p class="idea-description">${pobegniHtml(ideja.opis)}</p>

            <div class="idea-meta">
                <span>Autor: ${pobegniHtml(ideja.autorIme)}</span>
                <span>Datum: ${formatDate(ideja.datumKreiranja)}</span>
            </div>

            <div class="idea-actions-bar">
                <div class="voting-container">
                    <button class="btn-vote ${vecGlasaoZa ? 'voted-za' : ''}" 
                            onclick="handleVotes(${ideja.id}, 'za')" 
                            ${glasanjeOnemoguceno ? `disabled title="${glasanjePoruka}"` : ''}>
                        Like ${ideja.glasoviZa.length}
                    </button>
                    
                    <span class="net-votes-badge ${netoGlasovi > 0 ? 'text-green' : (netoGlasovi < 0 ? 'text-red' : '')}">
                        ${netoGlasovi > 0 ? '+' + netoGlasovi : netoGlasovi}
                    </span>

                    <button class="btn-vote ${vecGlasaoProtiv ? 'voted-protiv' : ''}" 
                            onclick="handleVotes(${ideja.id}, 'protiv')" 
                            ${glasanjeOnemoguceno ? `disabled title="${glasanjePoruka}"` : ''}>
                        Dislike ${ideja.glasoviProtiv.length}
                    </button>
                </div>

                <div class="admin-card-actions">
                    ${jeAdminKorisnik ? `
                        <button class="btn-icon-action" onclick="openModalStatus(${ideja.id}, '${pobegniHtml(ideja.naslov)}', '${ideja.status}')" title="Promeni status projekta">
                            Status
                        </button>
                    ` : ''}
                    ${mozaEditovati ? `
                        <button class="btn-icon-action" onclick="openModalChanges(${ideja.id})" title="Izmeni ideju">
                            Izmeni
                        </button>
                    ` : ''}
                    ${mozaBrisati ? `
                        <button class="btn-icon-action delete" onclick="handelDeletion(${ideja.id})" title="Obriši ideju">
                            Obriši
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="comments-section">
                <button class="comments-toggle-btn" onclick="toggleComments(this)">
                    Komentari (${ideja.komentari ? ideja.komentari.length : 0}) v
                </button>
                <div class="comments-container hidden">
                    <div class="comments-list">
                        ${ideja.komentari && ideja.komentari.length > 0 ? ideja.komentari.map(k => `
                            <div class="comment-item">
                                <div class="comment-header">
                                    <span class="comment-author">${pobegniHtml(k.autorIme)}</span>
                                    <span>${formatDate(k.datum)}</span>
                                </div>
                                <div class="comment-text">${pobegniHtml(k.tekst)}</div>
                            </div>
                        `).join('') : '<p style="font-size: 0.8rem; color: var(--text-muted); padding: 0.4rem 0;">Nema komentara. Budi prvi koji će ostaviti komentar!</p>'}
                    </div>

                    ${trenutniKorisnik ? `
                        <form class="comment-form" onsubmit="handleComments(event, ${ideja.id})">
                            <input type="text" class="comment-input" placeholder="Napišite komentar..." required>
                            <button type="submit" class="btn btn-primary btn-sm">Pošalji</button>
                        </form>
                    ` : `
                        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.5rem;">Prijavite se da biste ostavili komentar.</p>
                    `}
                </div>
            </div>
        `;

        kontejner.appendChild(kartica);
    });
}

function pobegniHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function toggleComments(btn) {
    const container = btn.nextElementSibling;
    container.classList.toggle('hidden');
    if (container.classList.contains('hidden')) {
        btn.textContent = btn.textContent.replace('^', 'v');
    } else {
        btn.textContent = btn.textContent.replace('v', '^');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function showNotif(poruka, tip = 'info') {
    const kontejner = document.getElementById('toast-kontejner');
    const toast = document.createElement('div');
    toast.className = `toast ${tip}`;
    
    toast.innerHTML = `<span>${poruka}</span>`;
    kontejner.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
