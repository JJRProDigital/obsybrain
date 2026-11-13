// Profile (spec B6 «Profile», CA13, plan T042) against the fixture API: tokens made with a name, brains,
// permission and expiry, shown once and never again; the list with the last 4 characters, last use,
// client and expiry; revoking; connected apps; email notices by brain; a new password; the second
// factor; signing out everywhere. Each state of the screen is designed: loading, empty, error, offline,
// much data; and nothing scrolls sideways at 320 px.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { CODE, expect, noSideScroll, PASSWORD, scenario, test } from './fixture.ts'

// CA13: the secret is nowhere the page keeps or shows: not in the DOM (text or the value of a field),
// not in storage, not in the address, not in the history entry.
async function secretGone(page: Page, secret: string) {
  const kept = await page.evaluate(() => {
    const values = [
      ...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea'),
    ].map((x) => x.value)
    return [
      document.documentElement.outerHTML,
      values.join('\n'),
      JSON.stringify({ ...sessionStorage }),
      JSON.stringify({ ...localStorage }),
      location.href,
      JSON.stringify(history.state),
    ].join('\n')
  })
  expect(kept.includes(secret), 'the token is nowhere on the page or in what it keeps').toBe(false)
}

test('v0.6 CA17: a curator sees and changes whether a token writes to the wiki directly, also when making it', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const tokens = page.getByRole('region', { name: 'Tokens' })
  const laptop = tokens.getByRole('listitem').filter({ hasText: 'Claude Code laptop' })
  const growth = laptop.getByRole('checkbox', { name: 'Puede escribir en el wiki de Growth' })
  await expect(growth).not.toBeChecked()
  await growth.check()
  await expect(tokens.getByRole('status')).toContainText(
    'Claude Code laptop ya puede escribir en el wiki de Growth directamente.',
  )
  await expect(growth).toBeChecked()
  await growth.uncheck()
  await expect(tokens.getByRole('status')).toContainText('Claude Code laptop vuelve a proponer en Growth.')
  // A read-only token is never offered it.
  const ci = tokens.getByRole('listitem').filter({ hasText: 'CI reader' })
  await expect(ci.getByRole('checkbox')).toHaveCount(0)
  // When making one: only with read + write, only brains where I am a curator.
  await tokens.getByRole('button', { name: 'Crear un token' }).click()
  const form = tokens.getByRole('form', { name: 'Token nuevo' })
  await form.getByLabel('Nombre').fill('Agent that writes')
  await form.getByRole('checkbox', { name: 'Puede escribir en el wiki de Growth' }).check()
  await form.getByRole('button', { name: 'Crear token' }).click()
  await expect(tokens.getByText('Agent that writes')).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('CA13: a token is made with a name, brains, permission and expiry; shown once; then never again', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
  const tokens = page.getByRole('region', { name: 'Tokens' })
  // The list: last 4 characters, last use and client, expiry; one that ends soon says so.
  const laptop = tokens.getByRole('listitem').filter({ hasText: 'Claude Code laptop' })
  await expect(laptop).toContainText('…k3Qa')
  await expect(laptop).toContainText('por Claude Code')
  await expect(laptop).toContainText('Lectura y escritura')
  await expect(laptop).toContainText('Todos tus brains')
  const ci = tokens.getByRole('listitem').filter({ hasText: 'CI reader' })
  await expect(ci).toContainText('Nunca usado')
  await expect(ci).toContainText('growth, support')
  await expect(ci).toContainText('Vence pronto')

  await tokens.getByRole('button', { name: 'Crear un token' }).click()
  const form = tokens.getByRole('form', { name: 'Token nuevo' })
  // What is wrong is said before anything is sent.
  await form.getByRole('button', { name: 'Crear token' }).click()
  await expect(form.getByText('Introduce un nombre.')).toBeVisible()
  await expect(form.getByLabel('Nombre')).toBeFocused()
  await form.getByLabel('Nombre').fill('Codex desktop')
  await form.getByLabel('Solo estos brains').check()
  await form.getByRole('button', { name: 'Crear token' }).click()
  await expect(form.getByText('Elige al menos un brain, o todos.')).toBeVisible()
  await form.getByRole('checkbox', { name: 'Growth' }).check()
  await form.getByLabel('Solo lectura').check()
  await form.getByLabel('Vence en').selectOption('30')
  await form.getByRole('button', { name: 'Crear token' }).click()

  const once = tokens.getByRole('region', { name: 'Tu token nuevo' })
  await expect(once).toContainText('solo esta vez')
  const copy = once.getByRole('button', { name: 'Copiar el token' })
  await expect(copy).toBeFocused()
  const secret = String(await once.locator('pre code').textContent()).trim()
  expect(secret).toMatch(/^rscb_/)
  // The list already has it, by its last 4 characters only.
  const row = tokens.getByRole('listitem').filter({ hasText: 'Codex desktop' })
  await expect(row).toContainText(`…${secret.slice(-4)}`)
  await expect(row).toContainText('Solo lectura')
  await expect(row).toContainText('growth')
  await expect(row).not.toContainText(secret)

  await once.getByRole('button', { name: 'Listo, ocultar el token' }).click()
  await expect(once).toHaveCount(0)
  await expect(tokens.getByRole('status')).toContainText('ya está oculto')
  // The keyboard stays in the section, on what it says (never dropped to the page).
  await expect(tokens.getByRole('status')).toBeFocused()
  await secretGone(page, secret)
  // Not after coming back, nor after a reload.
  await page.goto('/')
  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
  await secretGone(page, secret)
  await page.reload()
  await expect(tokens.getByRole('listitem').filter({ hasText: 'Codex desktop' })).toBeVisible()
  await secretGone(page, secret)
})

test('a token shown once survives no copy fallback: the field to copy by hand goes with it', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  // No clipboard here (plain http on a local network): the token shows in a field to copy by hand.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  })
  await page.goto('/profile/tokens')
  const tokens = page.getByRole('region', { name: 'Tokens' })
  await tokens.getByRole('button', { name: 'Crear un token' }).click()
  await tokens.getByLabel('Nombre').fill('A mano')
  await tokens.getByRole('button', { name: 'Crear token' }).click()
  const once = tokens.getByRole('region', { name: 'Tu token nuevo' })
  const secret = String(await once.locator('pre code').textContent()).trim()
  await once.getByRole('button', { name: 'Copiar el token' }).click()
  await expect(once.getByLabel('Copia este texto')).toHaveValue(secret)
  await expect(once.getByLabel('Copia este texto')).toBeFocused()
  await once.getByRole('button', { name: 'Listo, ocultar el token' }).click()
  await secretGone(page, secret)
})

test('revoking a token and a connected app asks first, then says it is done', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const tokens = page.getByRole('region', { name: 'Tokens' })
  const ci = tokens.getByRole('listitem').filter({ hasText: 'CI reader' })
  await ci.getByRole('button', { name: 'Revocar' }).click()
  await expect(ci).toContainText('Los agentes que lo usan se detienen en su siguiente petición.')
  await ci.getByRole('button', { name: 'Conservarlo' }).click()
  await expect(ci.getByRole('button', { name: 'Revocar' })).toBeFocused()
  await ci.getByRole('button', { name: 'Revocar' }).click()
  await ci.getByRole('button', { name: 'Revocar CI reader' }).click()
  await expect(tokens.getByRole('listitem').filter({ hasText: 'CI reader' })).toHaveCount(0)
  await expect(tokens.getByRole('status')).toContainText('CI reader quedó revocado.')

  const apps = page.getByRole('region', { name: 'Apps conectadas' })
  const cursor = apps.getByRole('listitem').filter({ hasText: 'Cursor' })
  await expect(cursor).toContainText('Growth')
  await expect(cursor).toContainText('Lectura y escritura')
  await expect(cursor).toContainText(/Último uso/)
  await cursor.getByRole('button', { name: 'Revocar' }).click()
  await cursor.getByRole('button', { name: 'Revocar Cursor' }).click()
  await expect(apps.getByRole('status')).toContainText('Cursor quedó revocado.')
  await expect(apps).toContainText('Sin apps conectadas')
  await expect(apps.getByRole('link', { name: 'Conecta tu agente' })).toBeVisible()
})

test('email notices: a curator turns them on and off by brain; others learn why they cannot', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const notices = page.getByRole('region', { name: 'Avisos por email' })
  const growth = notices.getByRole('checkbox', { name: /Growth/ })
  await expect(growth).not.toBeChecked()
  await growth.check()
  await expect(notices.getByRole('status')).toContainText('Growth: activado')
  await page.reload()
  await expect(notices.getByRole('checkbox', { name: /Growth/ })).toBeChecked()
  await expect(notices.getByRole('listitem').filter({ hasText: 'Support' })).toContainText(
    'Solo los curadores reciben estos',
  )
  await expect(notices.getByRole('checkbox', { name: /Support/ })).toHaveCount(0)
})

test('a new password: the wrong current one is said and kept; the right one changes it', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const pw = page.getByRole('form', { name: 'Cambia tu contraseña' })
  await pw.getByLabel('Contraseña actual').fill('not my password at all')
  await pw.getByLabel('Contraseña nueva').fill('a much longer passphrase')
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(pw.getByRole('alert')).toContainText('The current password is not right.')
  await expect(pw.getByLabel('Contraseña nueva')).toHaveValue('a much longer passphrase')
  await pw.getByLabel('Contraseña actual').fill(PASSWORD)
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(pw.getByRole('status')).toContainText(
    'Contraseña cambiada. Tus otras sesiones cerraron sesión.',
  )
  await expect(pw.getByLabel('Contraseña actual')).toHaveValue('')
  await expect(pw.getByLabel('Contraseña nueva')).toHaveValue('')
})

test('a wrong current password marks its field; the right one says what still works', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const pw = page.getByRole('form', { name: 'Cambia tu contraseña' })
  await pw.getByLabel('Contraseña actual').fill('not my password at all')
  await pw.getByLabel('Contraseña nueva').fill('a much longer passphrase')
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(pw.getByLabel('Contraseña actual')).toHaveAttribute('aria-invalid', 'true')
  await expect(pw.getByLabel('Contraseña actual')).toBeFocused()
  await expect(pw.getByLabel('Contraseña nueva')).not.toHaveAttribute('aria-invalid', 'true')
  await pw.getByLabel('Contraseña actual').fill(PASSWORD)
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  // Two working tokens (the expired one does not count) and one app.
  await expect(pw.getByRole('status')).toContainText(
    'Contraseña cambiada. Tus otras sesiones cerraron sesión. Tus 2 tokens y 1 app conectada siguen funcionando.',
  )
  await expect(pw.getByLabel('Contraseña actual')).not.toHaveAttribute('aria-invalid', 'true')
})

test('a new password is said even when the lists cannot be read again; an ended app is not counted', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  await expect(page.getByRole('region', { name: 'Apps conectadas' })).toBeVisible()
  // The apps list now holds an ended app beside the working one.
  let fail = false
  await page.route('**/v1/me/apps', async (route) => {
    if (fail)
      return route.fulfill({
        status: 503,
        json: { error: { code: 'unavailable', message: 'Down.', howToProceed: 'Wait.' } },
      })
    const res = await route.fetch()
    const body = (await res.json()) as { apps: Array<Record<string, unknown>> }
    const first = body.apps[0] as Record<string, unknown>
    body.apps.push({ ...first, id: 'gr_ended', ended: true })
    return route.fulfill({ response: res, json: body })
  })
  const pw = page.getByRole('form', { name: 'Cambia tu contraseña' })
  await pw.getByLabel('Contraseña actual').fill(PASSWORD)
  await pw.getByLabel('Contraseña nueva').fill('a much longer passphrase')
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(pw.getByRole('status')).toContainText('Tus 2 tokens y 1 app conectada siguen funcionando.')
  fail = true
  await pw.getByLabel('Contraseña actual').fill('a much longer passphrase')
  await pw.getByLabel('Contraseña nueva').fill('another long passphrase here')
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(pw.getByRole('status')).toHaveText('Contraseña cambiada. Tus otras sesiones cerraron sesión.')
})

test('with a second factor on, a new password asks for the code too', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'member')
  await page.goto('/profile')
  const pw = page.getByRole('form', { name: 'Cambia tu contraseña' })
  await pw.getByLabel('Contraseña actual').fill(PASSWORD)
  await pw.getByLabel('Contraseña nueva').fill('a much longer passphrase')
  await pw.getByLabel('Código de tu app de autenticación').fill('000000')
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(pw.getByRole('alert')).toContainText('El código no es correcto.')
  await expect(pw.getByLabel('Código de tu app de autenticación')).toHaveAttribute('aria-invalid', 'true')
  await pw.getByLabel('Código de tu app de autenticación').fill(CODE)
  await pw.getByRole('button', { name: 'Cambiar contraseña' }).click()
  await expect(pw.getByRole('status')).toContainText(
    'Contraseña cambiada. Tus otras sesiones cerraron sesión.',
  )
})

test('«Revoke all tokens and apps» asks first, then says how many', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const all = page.getByRole('region', { name: 'Revocar todo' })
  await all.getByRole('button', { name: 'Revocar todos los tokens y apps' }).click()
  await expect(all).toContainText('Todo agente y programa que los use se detiene en su siguiente petición.')
  await all.getByRole('button', { name: 'Sí, revocarlos todos' }).click()
  await expect(all.getByRole('status')).toContainText('3 tokens y 1 app conectada quedaron revocados.')
  await expect(page.getByRole('region', { name: 'Tokens' })).toContainText('Aún sin tokens')
  await expect(page.getByRole('region', { name: 'Apps conectadas' })).toContainText('Sin apps conectadas')
})

test('expired tokens are in a group of their own; connected apps name their brains', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const tokens = page.getByRole('region', { name: 'Tokens' })
  const expired = tokens.getByRole('list', { name: 'Vencido' })
  await expect(expired.getByRole('listitem')).toHaveCount(1)
  await expect(expired).toContainText('Old laptop')
  await expect(expired).toContainText('Venció el 30 ago 2026')
  await expect(tokens.getByRole('list', { name: 'Tus tokens' })).not.toContainText('Old laptop')
  const cursor = page
    .getByRole('region', { name: 'Apps conectadas' })
    .getByRole('listitem')
    .filter({ hasText: 'Cursor' })
  await expect(cursor).toContainText('Growth')
  await expect(cursor).not.toContainText('growth')
})

test('email notices: a refusal puts the box back and says why', async ({ page, context, baseURL }) => {
  const s = await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const notices = page.getByRole('region', { name: 'Avisos por email' })
  const growth = notices.getByRole('checkbox', { name: /Growth/ })
  await expect(growth).not.toBeChecked()
  await s.state('notify', 'error')
  await growth.click()
  await expect(notices.getByRole('alert')).toContainText('Something went wrong on the server')
  await expect(growth).not.toBeChecked()
})

test('the second factor: a code that is not 6 digits is said at once, without asking the server', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const tf = page.getByRole('region', { name: 'Segundo factor' })
  await tf.getByRole('button', { name: 'Activar' }).click()
  await expect(tf.getByRole('img', { name: 'Código QR de la clave' })).toBeVisible()
  // The keyboard is on the code, put there by the screen.
  await expect(tf.getByLabel('Código de la app')).toBeFocused()
  let asked = 0
  page.on('request', (r) => {
    if (r.url().endsWith('/v1/me/totp/confirm')) asked += 1
  })
  await tf.getByLabel('Código de la app').fill('12')
  await tf.getByRole('button', { name: 'Activar' }).click()
  await expect(tf.getByRole('alert')).toContainText('Escribe los 6 dígitos que muestra tu app.')
  expect(asked).toBe(0)
  // Cancel gives the keyboard back to the button that opened it.
  await tf.getByRole('button', { name: 'Cancelar' }).click()
  await expect(tf.getByRole('button', { name: 'Activar' })).toBeFocused()
  await tf.getByRole('button', { name: 'Activar' }).click()
  await tf.getByLabel('Código de la app').fill(CODE)
  await tf.getByRole('button', { name: 'Activar' }).click()
  await expect(tf.getByRole('status')).toContainText('El segundo factor está activado.')
  await expect(tf.getByRole('status')).toBeFocused()
})

test('a token or a key shown is forgotten when the page goes to the back/forward cache', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const tokens = page.getByRole('region', { name: 'Tokens' })
  await tokens.getByRole('button', { name: 'Crear un token' }).click()
  await tokens.getByLabel('Nombre').fill('Cached')
  await tokens.getByRole('button', { name: 'Crear token' }).click()
  const secret = String(
    await tokens.getByRole('region', { name: 'Tu token nuevo' }).locator('pre code').textContent(),
  ).trim()
  await page.getByRole('region', { name: 'Segundo factor' }).getByRole('button', { name: 'Activar' }).click()
  await expect(page.getByText('JBSW Y3DP')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
  await expect(tokens.getByRole('region', { name: 'Tu token nuevo' })).toHaveCount(0)
  await expect(page.getByText('JBSW Y3DP')).toHaveCount(0)
  await secretGone(page, secret)
})

test('the second factor: turned on with a code from the app, and off again', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const tf = page.getByRole('region', { name: 'Segundo factor' })
  await expect(tf).toContainText('Desactivado')
  await tf.getByRole('button', { name: 'Activar' }).click()
  await expect(tf).toContainText('JBSW Y3DP EHPK 3PXP JBSW Y3DP')
  await expect(tf.getByRole('link', { name: 'Abrir en tu app de autenticación' })).toHaveAttribute(
    'href',
    /^otpauth:\/\/totp\//,
  )
  await tf.getByLabel('Código de la app').fill('000000')
  await tf.getByRole('button', { name: 'Activar' }).click()
  await expect(tf.getByRole('alert')).toContainText('El código no es correcto.')
  await tf.getByLabel('Código de la app').fill(CODE)
  await tf.getByRole('button', { name: 'Activar' }).click()
  await expect(tf.getByRole('status')).toContainText('El segundo factor está activado.')
  await expect(tf).not.toContainText('JBSW')
  await tf.getByRole('button', { name: 'Desactivar' }).click()
  await tf.getByLabel('Código de la app').fill(CODE)
  await tf.getByRole('button', { name: 'Desactivar el segundo factor' }).click()
  await expect(tf.getByRole('status')).toContainText('El segundo factor está desactivado.')
})

test('sign out everywhere asks first, then leads to sign-in', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  const out = page.getByRole('region', { name: 'Cerrar sesión en todos lados' })
  await out.getByRole('button', { name: 'Cerrar sesión en todos lados' }).click()
  await expect(out).toContainText('Los tokens y apps conectadas siguen funcionando')
  await out.getByRole('button', { name: 'Sí, cerrar sesión en todos lados' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('status').filter({ hasText: 'Sesión cerrada.' })).toBeVisible()
})

test('the account menu leads to the profile and to connecting an agent', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'member')
  await page.goto('/')
  await page.getByRole('button', { name: /Cuenta/ }).click()
  await page.locator('#account-menu').getByRole('link', { name: 'Perfil' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Perfil' })).toBeVisible()
  await page.getByRole('button', { name: /Cuenta/ }).click()
  await page.locator('#account-menu').getByRole('link', { name: 'Conecta tu agente' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Conecta tu agente' })).toBeVisible()
})

test('states: loading has the shape, empty says what a token is, an error offers to try again', async ({
  page,
  context,
  baseURL,
}) => {
  const s = await scenario(context, baseURL as string, 'signed-in', { tokens: 'loading', apps: 'empty' })
  await page.goto('/profile')
  const tokens = page.getByRole('region', { name: 'Tokens' })
  await expect(tokens.locator('[data-state="loading"]')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Apps conectadas' })).toContainText('Sin apps conectadas')
  await s.state('tokens', 'empty')
  await page.reload()
  await expect(tokens.locator('[data-state="empty"]')).toContainText('Aún sin tokens')
  await s.state('tokens', 'error')
  await page.reload()
  await expect(tokens.getByRole('alert')).toContainText('Esto no cargó')
  await s.state('tokens', 'normal')
  await tokens.getByRole('button', { name: 'Probar otra vez' }).click()
  await expect(tokens.getByRole('listitem').filter({ hasText: 'CI reader' })).toBeVisible()
})

test('much data: tokens come 20 at a time', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in', { tokens: 'much-data' })
  await page.goto('/profile')
  const tokens = page.getByRole('region', { name: 'Tokens' })
  await expect(tokens.getByRole('list', { name: 'Tus tokens' }).getByRole('listitem')).toHaveCount(20)
  await tokens.getByRole('button', { name: 'Mostrar los 42' }).click()
  await expect(tokens.getByRole('list', { name: 'Tus tokens' }).getByRole('listitem')).toHaveCount(42)
})

test('offline: writes are off and say why', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/profile')
  await expect(page.getByRole('region', { name: 'Tokens' }).getByRole('listitem').first()).toBeVisible()
  await context.setOffline(true)
  const tokens = page.getByRole('region', { name: 'Tokens' })
  await expect(tokens.getByRole('button', { name: 'Crear un token' })).toHaveAttribute(
    'aria-disabled',
    'true',
  )
  await expect(
    tokens.getByText('Estás sin conexión: esto no se puede enviar hasta que vuelva la conexión.').first(),
  ).toBeVisible()
  await context.setOffline(false)
})

for (const width of [320, 375] as const) {
  test(`at ${width} px nothing scrolls sideways, with a token shown`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width, height: 740 })
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/profile')
    const tokens = page.getByRole('region', { name: 'Tokens' })
    await tokens.getByRole('button', { name: 'Crear un token' }).click()
    await tokens.getByLabel('Nombre').fill('Phone')
    await tokens.getByRole('button', { name: 'Crear token' }).click()
    await expect(tokens.getByRole('region', { name: 'Tu token nuevo' })).toBeVisible()
    await noSideScroll(page)
    await page
      .getByRole('region', { name: 'Segundo factor' })
      .getByRole('button', { name: 'Activar' })
      .click()
    await noSideScroll(page)
  })
}

// The two states are audited apart, each in view: with both open, the second factor's code field takes the
// focus and scrolls the token under the sticky top bar, which is a layout of the test, not of a person.
for (const theme of ['dark', 'light'] as const) {
  test(`axe: profile with a token shown, then the second factor being set up, ${theme}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.addInitScript((t) => localStorage.setItem('rscb.theme', t), theme)
    await page.goto('/profile')
    const audit = async (where: string) => {
      const r = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(bad.map((v) => `${where}: ${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([])
    }
    const tokens = page.getByRole('region', { name: 'Tokens' })
    await tokens.getByRole('button', { name: 'Crear un token' }).click()
    await audit('new token form')
    await tokens.getByLabel('Nombre').fill('Axe')
    await tokens.getByRole('button', { name: 'Crear token' }).click()
    await expect(tokens.getByRole('region', { name: 'Tu token nuevo' })).toBeVisible()
    await audit('token shown')
    await tokens.getByRole('button', { name: 'Listo, ocultar el token' }).click()
    await page
      .getByRole('region', { name: 'Segundo factor' })
      .getByRole('button', { name: 'Activar' })
      .click()
    await expect(page.getByLabel('Código de la app')).toBeVisible()
    await audit('second factor')
  })
}
