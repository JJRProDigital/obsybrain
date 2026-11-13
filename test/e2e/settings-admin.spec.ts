// A brain's settings and the administration against the real server and PostgreSQL (plan T046–T047,
// PR25a; local lane): the last curator of a brain and the last administrator of the installation stay,
// on the screen and on the server; a service account's main key is shown once and never again; and an
// archived brain refuses an agent's write until it is unarchived.
import { expect, type Page, test } from '@playwright/test'
import { keepTheKey } from './key.ts'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }
const WEB = { 'x-requested-with': 'obsybrain-web' }

test.describe.configure({ mode: 'serial' })

// The installation of this run: set up from the web if no file did it yet, then signed in.
async function signedInAdmin(page: Page, baseURL: string): Promise<void> {
  await page.goto('/')
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

async function newBrain(page: Page, name: string): Promise<string> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear brain' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Crear un brain' })
  await dialog.getByLabel('Nombre').fill(name)
  await dialog.getByLabel('Para qué sirve').fill('What the settings e2e walks.')
  await dialog.getByRole('button', { name: 'Crear brain' }).click()
  await expect(page).toHaveURL(/\/b\/[^/]+$/)
  return decodeURIComponent(new URL(page.url()).pathname.split('/')[2] as string)
}

const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true })

test('the last curator of a brain stays: the screen says why, and the server refuses', async ({
  page,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const slug = await newBrain(page, 'Settings last curator')
  const me = ((await (await page.request.get('/v1/me')).json()) as { account: { id: string } }).account.id
  await page.goto(`/b/${slug}/settings`)
  const eric = region(page, 'Miembros').getByRole('listitem').filter({ hasText: 'Eric' })
  await expect(eric).toContainText('Solo curador')
  await expect(eric.getByRole('combobox')).toBeDisabled()
  // What the screen does not offer, the server still refuses (the web only hides).
  const demote = await page.request.put(`/v1/brains/${slug}/members/${me}`, {
    headers: WEB,
    data: { role: 'reader' },
  })
  expect([demote.status(), ((await demote.json()) as { error: { code: string } }).error.code]).toEqual([
    409,
    'last_curator',
  ])
  const leave = await page.request.delete(`/v1/brains/${slug}/members/${me}`, { headers: WEB })
  expect(leave.status()).toBe(409)
  await page.reload()
  await expect(region(page, 'Miembros').getByRole('listitem').filter({ hasText: 'Eric' })).toContainText(
    'curador',
  )
})

test('the last administrator stays: the screen says why, and the server refuses', async ({
  page,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const accounts = (await (await page.request.get('/v1/admin/accounts')).json()) as {
    accounts: Array<{ id: string; kind: string; isAdmin: boolean; status: string; email: string | null }>
  }
  const admins = accounts.accounts.filter((a) => a.kind === 'person' && a.isAdmin && a.status === 'activo')
  test.skip(admins.length !== 1, 'another e2e file made a second administrator')
  const me = admins[0]?.id as string
  await page.goto('/admin/people')
  const eric = region(page, 'Personas en esta instalación')
    .getByRole('listitem')
    .filter({ hasText: ADMIN.email })
  await expect(eric).toContainText('Solo administrador')
  await expect(
    eric.getByRole('button', { name: 'Quitar los derechos de administrador a Eric' }),
  ).toHaveAttribute('aria-disabled', 'true')
  const step = await page.request.patch(`/v1/admin/accounts/${me}`, {
    headers: WEB,
    data: { isAdmin: false },
  })
  expect([step.status(), ((await step.json()) as { error: { code: string } }).error.code]).toEqual([
    409,
    'last_admin',
  ])
})

test('a service account: its main key is shown once, then never again', async ({ page, baseURL }) => {
  await signedInAdmin(page, baseURL as string)
  const slug = await newBrain(page, 'Settings service')
  await page.goto('/admin/services')
  const form = page.getByRole('form', { name: 'Cuenta de servicio nueva' })
  await form.getByLabel('Nombre').fill('E2E runner')
  await form.getByRole('checkbox', { name: 'Settings service' }).check()
  await form.getByRole('button', { name: 'Crear cuenta de servicio' }).click()
  const once = page.getByRole('region', { name: 'Clave principal de E2E runner' })
  const secret = ((await once.locator('code').textContent()) ?? '').trim()
  expect(secret).toMatch(/^rscb_/)
  // The key works for what it was given: the brain chosen, as a contributor.
  const saved = await page.request.post(`/v1/brains/${slug}/entries`, {
    headers: { authorization: `Bearer ${secret}` },
    data: { type: 'note', title: 'From the runner', content: 'The service account writes.' },
  })
  expect(saved.status()).toBe(201)
  await once.getByRole('button', { name: 'Listo, ocultar la clave' }).click()
  await expect(page.getByText(secret)).toHaveCount(0)
  await page.reload()
  const row = region(page, 'Cuentas de servicio')
    .getByRole('listitem')
    .filter({ hasText: 'E2E runner' })
    .first()
  await expect(row).toContainText(`…${secret.slice(-4)}`)
  expect(await page.content()).not.toContain(secret)
  const kept = await page.evaluate(
    () => JSON.stringify({ ...localStorage, ...sessionStorage }) + location.href,
  )
  expect(kept).not.toContain(secret)
  // Nothing the administration reads gives it back.
  const accounts = await (await page.request.get('/v1/admin/accounts')).text()
  expect(accounts).not.toContain(secret)
  const id = (JSON.parse(accounts) as { accounts: Array<{ id: string; name: string }> }).accounts.find(
    (a) => a.name === 'E2E runner',
  )?.id
  expect(await (await page.request.get(`/v1/admin/accounts/${id}/keys`)).text()).not.toContain(secret)
})

test('archiving: the brain refuses an agent write until it is unarchived', async ({
  page,
  request,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const slug = await newBrain(page, 'Settings archive')
  const made = await page.request.post('/v1/me/tokens', {
    headers: WEB,
    data: { name: 'e2e archive agent', perm: 'write', brains: [slug], days: 30 },
  })
  const secret = ((await made.json()) as { token: { secret: string } }).token.secret
  const write = (title: string) =>
    request.post(`/v1/brains/${slug}/entries`, {
      headers: { authorization: `Bearer ${secret}` },
      data: { type: 'note', title, content: `${title}.` },
    })
  await page.goto(`/b/${slug}/settings/archive`)
  await region(page, 'Archivar').getByRole('button', { name: 'Archivar este brain' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Archivar Settings archive?' })
  await expect(dialog).toContainText('Lo que se detiene')
  await dialog.getByRole('button', { name: 'Archivar Settings archive' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Settings archive quedó archivado.' }),
  ).toBeVisible()
  const refused = await write('While archived')
  expect(refused.status()).toBe(403)
  expect(await refused.text()).toContain('archivado')
  await region(page, 'Archivar').getByRole('button', { name: 'Desarchivar este brain' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Settings archive volvió a estar activo.' }),
  ).toBeVisible()
  expect((await write('Después de desarchivar')).status()).toBe(201)
})
