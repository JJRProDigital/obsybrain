// Admin › Backups & system and the wizard's step «Installation key» (spec B7 «Copias y restauración», plan T018, T019;
// CA10 web) against the fixture API: the copies with their key id and «Needs the older key», a copy by hand that says
// when it ends, a download, a restore that says what it loses and asks the name and the password before anything,
// then «Restaurado. Todo el mundo vuelve a iniciar sesión» on the sign-in page; the key only after the password, gone when hidden;
// the band at the top of the administration while the last copy failed, until a good one; the new release with what
// it changes; every state (loading, error, empty, off, too many), the keyboard, 320 px and axe.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, noSideScroll, PASSWORD, scenario, test } from './fixture.ts'

const KEY = 'fixture-installation-key-0123456789abcdefghijklmnop'

async function audit(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const bad = r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(bad).toEqual([])
}

const behind = (baseURL: string, id: string, change: Record<string, unknown>) =>
  fetch(`${baseURL}/__fixture/scenarios/${id}/admin-edit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(change),
  })

test.describe('Admin › Backups & system: the copies', () => {
  test('the copies with their date, kind, size and key id; one made with an older key says so and is not restored here', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const part = page.getByRole('region', { name: 'Copias' })
    await expect(part).toContainText('Última copia buena')
    await expect(part).toContainText('Todos los días a las 03:00 (Europe/Madrid), conservando las 14')
    await expect(part).toContainText('38.2 GB')
    const rows = part.locator('.copies > li')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(0)).toContainText('Diaria')
    await expect(rows.nth(0)).toContainText('clave fx12ab34cd56')
    await expect(rows.nth(2)).toContainText('A mano')
    await expect(rows.nth(2)).toContainText('Necesita la clave más vieja')
    const old = rows.nth(2).getByRole('button', { name: /Restaurar la copia de/ })
    await expect(old).toHaveAttribute('aria-disabled', 'true')
    await expect(rows.nth(2)).toContainText('restáurala en la máquina con esa clave')
    await audit(page, 'backups')
  })

  test('a copy by hand: «Making a copy…» while it runs, then «Copy made» with the keyboard there, and it is listed first', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const part = page.getByRole('region', { name: 'Copias' })
    const make = part.getByRole('button', { name: 'Hacer una copia ahora' })
    await make.focus()
    await page.keyboard.press('Enter')
    await expect(part.getByRole('button', { name: 'Haciendo una copia…' })).toBeVisible()
    await expect(part.getByRole('status').filter({ hasText: 'Copia hecha:' })).toBeFocused()
    await expect(part.locator('.copies > li')).toHaveCount(4)
    await expect(part.locator('.copies > li').first()).toContainText('A mano')
  })

  test('CA10: a copy that fails shows a band on every page of the administration until a good copy', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await behind(baseURL as string, s.id, { backupFailure: 'disk_full', nextCopy: 'disk_full' })
    await page.goto('/admin/people')
    const band = page.getByRole('alert').filter({ hasText: 'La última copia falló' })
    await expect(band).toContainText('el disco de las copias está lleno')
    await expect(band.getByRole('link', { name: 'Ver Copias y sistema' })).toBeVisible()
    await page.goto('/admin/email')
    await expect(band).toBeVisible()
    await audit(page, 'band')
    await page.goto('/admin/system')
    // Another copy by hand fails again: the band stays.
    await page.getByRole('button', { name: 'Hacer una copia ahora' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'La copia no terminó' })).toBeFocused()
    await expect(band).toBeVisible()
    // A good copy: the band is gone.
    await page.getByRole('button', { name: 'Hacer una copia ahora' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Copia hecha:' })).toBeFocused()
    await page.goto('/admin/people')
    await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible()
    await expect(page.getByText('La última copia falló')).toHaveCount(0)
  })

  test('a copy kept with a warning says so with its date', async ({ page, context, baseURL }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await behind(baseURL as string, s.id, { backupWarning: 'status_not_saved' })
    await page.goto('/admin/system')
    await expect(page.getByRole('note').filter({ hasText: 'Copia conservada con un aviso' })).toContainText(
      'no se pudo guardar su estado junto a las copias',
    )
  })

  test('downloading a copy is a plain link to the file', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const link = page
      .locator('.copies > li')
      .first()
      .getByRole('link', { name: /Descargar la copia de/ })
    const href = String(await link.getAttribute('href'))
    expect(href).toMatch(/^\/v1\/admin\/backups\/obsybrain-\d{8}T\d{6}Z-scheduled\/download$/)
    const res = await page.request.get(href)
    expect(res.headers()['content-disposition']).toMatch(/^attachment; filename="obsybrain-.*\.rscb"$/)
  })

  test('every state: loading, error, no copies yet, no folder for copies, many copies', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in', { 'admin-backups': 'loading' })
    await page.goto('/admin/system')
    const part = page.getByRole('region', { name: 'Copias' })
    await expect(part.locator('[data-state="loading"]')).toBeVisible()
    await s.state('admin-backups', 'error')
    await page.reload()
    await expect(part.getByRole('button', { name: 'Probar otra vez' })).toBeVisible()
    await s.state('admin-backups', 'normal')
    await part.getByRole('button', { name: 'Probar otra vez' }).click()
    await expect(part.locator('.copies > li')).toHaveCount(3)

    const e = await scenario(context, baseURL as string, 'signed-in', { 'admin-backups': 'empty' })
    await page.goto('/admin/system')
    await expect(part).toContainText('Aún sin copias.')
    await expect(part).toContainText('La copia diaria corre a las 03:00; o haz una ahora.')
    await expect(part).toContainText('Ninguna todavía')
    await behind(baseURL as string, e.id, { backupsOff: true })
    await page.reload()
    await expect(part).toContainText('No hay carpeta para las copias configurada')
    await expect(part).toContainText('OBSY_BRAIN_BACKUPS')
    await expect(part.getByRole('button', { name: 'Hacer una copia ahora' })).toHaveCount(0)

    await scenario(context, baseURL as string, 'signed-in', { 'admin-backups': 'much-data' })
    await page.goto('/admin/system')
    await expect(part.locator('.copies > li')).toHaveCount(10)
    await part.getByRole('button', { name: 'Mostrar todas las 40 copias' }).click()
    await expect(part.locator('.copies > li')).toHaveCount(40)
  })

  test('offline: the copy and the restore wait, and say why', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    await expect(page.locator('.copies > li')).toHaveCount(3)
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByRole('button', { name: 'Hacer una copia ahora' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expect(
      page
        .locator('.copies > li')
        .first()
        .getByRole('button', { name: /Restaurar la copia de/ }),
    ).toHaveAttribute('aria-disabled', 'true')
    await context.setOffline(false)
  })

  test('only the administration: a member sees why, and no copy', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto('/admin/system')
    await expect(page.getByText('Solo la administración de esta instalación abre esto.')).toBeVisible()
    await expect(page.locator('.copies')).toHaveCount(0)
  })

  test('320 px: nothing scrolls sideways, the restore dialog included', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await behind(baseURL as string, s.id, {
      backupFailure: 'no_permission',
      release: { latest: 'v0.2.0', notes: 'x'.repeat(400), checkedAt: '2026-10-29T08:00:00.000Z' },
    })
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto('/admin/system')
    await expect(page.locator('.copies > li')).toHaveCount(3)
    await noSideScroll(page)
    await page
      .locator('.copies > li')
      .first()
      .getByRole('button', { name: /Restaurar la copia de/ })
      .click()
    await expect(page.getByLabel('Nombre de esta instalación')).toBeVisible()
    await noSideScroll(page)
    await audit(page, 'restore dialog at 320')
  })
})

test.describe('Admin › Backups & system: restoring', () => {
  test('risk 9: says what is lost, asks the name and the password, then «Restaurado. Todo el mundo vuelve a iniciar sesión»', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    await page
      .locator('.copies > li')
      .first()
      .getByRole('button', { name: /Restaurar la copia de/ })
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Todo lo que hay aquí se reemplaza por esta copia')
    await expect(dialog).toContainText('Lo que se escribió después se pierde: la última escritura aquí fue')
    await expect(dialog).toContainText('Primero, obsybrain hace una copia de lo que hay ahora')
    await expect(dialog).toContainText('todo el mundo vuelve a iniciar sesión')
    await audit(page, 'restore')
    // Nothing goes until the name and the password are there.
    let sent = 0
    page.on('request', (r) => {
      if (r.method() === 'POST' && /\/restore$/.test(r.url())) sent++
    })
    await dialog.getByRole('button', { name: 'Restaurar esta copia' }).click()
    await expect(dialog.getByLabel('Nombre de esta instalación')).toBeFocused()
    await expect(dialog).toContainText('Escribe el nombre de esta instalación: obsybrain')
    expect(sent).toBe(0)
    // A name not exactly the installation's.
    await dialog.getByLabel('Nombre de esta instalación').fill('RSC-brain')
    await dialog.getByLabel('Tu contraseña').fill(PASSWORD)
    await dialog.getByRole('button', { name: 'Restaurar esta copia' }).click()
    await expect(dialog).toContainText('Escribe el nombre exactamente como es: obsybrain')
    expect(sent).toBe(0)
    // A wrong password: said on the field, nothing restored, still signed in.
    await dialog.getByLabel('Nombre de esta instalación').fill('obsybrain')
    await dialog.getByLabel('Tu contraseña').fill('not the password')
    await dialog.getByRole('button', { name: 'Restaurar esta copia' }).click()
    await expect(dialog).toContainText('The password is not right.')
    await expect(dialog.getByLabel('Tu contraseña')).toBeFocused()
    await expect(dialog.getByLabel('Tu contraseña')).toHaveValue('')
    await expect(page).toHaveURL(/\/admin\/system$/)
    // Right: restored, then to sign in, with the words.
    await dialog.getByLabel('Tu contraseña').fill(PASSWORD)
    await dialog.getByRole('button', { name: 'Restaurar esta copia' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(
      page.getByRole('status').filter({ hasText: 'Restaurado. Todo el mundo vuelve a iniciar sesión' }),
    ).toBeVisible()
    await expect(page.getByText('Tu sesión terminó')).toHaveCount(0)
    expect((await page.request.get('/v1/me')).status()).toBe(401)
  })

  test('while a restore is running the dialog stays (Esc, Close, backdrop); its answer is shown; Restore opens again', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    let release: () => void = () => {}
    const held = new Promise<void>((r) => {
      release = r
    })
    await page.route('**/v1/admin/backups/*/restore', async (route) => {
      await held
      await route.fulfill({
        status: 409,
        json: {
          error: {
            code: 'backup_running',
            message: 'Se está haciendo una copia ahora (la diaria).',
            howToProceed: 'Try again when it ends.',
          },
        },
      })
    })
    await page.goto('/admin/system')
    const open = page
      .locator('.copies > li')
      .first()
      .getByRole('button', { name: /Restaurar la copia de/ })
    await open.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nombre de esta instalación').fill('obsybrain')
    await dialog.getByLabel('Tu contraseña').fill(PASSWORD)
    await dialog.getByRole('button', { name: 'Restaurar esta copia' }).click()
    await expect(dialog.getByRole('button', { name: /Restaurando/ })).toBeVisible()
    // Twice: the browser lets a second Esc close a dialog whose first was refused (close watchers).
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Restaurando/ })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cerrar' })).toHaveAttribute('aria-disabled', 'true')
    await dialog.getByRole('button', { name: 'Cerrar' }).click({ force: true })
    await page.mouse.click(5, 5)
    await expect(dialog).toBeVisible()
    release()
    await expect(dialog).toContainText('Se está haciendo una copia ahora (la diaria).')
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await open.click()
    await expect(page.getByRole('dialog').getByLabel('Nombre de esta instalación')).toBeVisible()
  })

  test('Esc keeps things as they are; the keyboard goes back to the button that opened it', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const open = page
      .locator('.copies > li')
      .first()
      .getByRole('button', { name: /Restaurar la copia de/ })
    await open.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Nombre de esta instalación')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(open).toBeFocused()
  })
})

test.describe('Admin › Backups & system: the installation key', () => {
  test('only after the password; copy, download, then hidden and gone from the page', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const part = page.getByRole('region', { name: 'Clave de instalación' })
    await expect(part).toContainText('fx12ab34cd56')
    await expect(page.locator('body')).not.toContainText(KEY)
    await part.getByRole('button', { name: 'Mostrar la clave de instalación…' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Tu contraseña')).toBeFocused()
    await dialog.getByRole('button', { name: 'Mostrar la clave' }).click()
    await expect(dialog).toContainText('Escribe tu contraseña.')
    await dialog.getByLabel('Tu contraseña').fill('wrong one')
    await dialog.getByRole('button', { name: 'Mostrar la clave' }).click()
    await expect(dialog).toContainText('The password is not right.')
    await expect(page).toHaveURL(/\/admin\/system$/)
    await expect(page.locator('body')).not.toContainText(KEY)
    await dialog.getByLabel('Tu contraseña').fill(PASSWORD)
    await dialog.getByRole('button', { name: 'Mostrar la clave' }).click()
    await expect(dialog).toContainText(KEY)
    await expect(dialog.getByRole('button', { name: 'Copiar la clave' })).toBeFocused()
    const download = page.waitForEvent('download')
    await dialog.getByRole('link', { name: 'Descargar la clave (.txt)' }).click()
    const file = await download
    expect(file.suggestedFilename()).toBe('obsybrain-key-obsybrain-fx12ab34cd56.txt')
    const path = await file.path()
    const { readFile } = await import('node:fs/promises')
    expect((await readFile(path, 'utf8')).trim()).toBe(KEY)
    await audit(page, 'key shown')
    await dialog.getByRole('button', { name: 'Listo, ocultar la clave' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'La clave está oculta' })).toBeFocused()
    await expect(page.locator('body')).not.toContainText(KEY)
  })

  test('a one-time secret: put away (pagehide), the key shown is forgotten', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    await page.getByRole('button', { name: 'Mostrar la clave de instalación…' }).click()
    await page.getByRole('dialog').getByLabel('Tu contraseña').fill(PASSWORD)
    await page.getByRole('dialog').getByRole('button', { name: 'Mostrar la clave' }).click()
    await expect(page.getByRole('dialog')).toContainText(KEY)
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
    await expect(page.locator('body')).not.toContainText(KEY)
    // Opened again, it asks the password again: nothing was kept.
    await page.getByRole('button', { name: 'Mostrar la clave de instalación…' }).click()
    await expect(page.getByRole('dialog').getByLabel('Tu contraseña')).toBeVisible()
    await expect(page.locator('body')).not.toContainText(KEY)
  })

  test('with a second factor the code is asked too', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.route('**/v1/me', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.account.totp = true
      await route.fulfill({ response: res, json: body })
    })
    await page.goto('/admin/system')
    await page.getByRole('button', { name: 'Mostrar la clave de instalación…' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Tu contraseña').fill(PASSWORD)
    await dialog.getByRole('button', { name: 'Mostrar la clave' }).click()
    await expect(dialog.getByLabel('Código de tu app de autenticación')).toBeFocused()
  })
})

test.describe('Admin › Backups & system: the version', () => {
  test('a newer version says so in the exact words, with what it changes and how to update; none checked says so', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/system')
    const service = page.getByRole('region', { name: 'Servicio' })
    await expect(service).toContainText(
      'Corre la versión v0.1.0. Aún no se comprobó si hay una versión nueva.',
    )
    await behind(baseURL as string, s.id, {
      release: { latest: 'v0.2.0', notes: '- Faster search.', checkedAt: new Date().toISOString() },
    })
    await page.reload()
    await expect(service).toContainText('Corre la versión v0.1.0. La versión v0.2.0 está disponible.')
    await service.getByText('Qué cambia en v0.2.0').click()
    await expect(service).toContainText('- Faster search.')
    await expect(service).toContainText('obsybrain.sh update')
  })

  test('the newest says so; ahead of what is published says that, not that a new one exists', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await behind(baseURL as string, s.id, {
      release: { latest: 'v0.1.0', notes: '', checkedAt: new Date().toISOString() },
    })
    await page.goto('/admin/system')
    const service = page.getByRole('region', { name: 'Servicio' })
    await expect(service).toContainText('Corre la versión v0.1.0. Esta es la más nueva.')
    await behind(baseURL as string, s.id, {
      release: { latest: 'v0.0.9', notes: '', checkedAt: new Date().toISOString() },
    })
    await page.reload()
    await expect(service).toContainText('va por delante de la versión publicada más nueva (v0.0.9)')
    await expect(service).not.toContainText('Esta es la más nueva')
  })

  test('a private repository: Could not check, with the command; never up to date, even if it knew the answer before', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    const at = new Date().toISOString()
    await behind(baseURL as string, s.id, {
      release: { latest: null, notes: null, checkedAt: null, error: 'no_access', lastAttemptAt: at },
    })
    await page.goto('/admin/system')
    const service = page.getByRole('region', { name: 'Servicio' })
    await expect(service).toContainText('No se pudo comprobar si hay una versión nueva')
    await expect(service).toContainText('Corre la versión v0.1.0.')
    await expect(service.locator('code', { hasText: 'obsybrain.sh update --check' })).toBeVisible()
    // The last answer was days ago, the last try minutes ago: «Tried» says the try.
    const days = new Date(Date.now() - 3 * 86_400_000).toISOString()
    const minutes = new Date(Date.now() - 5 * 60_000).toISOString()
    await behind(baseURL as string, s.id, {
      release: { latest: 'v0.1.0', notes: '', checkedAt: days, error: 'network', lastAttemptAt: minutes },
    })
    await page.reload()
    await expect(service).toContainText('No se pudo comprobar si hay una versión nueva')
    await expect(service).not.toContainText('Esta es la más nueva')
    await expect(service).toContainText('Intentado hace 5 min.')
    await expect(service).not.toContainText(/\b3 days ago/)
  })

  test('a newer version it knew stays said when the last check failed', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    const at = new Date().toISOString()
    await behind(baseURL as string, s.id, {
      release: { latest: 'v0.2.0', notes: '- Two.', checkedAt: at, error: 'network', lastAttemptAt: at },
    })
    await page.goto('/admin/system')
    const service = page.getByRole('region', { name: 'Servicio' })
    await expect(service).toContainText('Corre la versión v0.1.0. La versión v0.2.0 está disponible.')
    await expect(service).not.toContainText('No se pudo comprobar')
    await expect(service).toContainText('Comprobado')
  })

  test('no version published says that, not a failure', async ({ page, context, baseURL }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    const at = new Date().toISOString()
    await behind(baseURL as string, s.id, {
      release: { latest: null, notes: null, checkedAt: at, error: 'none', lastAttemptAt: at },
    })
    await page.goto('/admin/system')
    const service = page.getByRole('region', { name: 'Servicio' })
    await expect(service).toContainText('No se puede actualizar: todavía no hay versión publicada')
    await expect(service).not.toContainText('No se pudo comprobar')
  })
})

test.describe('first-time setup: the step «Installation key»', () => {
  test('see it, copy it, download it, tick that it is saved, then in; a reload does not show it again', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'fresh')
    await page.goto('/setup')
    await page.getByLabel('Nombre de esta instalación').fill('Acme')
    await page.getByLabel('Tu nombre').fill('Ada')
    await page.getByLabel('Tu email').fill('ada@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await expect(
      page.getByRole('heading', { level: 1, name: 'Guarda la clave de instalación' }),
    ).toBeFocused()
    await expect(page.locator('pre')).toContainText(KEY)
    await expect(page.getByText('Id de la clave: fx12ab34cd56')).toBeVisible()
    await audit(page, 'key step')
    const download = page.waitForEvent('download')
    await page.getByRole('link', { name: 'Descargar la clave (.txt)' }).click()
    expect((await download).suggestedFilename()).toBe('obsybrain-key-acme-fx12ab34cd56.txt')
    // Not before it is saved.
    const go = page.getByRole('button', { name: 'Continuar a obsybrain' })
    await expect(go).toHaveAttribute('aria-disabled', 'true')
    await go.click({ force: true })
    await expect(
      page.getByLabel('Guardé la clave de instalación en un lugar seguro, fuera de esta máquina'),
    ).toBeFocused()
    await page.keyboard.press('Space')
    await go.click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('body')).not.toContainText(KEY)
    // Shown once: the server says it was given.
    const again = await page.request.post('/v1/setup/key', {
      headers: { 'x-requested-with': 'obsybrain-web' },
      data: {},
    })
    expect(again.status()).toBe(404)
  })

  test('a one-time secret: put away (pagehide), the key of the step is forgotten', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'fresh')
    await page.goto('/setup')
    await page.getByLabel('Nombre de esta instalación').fill('Acme')
    await page.getByLabel('Tu nombre').fill('Ada')
    await page.getByLabel('Tu email').fill('ada@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await expect(page.locator('pre')).toContainText(KEY)
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
    await expect(page.locator('body')).not.toContainText(KEY)
    await expect(page.getByRole('heading', { level: 1, name: 'La clave ya se mostró' })).toBeVisible()
    await expect(page.getByText('Administración › Copias y sistema')).toBeVisible()
  })

  test('the key cannot be read (a failure): try again, or go on and download it later', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'fresh')
    await page.route('**/v1/setup/key', (route) =>
      route.fulfill({
        status: 500,
        json: {
          error: {
            code: 'internal',
            message: 'Something went wrong on the server.',
            howToProceed: 'Probar otra vez.',
          },
        },
      }),
    )
    await page.goto('/setup')
    await page.getByLabel('Nombre de esta instalación').fill('Acme')
    await page.getByLabel('Tu nombre').fill('Ada')
    await page.getByLabel('Tu email').fill('ada@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await expect(page.getByRole('button', { name: 'Probar otra vez' })).toBeVisible()
    await expect(
      page.getByText('Puedes descargar la clave más tarde en Administración › Copias y sistema'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Continuar a obsybrain' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('320 px and keyboard on the step', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'fresh')
    await page.setViewportSize({ width: 320, height: 700 })
    await page.goto('/setup')
    await page.getByLabel('Nombre de esta instalación').fill('Acme')
    await page.getByLabel('Tu nombre').fill('Ada')
    await page.getByLabel('Tu email').fill('ada@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.keyboard.press('Enter')
    await expect(page.locator('pre')).toContainText(KEY)
    await noSideScroll(page)
  })
})
