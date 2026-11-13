// The journal against the real server and PostgreSQL (plan T023–T024, PR20; local lane): an agent writes
// entries, a contributor corrects their own one, a reader sees no action; a person adds a correction to the
// page «Intros» and an agent's context for a task about intros carries it (CA12); a curator decides «A
// replaces B» («Keep this one» on A) and the conflict leaves the list while B leaves the context (CA11);
// forgetting an entry with a reason takes it out of the context, and a curator recovers it. Nothing is
// simulated but the people.
import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  expect,
  type Page,
  test,
} from '@playwright/test'
import { keepTheKey } from './key.ts'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }
const WEB = { 'x-requested-with': 'obsybrain-web' }
const SLUG = 'journal-e2e'
const J = `/b/${SLUG}/journal`

test.describe.configure({ mode: 'serial' })

async function signedInAdmin(page: Page, baseURL: string): Promise<void> {
  await page.goto('/')
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/Configurar obsybrain|Iniciar sesión|Tus brains/)
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

// A person invited to the brain with a role, signed in in a context of their own, with a token of theirs
// for their agent.
async function person(
  browser: Browser,
  admin: Page,
  name: string,
  role: string,
): Promise<{ ctx: BrowserContext; token: string }> {
  const email = `${name.toLowerCase()}-${Date.now()}@example.test`
  const made = await admin.request.post('/v1/invitations', {
    headers: WEB,
    data: { emails: [email], brains: [{ slug: SLUG, role }] },
  })
  expect(made.status()).toBe(201)
  const link = ((await made.json()) as { invitations: Array<{ link: string }> }).invitations[0]?.link ?? ''
  const ctx = await browser.newContext()
  const accepted = await ctx.request.post('/v1/invitations/accept', {
    headers: WEB,
    data: { token: /#token=([\w-]+)/.exec(link)?.[1] ?? '', name, password: ADMIN.password },
  })
  expect(accepted.status()).toBe(201)
  const t = await ctx.request.post('/v1/me/tokens', {
    headers: WEB,
    data: { name: `${name}'s agent`, perm: 'write', brains: [SLUG], days: 30 },
  })
  return { ctx, token: ((await t.json()) as { token: { secret: string } }).token.secret }
}

let agent = '' // Eric's agent
const ids: Record<string, string> = {}

async function save(request: APIRequestContext, token: string, body: Record<string, unknown>) {
  const r = await request.post(`/v1/brains/${SLUG}/entries`, {
    headers: { authorization: `Bearer ${token}` },
    data: body,
  })
  expect(r.status(), await r.text()).toBe(201)
  return ((await r.json()) as { receipt: { entryId: string } }).receipt.entryId
}
async function context(request: APIRequestContext, q: string) {
  const r = await request.get(`/v1/brains/${SLUG}/context?${q}`, {
    headers: { authorization: `Bearer ${agent}` },
  })
  expect(r.status()).toBe(200)
  return ((await r.json()) as { text: string }).text
}

test('an agent writes; a contributor corrects their own entry; a reader sees no action', async ({
  page,
  request,
  browser,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  expect(
    (
      await page.request.post('/v1/brains', { headers: WEB, data: { slug: SLUG, name: 'Journal e2e' } })
    ).status(),
  ).toBe(201)
  const t = await page.request.post('/v1/me/tokens', {
    headers: WEB,
    data: { name: 'e2e agent', perm: 'write', brains: [SLUG], days: 30 },
  })
  agent = ((await t.json()) as { token: { secret: string } }).token.secret
  const s = await request.post(`/v1/brains/${SLUG}/sessions`, {
    headers: { authorization: `Bearer ${agent}` },
    data: { purpose: 'Review the October intros' },
  })
  const sessionId = ((await s.json()) as { session: { id: string } }).session.id
  ids.short = await save(request, agent, {
    type: 'learning',
    title: 'Short intros keep viewers',
    content: 'Intros under ten seconds kept 70% of viewers.',
    sessionId,
  })
  ids.long = await save(request, agent, {
    type: 'learning',
    title: 'Long intros build trust',
    content: 'Intros of thirty seconds keep viewers who trust the channel.',
    sessionId,
  })
  ids.wrong = await save(request, agent, {
    type: 'fact',
    title: 'The channel has 9 million subscribers',
    content: 'Nine million subscribers as of October.',
    sessionId,
  })
  // The page an agent's task about intros finds.
  const page1 = await page.request.post(`/v1/brains/${SLUG}/wiki/changes`, {
    headers: WEB,
    data: {
      op: 'create',
      address: 'style/intros',
      type: 'guide',
      title: 'Intros',
      summary: 'How we open a video.',
      body: 'Open the intros with the question of the video.',
      reason: 'Seed.',
    },
  })
  expect(page1.status()).toBe(201)

  const ana = await person(browser, page, 'Ana', 'contributor')
  const own = await save(ana.ctx.request, ana.token, {
    type: 'learning',
    title: 'Hooks at second five',
    content: 'The hook lands best at second five.',
  })
  const a = await ana.ctx.newPage()
  // The journal: sessions newest first, Ana's agent and Eric's.
  await a.goto(`/b/${SLUG}`)
  await a
    .getByRole('navigation', { name: 'Secciones de este brain' })
    .getByRole('link', { name: 'Diario' })
    .click()
  await expect(a.getByRole('heading', { level: 1, name: 'Sesiones' })).toBeVisible()
  await a.getByRole('link', { name: 'Review the October intros' }).click()
  await expect(a.locator('.facts')).toContainText('de Eric')
  await a.goto(`${J}/entries/${ids.short}`)
  await expect(a.getByRole('button', { name: 'Editar esta entrada' })).toHaveCount(0)
  await a.goto(`${J}/entries/${own}`)
  await a.getByRole('button', { name: 'Editar esta entrada' }).click()
  await a.getByLabel('Texto').fill('The hook lands best at second three.')
  await a.getByRole('button', { name: 'Guardar los cambios' }).click()
  await expect(a.getByRole('status').filter({ hasText: 'Guardada como la revisión 2.' })).toBeVisible()
  const read = await ana.ctx.request.get(`/v1/entries/${own}?history=1`)
  const body = (await read.json()) as { entry: { content: string }; history: Array<{ authorName: string }> }
  expect(body.entry.content).toBe('The hook lands best at second three.')
  expect(body.history.map((h) => h.authorName)).toEqual(['Ana', 'Ana'])

  const rita = await person(browser, page, 'Rita', 'reader')
  const r = await rita.ctx.newPage()
  await r.goto(`${J}/entries/${own}`)
  await expect(r.getByRole('heading', { level: 1, name: 'Hooks at second five' })).toBeVisible()
  await expect(r.locator('[data-state="no-actions"]')).toContainText('un curador de Journal e2e (Eric)')
  await expect(r.getByRole('button', { name: /Correct|Forget|Relate|Pin/ })).toHaveCount(0)
  // The API refuses her the same.
  const refused = await r.request.patch(`/v1/entries/${own}`, {
    headers: WEB,
    data: { baseRevision: 2, content: 'x' },
  })
  expect(refused.status()).toBe(403)
})

test('CA12: a person adds a correction to the page «Intros»; an agent on a task about intros gets it', async ({
  page,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  await page.goto(`/b/${SLUG}/pages/style/intros`)
  await page.getByRole('link', { name: 'Añadir una corrección' }).click()
  await expect(page.getByText('Elegida: Intros')).toBeVisible()
  await page.getByLabel('Título').fill('No greeting before the hook')
  await page.getByLabel('La corrección').fill('Cut the greeting; a third of viewers leave before the hook.')
  await page.getByLabel('Solo para un agente (opcional)').fill('narrator')
  await page.getByRole('button', { name: 'Añadir corrección' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Corrección añadida.' })).toBeVisible()
  await expect(page.locator('.page-main')).toContainText('Sobre la página style/intros')
  // Another agent, on a task about intros: it is about a page of its task.
  expect(await context(page.request, 'task=rewrite+the+intros&agent=writer')).toContain('Cut the greeting')
  // On a task about something else, it is not.
  expect(await context(page.request, 'task=pricing+tiers&agent=writer')).not.toContain('Cut the greeting')
})

test('CA11: «A replaces B» closes the conflict, and B leaves the context', async ({
  page,
  request,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const rel = await request.post(`/v1/brains/${SLUG}/relations`, {
    headers: { authorization: `Bearer ${agent}` },
    data: { from: ids.long, to: ids.short, kind: 'contradicts', reason: 'Thirty against ten.' },
  })
  expect(rel.status()).toBe(201)
  expect(await context(request, 'agent=x')).toContain('Long intros build trust')
  await page.goto(`/b/${SLUG}/journal`)
  await page
    .getByRole('navigation', { name: 'Secciones del diario' })
    .getByRole('link', { name: 'Conflictos' })
    .click()
  const item = page.locator('.conflict-item').filter({ hasText: 'Long intros build trust' })
  await expect(item).toContainText('Short intros keep viewers')
  await item.getByRole('button', { name: 'Conservar esta: Short intros keep viewers' }).click()
  await page
    .getByRole('dialog', { name: '¿Decidir este conflicto?' })
    .getByRole('button', { name: 'Decidir' })
    .click()
  await expect(page.getByRole('status').filter({ hasText: 'Decidido.' })).toBeVisible()
  await expect(page.locator('.conflict-item').filter({ hasText: 'Long intros build trust' })).toHaveCount(0)
  const left = (await (
    await request.get(`/v1/brains/${SLUG}/conflicts`, { headers: { authorization: `Bearer ${agent}` } })
  ).json()) as {
    total: number
  }
  expect(left.total).toBe(0)
  const text = await context(request, 'agent=x')
  expect(text).not.toContain('Long intros build trust')
  expect(text).toContain('Short intros keep viewers')
})

test('a wrong entry is forgotten with a reason, leaves the context, and a curator recovers it', async ({
  page,
  request,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  expect(await context(request, 'agent=x')).toContain('9 million subscribers')
  await page.goto(`${J}/entries/${ids.wrong}`)
  await page.getByRole('button', { name: 'Olvidar…' }).click()
  const d = page.getByRole('dialog', { name: '¿Olvidar esta entrada?' })
  await d.getByLabel('Por qué (obligatorio)').fill('Wrong number: it is 900 thousand.')
  await d.getByRole('button', { name: 'Olvidar la entrada' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Olvidada.' })).toBeVisible()
  expect(await context(request, 'agent=x')).not.toContain('9 million subscribers')
  await page.goto(`${J}/forgotten`)
  const item = page.locator('main ul.list > li').filter({ hasText: 'The channel has 9 million subscribers' })
  await expect(item).toContainText('Olvidada por Eric el')
  await expect(item).toContainText('Wrong number: it is 900 thousand.')
  await item.getByRole('button', { name: /Recuperar/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Recuperada' })).toBeVisible()
  expect(await context(request, 'agent=x')).toContain('9 million subscribers')
})
