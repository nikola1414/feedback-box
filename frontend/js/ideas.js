function findAllIdeas() {
    return state.ideas;
}

/** Fetches the ideas that match the active filters from the server into the cache. */
async function loadIdeas(kriterijumSort, statusFilter, kategorijaFilter, pretragaTekst) {
    const params = new URLSearchParams();
    params.set('sort', SORT_CODES[kriterijumSort] || 'newest');

    const status = statusFilter && statusFilter !== 'sve' ? codeFor(STATUS_LABELS, statusFilter) : null;
    const kategorija = kategorijaFilter && kategorijaFilter !== 'sve' ? codeFor(CATEGORY_LABELS, kategorijaFilter) : null;
    if (status) params.set('status', status);
    if (kategorija) params.set('category', kategorija);
    if (pretragaTekst && pretragaTekst.trim()) params.set('q', pretragaTekst.trim());

    const res = await apiRequest('GET', `/ideas?${params}`);
    if (!res.ok) return failure(res);

    state.ideas = res.data.map(fromApiIdea);
    return { uspeh: true, ideje: state.ideas };
}

function ideaPayload(naslov, opis, kategorija) {
    return {
        title: naslov,
        description: opis,
        category: codeFor(CATEGORY_LABELS, kategorija)
    };
}

async function addIdea(naslov, opis, kategorija) {
    if (!findCurUser()) {
        return { uspeh: false, poruka: "Morate biti prijavljeni da biste poslali ideju!" };
    }
    const res = await apiRequest('POST', '/ideas', ideaPayload(naslov, opis, kategorija));
    return res.ok ? { uspeh: true, ideja: fromApiIdea(res.data) } : failure(res);
}

async function editIdea(id, naslov, opis, kategorija) {
    const res = await apiRequest('PUT', `/ideas/${id}`, ideaPayload(naslov, opis, kategorija));
    return res.ok ? { uspeh: true, ideja: fromApiIdea(res.data) } : failure(res);
}

async function deleteIdea(id) {
    const res = await apiRequest('DELETE', `/ideas/${id}`);
    return res.ok ? { uspeh: true } : failure(res);
}

async function changeIdeaStatus(id, noviStatus) {
    const res = await apiRequest('PUT', `/ideas/${id}/status`, { status: codeFor(STATUS_LABELS, noviStatus) });
    return res.ok ? { uspeh: true, ideja: fromApiIdea(res.data) } : failure(res);
}

async function vote(idejaId, tipGlasa) {
    if (!findCurUser()) {
        return { uspeh: false, poruka: "Morate biti prijavljeni da biste glasali!" };
    }
    const res = await apiRequest('POST', `/ideas/${idejaId}/vote`, { type: tipGlasa === 'za' ? 'up' : 'down' });
    return res.ok ? { uspeh: true, ideja: fromApiIdea(res.data) } : failure(res);
}

async function comment(idejaId, tekst) {
    if (!findCurUser()) {
        return { uspeh: false, poruka: "Morate biti prijavljeni da biste ostavili komentar!" };
    }
    if (!tekst.trim()) {
        return { uspeh: false, poruka: "Komentar ne može biti prazan!" };
    }
    const res = await apiRequest('POST', `/ideas/${idejaId}/comments`, { text: tekst });
    return res.ok ? { uspeh: true, komentar: res.data } : failure(res);
}
