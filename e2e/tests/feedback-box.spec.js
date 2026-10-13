import { expect, test } from '@playwright/test';

async function signIn(page, username, password) {
  await page.goto('/');
  await page.locator('#user-actions-container').getByRole('button', { name: /Prijava/ }).click();
  await page.fill('#prijava-korisnicko', username);
  await page.fill('#prijava-lozinka', password);
  await page.locator('#forma-prijava button[type="submit"]').click();
  await expect(page.locator('#btn-odjava')).toBeVisible();
}

const card = (page, title) => page.locator('.idea-card', { hasText: title });

test('shows the seeded ideas and statistics to anonymous visitors', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.idea-card')).toHaveCount(4);
  await expect(page.locator('#stat-ukupno')).toHaveText('4');
  await expect(page.locator('#stat-u-procesu')).toHaveText('1');
  await expect(page.locator('#stat-implementirano')).toHaveText('1');
  await expect(page.locator('#kat-count-okruzenje')).toHaveText('2');
  // Voting is disabled until you sign in.
  await expect(card(page, 'Fleksibilno').locator('.btn-vote').first()).toBeDisabled();
});

test('rejects wrong credentials and signs in with the right ones', async ({ page }) => {
  await page.goto('/');
  await page.locator('#user-actions-container').getByRole('button', { name: /Prijava/ }).click();
  await page.fill('#prijava-korisnicko', 'petar');
  await page.fill('#prijava-lozinka', 'wrong-password');
  await page.locator('#forma-prijava button[type="submit"]').click();
  await expect(page.locator('.toast.error')).toContainText('Netačno korisničko ime ili lozinka');

  await page.fill('#prijava-lozinka', 'user123');
  await page.locator('#forma-prijava button[type="submit"]').click();
  await expect(page.locator('.user-name-small').first()).toHaveText('Petar Petrović');
});

test('keeps the session across a reload and ends it on logout', async ({ page }) => {
  await signIn(page, 'ana', 'user123');
  await page.reload();
  await expect(page.locator('.user-name-small').first()).toHaveText('Ana Anić');
  await page.locator('#btn-odjava').click();
  await expect(page.getByRole('button', { name: /Prijava/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.locator('#btn-odjava')).toHaveCount(0);
});

test('lets a user vote, switch and withdraw a vote', async ({ page }) => {
  await signIn(page, 'ana', 'user123');
  const c = card(page, 'Automatizacija');
  const like = c.locator('.btn-vote').first();
  const dislike = c.locator('.btn-vote').nth(1);

  await expect(like).toContainText('Like 1');
  await like.click();
  await expect(like).toContainText('Like 2');
  await expect(like).toHaveClass(/voted-za/);

  await dislike.click();
  await expect(dislike).toContainText('Dislike 1');
  await expect(like).toContainText('Like 1');

  await dislike.click();
  await expect(dislike).toContainText('Dislike 0');
  await expect(page.locator('#stat-glasovi')).toHaveText('9');
});

test('does not allow voting once an idea is in progress', async ({ page }) => {
  await signIn(page, 'ana', 'user123');
  await expect(card(page, 'Besplatno voće').locator('.btn-vote').first()).toBeDisabled();
});

test('registers a new user, who becomes a regular employee, and posts an idea', async ({ page }) => {
  await page.goto('/');
  await page.locator('#user-actions-container').getByRole('button', { name: /Prijava/ }).click();
  await page.locator('#tab-registracija-btn').click();
  await expect(page.locator('#reg-uloga')).toHaveCount(0); // no way to pick the administrator role
  await page.fill('#reg-ime', 'Jovana Jovanović');
  await page.fill('#reg-korisnicko', 'jovana');
  await page.fill('#reg-lozinka', 'lozinka1');
  await page.locator('#forma-registracija button[type="submit"]').click();
  await expect(page.locator('.user-role-small').first()).toHaveText('Zaposleni');

  await page.locator('#btn-otvori-novu-ideju').click();
  await page.fill('#ideja-naslov-input', 'Biciklistička parking mesta');
  await page.selectOption('#ideja-kategorija', 'Radno okruženje');
  await page.fill('#ideja-opis', 'Sigurno mesto za bicikle ispred zgrade.');
  await page.locator('#forma-ideja button[type="submit"]').click();

  await expect(card(page, 'Biciklistička')).toBeVisible();
  await expect(page.locator('#stat-ukupno')).toHaveText('5');
  // Regular users cannot change an idea's status.
  await expect(card(page, 'Biciklistička').getByRole('button', { name: 'Status' })).toHaveCount(0);
});

test('shows an error for a duplicate username', async ({ page }) => {
  await page.goto('/');
  await page.locator('#user-actions-container').getByRole('button', { name: /Prijava/ }).click();
  await page.locator('#tab-registracija-btn').click();
  await page.fill('#reg-ime', 'Neko Drugi');
  await page.fill('#reg-korisnicko', 'PETAR');
  await page.fill('#reg-lozinka', 'lozinka1');
  await page.locator('#forma-registracija button[type="submit"]').click();
  await expect(page.locator('.toast.error')).toContainText('već zauzeto');
});

test('adds a comment to an idea', async ({ page }) => {
  await signIn(page, 'petar', 'user123');
  const c = card(page, 'Fleksibilno');
  await c.locator('.comments-toggle-btn').click();
  await c.locator('.comment-input').fill('Podržavam!');
  await c.locator('.comment-form button').click();
  await expect(page.locator('.toast.success', { hasText: 'Komentar je dodat' })).toBeVisible();
  await card(page, 'Fleksibilno').locator('.comments-toggle-btn').click();
  await expect(card(page, 'Fleksibilno').locator('.comment-text')).toContainText(['Podržavam!']);
});

test('searches and filters by text, category and status', async ({ page }) => {
  await page.goto('/');
  await page.fill('#input-pretraga', 'python');
  await expect(page.locator('.idea-card')).toHaveCount(1);
  await page.fill('#input-pretraga', '');
  await expect(page.locator('.idea-card')).toHaveCount(5);

  await page.locator('.category-item[data-kategorija="Tehnologija"]').click();
  await expect(page.locator('.idea-card')).toHaveCount(1);
  await page.locator('.category-item[data-kategorija="sve"]').click();

  await page.selectOption('#select-status-filter', 'Implementirano');
  await expect(page.locator('.idea-card')).toHaveCount(1);
  await expect(page.locator('.idea-card')).toContainText('Ergonomske');
});

test('lets an administrator change an idea status, closing the vote', async ({ page }) => {
  await signIn(page, 'admin', 'admin123');
  const c = card(page, 'Automatizacija');
  await c.getByRole('button', { name: 'Status' }).click();
  await page.selectOption('#status-select', 'Odbijeno');
  await page.locator('#forma-status button[type="submit"]').click();
  await expect(card(page, 'Automatizacija').locator('.status-badge')).toContainText('Odbijeno');
  await expect(card(page, 'Automatizacija').locator('.btn-vote').first()).toBeDisabled();
});

test('lets authors delete their own idea but not edit others', async ({ page }) => {
  await signIn(page, 'jovana', 'lozinka1');
  await expect(card(page, 'Fleksibilno').getByRole('button', { name: 'Izmeni' })).toHaveCount(0);
  page.once('dialog', (d) => d.accept());
  await card(page, 'Biciklistička').getByRole('button', { name: 'Obriši' }).click();
  await expect(card(page, 'Biciklistička')).toHaveCount(0);
});

test('escapes HTML in user-supplied text', async ({ page }) => {
  await signIn(page, 'petar', 'user123');
  await page.locator('#btn-otvori-novu-ideju').click();
  await page.fill('#ideja-naslov-input', `<img src=x onerror="window.__xss=1"> it's`);
  await page.fill('#ideja-opis', 'test');
  await page.locator('#forma-ideja button[type="submit"]').click();
  await expect(page.locator('.idea-title', { hasText: 'onerror' })).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});
