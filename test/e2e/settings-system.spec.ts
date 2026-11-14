// The rest of the administration against the real server and PostgreSQL (plan T047, PR25b; local lane), with
// mail captured, never sent. CA18: the administration uploads a logo and renames the installation; anyone
// who arrives sees both in the header, and the invitation mail carries both (the logo inline, cid:). CA9: with
// the address of the LaKademIA panel set, the session a Factory run opens with a service account's short key links to
// that run in Activity, in a new tab. The audit's download holds exactly the lines its filtered view shows.
// The test mail goes through the mail settings saved in the web, and a failure shows with its reason.
// Files run in name order on one server: this one runs after doors.spec.ts, whose first run needs an
// installation not set up yet.

import { crc32, deflateSync } from 'node:zlib'
import { expect, type Page, test } from '@playwright/test'
import { keepTheKey } from './key.ts'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }
const WEB = { 'x-requested-with': 'obsybrain-web' }
const ORIGINAL_MAIL = {
  host: 'smtp.test',
  port: 587,
  fromName: 'Brain',
  fromAddress: 'brain@example.test',
  password: '',
}

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

// A real PNG, so the browser draws it.
function png(w: number, h: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0x30)])
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: h }, () => row)))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

type Captured = {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: Array<{ cid: string; contentType: string; content: { data: number[] } }>
}
async function mailTo(page: Page, to: string, subject: RegExp): Promise<Captured> {
  let found: Captured | null = null
  await expect
    .poll(async () => {
      const r = await page.request.get(`/__e2e/mail?to=${encodeURIComponent(to)}`)
      if (r.status() !== 200) return false
      found = (await r.json()) as Captured
      return subject.test(found.subject)
    })
    .toBe(true)
  return found as unknown as Captured
}

let admin: Page

test.beforeAll(async ({ browser, baseURL }) => {
  admin = await browser.newPage()
  await signedInAdmin(admin, baseURL as string)
})

test.afterAll(async () => {
  // What other files of this run rely on: the name, no logo, the mail settings, no Factory address.
  await admin.request.put('/v1/admin/settings', {
    headers: WEB,
    data: { name: 'obsybrain', factoryUrl: null },
  })
  await admin.request.delete('/v1/admin/branding/logo', { headers: WEB })
  await admin.request.put('/v1/admin/mail', { headers: WEB, data: ORIGINAL_MAIL })
  await admin.close()
})

test('CA18: a new logo and name show in the header for anyone, and in the invitation mail', async ({
  browser,
}) => {
  const logo = png(48, 24)
  await admin.goto('/admin/branding')
  await admin
    .getByLabel('Elegir un logo')
    .setInputFiles({ name: 'acme.png', mimeType: 'image/png', buffer: logo })
  await admin.getByRole('button', { name: 'Subir este logo' }).click()
  await expect(admin.getByRole('status').filter({ hasText: 'Logo subido.' })).toBeFocused()
  await admin.getByLabel('Nombre de esta instalación').fill('Acme Brain')
  await admin.getByRole('button', { name: 'Guardar el nombre' }).click()
  await expect(admin.getByRole('status').filter({ hasText: 'Guardado.' })).toBeVisible()
  await expect(admin.locator('header .brand .name')).toHaveText('Acme Brain')
  // Anyone who arrives, signed out: the sign-in page's header.
  const someone = await browser.newPage()
  await someone.goto('/')
  await expect(someone.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible()
  await expect(someone.locator('header .brand')).toContainText('Acme Brain')
  const img = someone.locator('header .brand img')
  await expect(img).toHaveAttribute('src', /^\/v1\/branding\/logo\?v=[0-9a-f]{12}$/)
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(48)
  await someone.close()
  // The invitation mail names the installation and carries the logo inline.
  const email = `ca18-${Date.now()}@example.test`
  const made = await admin.request.post('/v1/invitations', { headers: WEB, data: { emails: [email] } })
  expect(made.status()).toBe(201)
  const m = await mailTo(admin, email, /te invitó a Acme Brain/)
  expect(m.html).toContain('Acme Brain')
  expect(m.html).toMatch(/<img [^>]*src="cid:logo@obsybrain"/)
  expect(m.html).not.toMatch(/src="https?:/)
  const att = m.attachments?.[0]
  expect(att?.cid).toBe('logo@obsybrain')
  expect(att?.contentType).toBe('image/png')
  expect(Buffer.from(att?.content.data ?? []).equals(logo)).toBe(true)
})

test('CA9: a session a Factory run opens links to that run in Activity, in a new tab', async () => {
  const slug = `ca9-${Date.now().toString(36)}`
  const brain = await admin.request.post('/v1/brains', {
    headers: WEB,
    data: { slug, name: 'Factory runs', purpose: 'Where a Factory run writes.' },
  })
  expect(brain.status(), await brain.text()).toBe(201)
  // Without an address of Factory, the reference is text.
  const service = await admin.request.post('/v1/admin/services', {
    headers: WEB,
    data: { name: `Factory ${slug}`, brains: [{ slug, role: 'contributor' }] },
  })
  expect(service.status(), await service.text()).toBe(201)
  const main = ((await service.json()) as { key: { secret: string } }).key.secret
  const short = await admin.request.post('/v1/keys/short', {
    headers: { authorization: `Bearer ${main}` },
    data: {
      writeBrain: slug,
      perm: 'write',
      ref: 'factory run r_0a1b2c3d',
      ttlMinutes: 30,
      agent: 'narrator',
    },
  })
  expect(short.status(), await short.text()).toBe(201)
  const key = ((await short.json()) as { key: { secret: string } }).key.secret
  const opened = await admin.request.post(`/v1/brains/${slug}/sessions`, {
    headers: { authorization: `Bearer ${key}` },
    data: { purpose: 'Write the launch notes' },
  })
  expect(opened.status(), await opened.text()).toBe(201)
  await admin.goto(`/b/${slug}/activity`)
  const row = admin.getByRole('region', { name: 'Sesiones activas ahora' }).getByRole('listitem').filter({
    hasText: 'Write the launch notes',
  })
  await expect(row).toContainText('r_0a1b2c3d')
  await expect(row.getByRole('link', { name: /r_0a1b2c3d/ })).toHaveCount(0)
  // The administration sets where Factory is.
  await admin.goto('/admin/system')
  await admin.getByLabel('Dirección del panel de LaKademIA').fill('https://factory.e2e.test')
  await admin.getByRole('button', { name: 'Guardar la dirección' }).click()
  await expect(admin.getByRole('status').filter({ hasText: 'Guardado.' })).toBeFocused()
  // Factory itself is not running here: its page is answered by the test, and the address checked.
  await admin
    .context()
    .route('https://factory.e2e.test/**', (r) =>
      r.fulfill({ status: 200, contentType: 'text/html', body: '<title>Run</title><h1>Factory run</h1>' }),
    )
  await admin.goto(`/b/${slug}/activity`)
  const link = admin
    .getByRole('region', { name: 'Sesiones activas ahora' })
    .getByRole('listitem')
    .filter({ hasText: 'Write the launch notes' })
    .getByRole('link', { name: /r_0a1b2c3d/ })
  await expect(link).toHaveAttribute('href', 'https://factory.e2e.test/runs/r_0a1b2c3d')
  await expect(link).toHaveAttribute('rel', /noopener/)
  const [tab] = await Promise.all([admin.context().waitForEvent('page'), link.click()])
  await tab.waitForLoadState()
  expect(tab.url()).toBe('https://factory.e2e.test/runs/r_0a1b2c3d')
  await tab.close()
})

test('the audit: the download holds exactly the lines of the filtered view, every page of it', async () => {
  // More than a page of lines of one kind: the limit saved again and again.
  for (let i = 0; i < 110; i += 1) {
    const r = await admin.request.put('/v1/admin/settings', {
      headers: WEB,
      data: { rateLimit: i % 2 ? 601 : 602 },
    })
    expect(r.status()).toBe(200)
  }
  await admin.request.put('/v1/admin/settings', { headers: WEB, data: { rateLimit: 600 } })
  await admin.goto('/admin/audit')
  await admin.getByLabel('Acción').fill('settings.update')
  await admin.getByLabel('Quién').selectOption({ label: 'Eric' })
  const rows = admin.getByRole('table', { name: 'Líneas de auditoría' }).locator('tbody tr')
  // The view before the filters is a page of 100 too: the loop starts only once the filtered page is on screen (its
  // first line), never on the old view (B7 debt, fixed in PR35: the loop once paged the old view and stopped at 100).
  const audit = (r: { url(): string }, more: boolean) =>
    r.url().includes('/v1/admin/audit?') &&
    r.url().includes('action=settings.update') &&
    r.url().includes('before=') === more
  const [filtered] = await Promise.all([
    admin.waitForResponse((r) => audit(r, false)),
    admin.getByRole('button', { name: 'Aplicar filtros' }).click(),
  ])
  const first = ((await filtered.json()) as { items: Array<{ id: string }> }).items[0]?.id
  await expect(rows.first()).toHaveAttribute('id', `audit-${first}`)
  await expect(rows).toHaveCount(100)
  const more = admin.getByRole('button', { name: 'Mostrar 100 más' })
  // More than a page: the button is there before the loop asks.
  await expect(more).toBeVisible()
  while (await more.isVisible()) {
    const before = await rows.count()
    await Promise.all([admin.waitForResponse((r) => audit(r, true)), more.click()])
    await expect.poll(() => rows.count()).toBeGreaterThan(before)
  }
  const onScreen = await rows.evaluateAll((trs) => trs.map((tr) => tr.id.replace(/^audit-/, '')))
  expect(onScreen.length).toBeGreaterThan(110)
  const href = (await admin
    .getByRole('link', { name: 'Descargar estas líneas (CSV)' })
    .getAttribute('href')) as string
  const csv = await (await admin.request.get(href)).text()
  // The file is that view: a second download, after the first was itself recorded, is the same file.
  expect(await (await admin.request.get(href)).text()).toBe(csv)
  const inFile = csv
    .trim()
    .split('\r\n')
    .slice(1)
    .map((l) => l.split(',')[0])
  expect(inFile).toEqual(onScreen)
})

test('email: settings saved in the web, the password never shown; a test mail captured; a failure with its reason', async () => {
  await admin.goto('/admin/email')
  await admin.getByLabel('Servidor de correo').fill('smtp.e2e.test')
  await admin
    .getByRole('group', { name: 'Contraseña' })
    .getByRole('radio', { name: 'Usar una nueva' })
    .check()
  await admin.getByLabel('Contraseña nueva').fill('e2e-mail-secret-4321')
  await admin.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
  await expect(admin.getByRole('status').filter({ hasText: 'Ajustes de correo guardados.' })).toBeFocused()
  await expect(admin.getByRole('group', { name: 'Contraseña' })).toContainText(
    'Conservar la actual (configurada)',
  )
  await expect(admin.locator('body')).not.toContainText('4321')
  const read = await (await admin.request.get('/v1/admin/mail')).text()
  expect(read).not.toContain('e2e-mail-secret')
  await admin.reload()
  await expect(admin.locator('body')).not.toContainText('e2e-mail-secret')
  // The test mail, captured.
  await admin.getByRole('button', { name: 'Enviar email de prueba' }).click()
  await expect(admin.getByRole('status').filter({ hasText: `Enviado a ${ADMIN.email}` })).toBeFocused()
  const m = await mailTo(admin, ADMIN.email, /Correo de prueba de /)
  expect(m.text).toContain('El correo funciona.')
  // A server that cannot be reached: the test says why, and the failure is listed.
  await admin.getByLabel('Servidor de correo').fill('down.e2e.test')
  // Another server: its password is typed again.
  await admin
    .getByRole('group', { name: 'Contraseña' })
    .getByRole('radio', { name: 'Usar una nueva' })
    .check()
  await admin.getByLabel('Contraseña nueva').fill('down-server-password')
  await admin.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
  await expect(admin.getByRole('status').filter({ hasText: 'Ajustes de correo guardados.' })).toBeVisible()
  await admin.getByRole('button', { name: 'Enviar email de prueba' }).click()
  await expect(admin.getByRole('alert').filter({ hasText: 'No salió' })).toContainText(
    'servidor no encontrado',
  )
  await expect(
    admin.getByRole('region', { name: 'Fallos de envío recientes' }).getByRole('listitem').first(),
  ).toContainText('servidor no encontrado')
})
