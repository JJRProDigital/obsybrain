// The rest of the administration (spec B6 «Admin»: Email, Meaning search, Limits, Audit, Backups & system,
// Branding; plan T047, PR25b), against the fixture API: secrets that never come back (only "set" and the last
// 4), a test mail and the failures, meaning search that stays off until the warning is accepted and shows its
// progress, a limit within bounds, the audit filtered with a download of the same rows, the health of the
// service with B7 said honestly, and the logo and name in the header. Saves are explicit, field by field on
// what was read; unsaved edits survive a tab switch; risky actions ask first; the keyboard never falls to the
// page. Only the administration reaches it.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, noSideScroll, scenario, test } from './fixture.ts'

async function audit(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const bad = r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(bad).toEqual([])
}

const notOnBody = async (page: Page) =>
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY')

const status = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

const TABS = [
  ['Email', '/admin/email', 'Correo saliente'],
  ['Búsqueda por significado', '/admin/meaning', 'Búsqueda por significado'],
  ['Límites', '/admin/limits', 'Peticiones por clave'],
  ['Auditoría', '/admin/audit', 'Auditoría'],
  ['Copias y sistema', '/admin/system', 'Servicio'],
  ['Marca', '/admin/branding', 'Nombre'],
] as const

test.describe('administration: the rest of it', () => {
  test('every part has its tab, its page and no serious accessibility problem; nothing scrolls sideways at 320', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    const nav = page.getByRole('navigation', { name: 'Administración' })
    for (const [label, href, heading] of TABS) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${href}$`))
      await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      )
      await expect(page.getByRole('heading', { level: 2, name: heading, exact: true })).toBeVisible()
      await audit(page, label)
    }
    await page.setViewportSize({ width: 320, height: 700 })
    for (const [, href, heading] of TABS) {
      await page.goto(href)
      await expect(page.getByRole('heading', { level: 2, name: heading, exact: true })).toBeVisible()
      await noSideScroll(page)
    }
  })

  test('only the administration: a member sees why, and whom to ask', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto('/admin/email')
    await expect(page.getByText('Solo la administración de esta instalación abre esto.')).toBeVisible()
    await expect(page.getByLabel('Servidor de correo')).toHaveCount(0)
  })
})

test.describe('administration: email', () => {
  test('the password is never shown: only that it is set and its last 4; it is kept unless replaced', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/email')
    const pw = page.getByRole('group', { name: 'Contraseña' })
    await expect(pw).toContainText('Conservar la actual (configurada)')
    await expect(pw.getByRole('radio', { name: /Conservar la actual/ })).toBeChecked()
    // Typing a new password needs choosing to; the box is a password box and starts empty.
    await pw.getByRole('radio', { name: 'Usar una nueva' }).check()
    const fresh = page.getByLabel('Contraseña nueva')
    await expect(fresh).toHaveAttribute('type', 'password')
    await expect(fresh).toHaveValue('')
    await fresh.fill('another-secret-9876')
    const put = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/v1/admin/mail'))
    await page.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
    expect((await put).postDataJSON().password).toBe('another-secret-9876')
    await expect(status(page, 'Ajustes de correo guardados.')).toBeFocused()
    await expect(pw).toContainText('Conservar la actual (configurada)')
    await expect(page.getByLabel('Contraseña nueva')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText('another-secret')
  })

  test('nothing changed still asks the server, and says so', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/email')
    await expect(page.getByLabel('Servidor de correo')).toHaveValue('smtp.example.test')
    const put = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/v1/admin/mail'))
    await page.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
    expect((await put).postDataJSON().base.host).toBe('smtp.example.test')
    await expect(status(page, 'Nada cambió.')).toBeFocused()
  })

  test('saved meanwhile by another administrator: their value shows, what I typed stays, a second save goes', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/email')
    await page.getByLabel('Enviar como (nombre)').fill('Acme mail')
    await fetch(`${baseURL}/__fixture/scenarios/${s.id}/admin-edit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mailHost: 'smtp.theirs.test' }),
    })
    await page.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
    await expect(page.getByRole('alert')).toContainText('Alguien cambió esto mientras lo editabas.')
    await expect(page.getByLabel('Servidor de correo')).toHaveValue('smtp.theirs.test')
    await expect(page.getByLabel('Enviar como (nombre)')).toHaveValue('Acme mail')
    await notOnBody(page)
    await page.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
    await expect(status(page, 'Ajustes de correo guardados.')).toBeVisible()
  })

  test('a test email, and a failure shown among the recent send failures with its reason', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/email')
    const failures = page.getByRole('region', { name: 'Fallos de envío recientes' })
    await expect(failures).toContainText('timeout')
    await expect(page.getByLabel('Enviar un email de prueba a')).toHaveValue('eric@example.test')
    await page.getByRole('button', { name: 'Enviar email de prueba' }).click()
    await expect(status(page, 'Enviado a eric@example.test')).toBeFocused()
    await page.getByLabel('Servidor de correo').fill('down.example.test')
    // Another server: the password goes with it.
    await page.getByRole('radio', { name: 'Usar una nueva' }).check()
    await page.getByLabel('Contraseña nueva').fill('down-server-password')
    await page.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
    await expect(status(page, 'Ajustes de correo guardados.')).toBeVisible()
    await page.getByRole('button', { name: 'Enviar email de prueba' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'No salió' })).toContainText('server not found')
    await expect(failures.getByRole('listitem').first()).toContainText('server not found')
  })

  test('removing the mail settings asks first, and says what stops', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/email')
    await page.getByRole('button', { name: 'Quitar los ajustes de correo' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Quitar los ajustes de correo?' })
    await expect(dialog).toContainText('las invitaciones y los enlaces de restablecimiento')
    await dialog.getByRole('button', { name: 'Conservarlos' }).click()
    await expect(page.getByLabel('Servidor de correo')).toHaveValue('smtp.example.test')
    await page.getByRole('button', { name: 'Quitar los ajustes de correo' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Quitar los ajustes de correo' }).click()
    await expect(status(page, 'Ajustes de correo quitados.')).toBeFocused()
    await expect(page.getByText('El correo no está configurado')).toBeVisible()
    await expect(page.getByLabel('Servidor de correo')).toHaveValue('')
  })

  test('while loading, no box to type in; then the settings', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in', { 'admin-email': 'loading' })
    await page.goto('/admin/email')
    await expect(page.getByRole('heading', { level: 2, name: 'Correo saliente' })).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByLabel('Servidor de correo')).toHaveValue('smtp.example.test', { timeout: 6000 })
  })
})

test.describe('administration: meaning search', () => {
  test('a key that is never shown; on only once the warning is accepted; progress in words; off asks first', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/meaning')
    await expect(page.getByText('Desactivada: las búsquedas usan solo palabras.')).toBeVisible()
    const openai = page.getByRole('region', { name: 'OpenAI' })
    await expect(openai).toContainText('Clave: Sin configurar')
    const key = openai.getByLabel('Clave de API de OpenAI')
    await expect(key).toHaveAttribute('type', 'password')
    await key.fill('sk-test-0123456789abcdefghij-k9Z2')
    await openai.getByRole('button', { name: 'Guardar la clave' }).click()
    await expect(openai).toContainText('Clave: Configurada aquí, termina en …k9Z2')
    await expect(key).toHaveValue('')
    await notOnBody(page)
    await expect(page.locator('body')).not.toContainText('0123456789abcdefghij')
    // Turning on: the provider, the warning, and a box to accept it.
    const on = page.getByRole('region', { name: 'Activar la búsqueda por significado' })
    await on.getByRole('radio', { name: /OpenAI/ }).check()
    await expect(on).toContainText('cannot be taken back')
    const go = on.getByRole('button', { name: 'Activar la búsqueda por significado' })
    await expect(go).toHaveAttribute('aria-disabled', 'true')
    await expect(on).toContainText('Acepta antes el aviso.')
    await on.getByRole('checkbox', { name: /Entiendo/ }).check()
    await go.click()
    await expect(status(page, 'La búsqueda por significado está activada con OpenAI.')).toBeFocused()
    const progress = page.getByRole('progressbar', { name: 'Procesando' })
    await expect(progress).toBeVisible()
    await expect(page.getByText(/de 3400 textos procesados|Los 3400 textos procesados/)).toBeVisible()
    await expect(page.getByText('Los 3400 textos procesados')).toBeVisible({ timeout: 20_000 })
    // Removing the key in use: the server says why not.
    await openai.getByRole('button', { name: 'Quitar la clave' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Quitar la clave' }).click()
    await expect(
      page.getByRole('alert').filter({ hasText: 'Apaga primero la búsqueda por significado' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Desactivar la búsqueda por significado' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Desactivar la búsqueda por significado?' })
    await expect(dialog).toContainText('solo palabras')
    await dialog.getByRole('button', { name: 'Desactivar la búsqueda por significado' }).click()
    await expect(status(page, 'La búsqueda por significado está desactivada.')).toBeFocused()
  })
})

test.describe('administration: limits', () => {
  test('the limit per key stays within bounds; an edit survives a tab switch; the save is explicit', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/limits')
    const field = page.getByLabel('Peticiones por minuto, por clave')
    await expect(field).toHaveValue('600')
    await field.fill('30')
    await page.getByRole('button', { name: 'Guardar el límite' }).click()
    await expect(page.getByText('Un número entero de 60 a 10.000.')).toBeVisible()
    await expect(field).toBeFocused()
    await field.fill('1200')
    // Away and back: what was typed is still there, not saved.
    await page
      .getByRole('navigation', { name: 'Administración' })
      .getByRole('link', { name: 'Auditoría' })
      .click()
    await page
      .getByRole('navigation', { name: 'Administración' })
      .getByRole('link', { name: 'Límites' })
      .click()
    await expect(page.getByLabel('Peticiones por minuto, por clave')).toHaveValue('1200')
    await page.getByRole('button', { name: 'Guardar el límite' }).click()
    await expect(status(page, 'Guardado.')).toBeFocused()
    await page.reload()
    await expect(page.getByLabel('Peticiones por minuto, por clave')).toHaveValue('1200')
  })
})

test.describe('administration: audit', () => {
  test('filters by who, action, brain and date; more by pages; the download asks for the same rows', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { 'admin-audit': 'much-data' })
    await page.goto('/admin/audit')
    const rows = page.getByRole('table', { name: 'Líneas de auditoría' }).getByRole('row')
    await expect(rows).toHaveCount(101)
    await page.getByRole('button', { name: /Mostrar 100 más/ }).click()
    await expect(rows).toHaveCount(201)
    await notOnBody(page)
    const filters = page.getByRole('group', { name: 'Filtrar la auditoría' })
    await filters.getByLabel('Quién').selectOption({ label: 'Ana' })
    await filters.getByLabel('Acción').fill('member.')
    await filters.getByLabel('Desde').fill('2026-10-01')
    await filters.getByLabel('Hasta').fill('2026-10-31')
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(rows.nth(1)).toContainText('member.')
    const n = await rows.count()
    const link = page.getByRole('link', { name: 'Descargar estas líneas (CSV)' })
    const href = new URL((await link.getAttribute('href')) as string, 'http://x')
    expect(href.pathname).toBe('/v1/admin/audit/export')
    expect(href.searchParams.get('actor')).toBe('acc_ana')
    expect(href.searchParams.get('action')).toBe('member.')
    expect(href.searchParams.get('to')).toBe(new Date(2026, 10, 1).toISOString())
    // The file holds exactly the lines on the screen.
    const csv = await (await page.request.get(href.pathname + href.search)).text()
    expect(csv.trim().split('\r\n').length - 1).toBe(n - 1)
    expect(csv).not.toMatch(/,=HYPERLINK/)
    // No lines: say so, and offer to clear.
    await filters.getByLabel('Acción').fill('nothing.')
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(page.getByText('No hay líneas para estos filtros.')).toBeVisible()
    await page.getByRole('button', { name: 'Quitar los filtros' }).first().first().click()
    await expect(rows).toHaveCount(101)
  })
})

test.describe('administration: backups & system', () => {
  test('the version and the health of the service, next to the copies (B7 PR30: test/browser/backups.spec.ts)', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const service = page.getByRole('region', { name: 'Servicio' })
    await expect(service).toContainText('0.1.0')
    await expect(service).toContainText('0020_branding_factory_keys')
    await expect(service).toContainText('2 de 200')
    await expect(service).toContainText('Tamaño de la base de datos')
    await expect(page.getByRole('region', { name: 'Copias' })).toContainText('Última copia buena')
  })

  test('the address of the LaKademIA panel: checked before it is sent, saved explicitly', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const field = page.getByLabel('Dirección del panel de LaKademIA')
    await field.fill('http://factory.example.test')
    await page.getByRole('button', { name: 'Guardar la dirección' }).click()
    await expect(page.getByText(/Usa una dirección https/)).toBeVisible()
    await expect(field).toBeFocused()
    await field.fill('https://factory.example.test')
    await page.getByRole('button', { name: 'Guardar la dirección' }).click()
    await expect(status(page, 'Guardado.')).toBeFocused()
    const me = await (await page.request.get('/v1/me')).json()
    expect(me.installation.factoryUrl).toBe('https://factory.example.test')
  })
})

test.describe('administration: branding', () => {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC',
    'base64',
  )

  test('a logo and a name shown in the header; an SVG refused before it is sent; removing asks first', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/branding')
    await expect(
      page.getByText(
        'Sin logo: la cabecera muestra la marca de ObsyBrain, y los emails muestran solo el nombre.',
      ),
    ).toBeVisible()
    const file = page.getByLabel('Elegir un logo')
    await file.setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') })
    await expect(page.getByText(/No se acepta SVG/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Subir este logo' })).toHaveCount(0)
    await file.setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('img', { name: 'El logo que elegiste' })).toBeVisible()
    await page.getByRole('button', { name: 'Subir este logo' }).click()
    await expect(status(page, /Logo subido/)).toBeFocused()
    await expect(page.locator('header .brand img')).toHaveAttribute('src', /\/v1\/branding\/logo\?v=/)
    // The name: saved explicitly, and shown in the header.
    const name = page.getByLabel('Nombre de esta instalación')
    await name.fill('Acme Brain')
    await page.getByRole('button', { name: 'Guardar el nombre' }).click()
    await expect(status(page, 'Guardado.')).toBeFocused()
    await expect(page.locator('header .brand .name')).toHaveText('Acme Brain')
    // Removing the logo asks first.
    await page.getByRole('button', { name: 'Quitar el logo' }).click()
    await page
      .getByRole('dialog', { name: '¿Quitar el logo?' })
      .getByRole('button', { name: 'Quitar el logo' })
      .click()
    await expect(
      status(
        page,
        'Logo quitado. La cabecera muestra la marca de ObsyBrain; los emails muestran solo el nombre.',
      ),
    ).toBeFocused()
    await expect(page.locator('header .brand img')).toHaveCount(0)
  })
})
