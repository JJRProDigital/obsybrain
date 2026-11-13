// Home, the overview and inviting people against the real server and PostgreSQL (plan T014, T015, PR18;
// local lane): the lifecycle after the first run — the first brain, its first steps (CA19: steps 1 and 2
// mark themselves when an agent writes, from the live feed, without reloading), the first invitation sent
// from the web, the invitee joining, and a reset link made by the administration.
import { type APIRequestContext, expect, type Page, test } from '@playwright/test'
import { keepTheKey } from './key.ts'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }
const WEB = { 'x-requested-with': 'obsybrain-web' }

test.describe.configure({ mode: 'serial' })

async function mailLink(request: APIRequestContext, to: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const r = await request.get(`/__e2e/mail?to=${encodeURIComponent(to)}`)
    if (r.ok()) {
      const m = (await r.json()) as { text: string }
      const link = /https?:\/\/\S+\/invite#token=[\w-]+/.exec(m.text)?.[0]
      if (link) return new URL(link).pathname + new URL(link).hash
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`no invitation mail to ${to}`)
}

// The installation of this run: set up from the web if no file did it yet, then signed in.
async function signedInAdmin(page: Page, baseURL: string): Promise<void> {
  await page.goto('/')
  // Where the web leads a fresh browser: the setup, the sign-in, or home.
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/Set up obsybrain|Sign in|Your brains/)
  const where = await h1.textContent()
  if (where === 'Configurar obsybrain') {
    await page.getByLabel('Nombre de esta instalación').fill('obsybrain')
    await page.getByLabel('Dirección que abre la gente').fill(baseURL)
    await page.getByLabel('Tu nombre').fill(ADMIN.name)
    await page.getByLabel('Tu email').fill(ADMIN.email)
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await keepTheKey(page)
  } else if (where === 'Iniciar sesión') {
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeVisible()
}

test('CA19: a new brain shows three first steps; an agent writing marks steps 1 and 2 by itself', async ({
  page,
  request,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  await page.getByRole('button', { name: 'Crear brain' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Crear un brain' })
  await dialog.getByLabel('Nombre').fill('Lifecycle')
  await dialog.getByLabel('Para qué sirve').fill('What we learn walking the first days.')
  await dialog.getByRole('button', { name: 'Crear brain' }).click()
  await expect(page).toHaveURL(/\/b\/lifecycle$/)
  const steps = page.getByRole('region', { name: 'Primeros pasos' }).getByRole('listitem')
  await expect(steps).toHaveCount(3)
  await expect(steps.nth(0)).toContainText('Por hacer')
  await expect(steps.nth(1)).toContainText('Por hacer')
  // The third, importing a folder (B7 PR32): its own walk is test/e2e/import.spec.ts.
  await expect(steps.nth(2)).toContainText('Importar una carpeta de documentación')
  await expect(steps.nth(2)).toContainText('Por hacer')
  // The agent: a token of the administrator, used by a program that is not the web.
  const made = await page.request.post('/v1/me/tokens', {
    headers: WEB,
    data: { name: 'e2e agent', perm: 'write', brains: ['lifecycle'], days: 30 },
  })
  expect(made.status()).toBe(201)
  const secret = ((await made.json()) as { token: { secret: string } }).token.secret
  const url = page.url()
  // A request of its own, without the browser's cookie: what an agent sends.
  const saved = await request.post('/v1/brains/lifecycle/entries', {
    headers: { authorization: `Bearer ${secret}` },
    data: { type: 'learning', title: 'First thing', content: 'The agent wrote its first entry.' },
  })
  expect(saved.status()).toBe(201)
  await expect(steps.nth(0)).toContainText('Hecho', { timeout: 5_000 })
  await expect(steps.nth(1)).toContainText('Hecho')
  // With an entry, the brain is no longer empty: the third step says an import can no longer be taken.
  await expect(steps.nth(2)).toContainText('only into an empty brain')
  expect(page.url()).toBe(url)
  await expect(page.getByRole('region', { name: 'En números' })).toContainText('1 entrada')
  await expect(page.getByRole('region', { name: "Today's sessions" }).getByRole('listitem')).toHaveCount(1)
})

// A new brain and a token for an agent that writes in it (a program, not the web).
async function brainWithAgent(page: Page, name: string): Promise<{ slug: string; secret: string }> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear brain' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Crear un brain' })
  await dialog.getByLabel('Nombre').fill(name)
  await dialog.getByRole('button', { name: 'Crear brain' }).click()
  const slug = name.toLowerCase()
  await expect(page).toHaveURL(new RegExp(`/b/${slug}$`))
  const made = await page.request.post('/v1/me/tokens', {
    headers: WEB,
    data: { name: `e2e ${slug}`, perm: 'write', brains: [slug], days: 30 },
  })
  expect(made.status()).toBe(201)
  return { slug, secret: ((await made.json()) as { token: { secret: string } }).token.secret }
}

async function hideTab(page: Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h })
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => (h ? 'hidden' : 'visible'),
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

test('L1: a tab hidden before the first event marks the steps within 3 s of being shown', async ({
  page,
  request,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const { slug, secret } = await brainWithAgent(page, 'Hidden')
  const steps = page.getByRole('region', { name: 'Primeros pasos' }).getByRole('listitem')
  await expect(steps.nth(0)).toContainText('Por hacer')
  await hideTab(page, true)
  const saved = await request.post(`/v1/brains/${slug}/entries`, {
    headers: { authorization: `Bearer ${secret}` },
    data: { type: 'learning', title: 'Written while hidden', content: 'Nobody was looking.' },
  })
  expect(saved.status()).toBe(201)
  // Let the live feed deliver it while the tab is hidden.
  await page.waitForTimeout(1500)
  await hideTab(page, false)
  await expect(steps.nth(0)).toContainText('Hecho', { timeout: 3_000 })
  await expect(steps.nth(1)).toContainText('Hecho', { timeout: 3_000 })
})

test('L2: leaving a brain for home and coming back shows what the agent wrote meanwhile', async ({
  page,
  request,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const { slug, secret } = await brainWithAgent(page, 'Revisit')
  const steps = page.getByRole('region', { name: 'Primeros pasos' }).getByRole('listitem')
  await expect(steps.nth(0)).toContainText('Por hacer')
  await page.getByRole('link', { name: 'Todos los brains', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeVisible()
  const saved = await request.post(`/v1/brains/${slug}/entries`, {
    headers: { authorization: `Bearer ${secret}` },
    data: { type: 'learning', title: 'Written while away', content: 'The person was on home.' },
  })
  expect(saved.status()).toBe(201)
  await page.getByRole('link', { name: 'Revisit' }).click()
  await expect(steps.nth(0)).toContainText('Hecho', { timeout: 3_000 })
  await expect(page.getByRole('region', { name: 'En números' })).toContainText('1 entrada')
})

test('home: the card of the new brain carries its numbers and my role', async ({ page, baseURL }) => {
  await signedInAdmin(page, baseURL as string)
  const card = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: 'Lifecycle' }) })
  await expect(card).toContainText('1 entrada')
  await expect(card).toContainText('curator')
  await expect(card).toContainText('Última actividad')
})

test('the first invitation from the web goes by email; the invitee joins; the panel goes', async ({
  page,
  browser,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  // Inside the web, without reloading: People is shown again later from what it loaded now.
  await page.getByRole('banner').getByRole('link', { name: 'People' }).click()
  const form = page.getByRole('form', { name: 'Invitar personas' })
  await form.getByLabel('Emails').fill('lena@example.test')
  await form.getByRole('checkbox', { name: 'Lifecycle' }).check()
  await form.getByLabel('Rol en Lifecycle').selectOption('contributor')
  await form.getByRole('button', { name: 'Enviar invitaciones' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Invitación enviada' })).toContainText(
    'lena@example.test',
  )
  const lena = page.getByRole('region', { name: 'Invitations' }).getByRole('listitem').filter({
    hasText: 'lena@example.test',
  })
  await expect(lena).toContainText('pending')
  await expect(lena).toContainText('Lifecycle as contributor')

  const link = await mailLink(page.request, 'lena@example.test')
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await p.goto(link)
  await p.getByLabel('Tu nombre').fill('Lena')
  await p.getByLabel('Elige una contraseña').fill('a long passphrase for lena')
  await p.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(p.getByRole('link', { name: 'Lifecycle' })).toBeVisible()
  // A contributor may not invite: no People page in her menu.
  await p.getByRole('button', { name: /Account/ }).click()
  await expect(p.getByRole('link', { name: 'People' })).toHaveCount(0)
  await ctx.close()

  // Back to home and to People inside the web (no reload): both show that Lena joined.
  await page.getByRole('banner').getByRole('link', { name: /home/ }).click()
  await expect(page.getByRole('link', { name: 'Lifecycle' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Invitar personas' })).toHaveCount(0)
  await page.getByRole('banner').getByRole('link', { name: 'People' }).click()
  await expect(lena).toContainText('accepted')
})

test('the administration makes a reset link for a person, shown once', async ({ page, baseURL }) => {
  await signedInAdmin(page, baseURL as string)
  await page.goto('/admin/people')
  const lena = page
    .getByRole('region', { name: 'Personas en esta instalación' })
    .getByRole('listitem')
    .filter({
      hasText: 'lena@example.test',
    })
  await lena.getByRole('button', { name: 'Crear un enlace de restablecimiento' }).click()
  const shown = lena.getByRole('region', { name: /Reset link for Lena/ })
  await expect(shown).toContainText('/reset#token=')
  await shown.getByRole('button', { name: 'Listo, lo copié' }).click()
  await expect(page.getByText('/reset#token=')).toHaveCount(0)
})
