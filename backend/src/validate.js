import { badRequest } from './errors.js';

export const CATEGORIES = ['technology', 'hr_benefits', 'workplace', 'processes'];
export const STATUSES = ['pending', 'in_progress', 'implemented', 'rejected'];

const USERNAME_RE = /^[a-z0-9_.-]{3,30}$/;

function text(value, field, { min = 1, max }) {
  if (typeof value !== 'string') throw badRequest(`Polje „${field}“ je obavezno.`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw badRequest(`Polje „${field}“ je obavezno.`);
  if (trimmed.length > max) throw badRequest(`Polje „${field}“ može imati najviše ${max} karaktera.`);
  return trimmed;
}

export function parseRegistration(body = {}) {
  const username = text(body.username, 'korisničko ime', { max: 30 }).toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw badRequest('Korisničko ime može imati 3-30 karaktera: slova, brojeve, tačku, crtu i donju crtu.');
  }
  const fullName = text(body.fullName, 'ime i prezime', { max: 100 });
  if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 72) {
    throw badRequest('Lozinka mora imati između 6 i 72 karaktera.');
  }
  return { username, fullName, password: body.password };
}

export function parseIdea(body = {}) {
  const title = text(body.title, 'naslov', { max: 120 });
  const description = text(body.description, 'opis', { max: 2000 });
  if (!CATEGORIES.includes(body.category)) throw badRequest('Nepoznata kategorija.');
  return { title, description, category: body.category };
}

export function parseStatus(body = {}) {
  if (!STATUSES.includes(body.status)) throw badRequest('Nepoznat status.');
  return body.status;
}

export function parseVote(body = {}) {
  if (body.type !== 'up' && body.type !== 'down') throw badRequest('Tip glasa mora biti „up“ ili „down“.');
  return body.type === 'up' ? 1 : -1;
}

export function parseComment(body = {}) {
  return text(body.text, 'komentar', { max: 1000 });
}

export function parseId(raw) {
  if (!/^\d{1,15}$/.test(String(raw))) throw badRequest('Neispravan identifikator.');
  return Number(raw);
}
