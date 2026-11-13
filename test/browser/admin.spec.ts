// The administration of people, invitations and service accounts (spec B6 «Admin», plan T047; PR25a),
// against the fixture API: each person with their role in each brain, last access and status; rights
// given and taken (the last administrator stays, and the screen says why); deactivating and
// reactivating; invitations by status, a link to copy; service accounts with their brains, main keys
// shown once, rotated and revoked, and the short keys live with their references. Only the
// administration reaches it.
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

const person = (page: Page, text: string) =>
  page
    .getByRole('region', { name: 'Personas en esta instalación' })
    .getByRole('listitem')
    .filter({ hasText: text })

test.describe('administration: people', () => {
  test('reached from the account menu; each person with roles by brain, last access and status', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/')
    await page.getByRole('button', { name: /Cuenta/ }).click()
    await page.locator('#account-menu').getByRole('link', { name: 'Administración' }).click()
    await expect(page).toHaveURL(/\/admin\/people$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible()
    const nav = page.getByRole('navigation', { name: 'Administración' })
    await expect(nav.getByRole('link', { name: 'Personas' })).toHaveAttribute('aria-current', 'page')
    const ana = person(page, 'ana@example.test')
    await expect(ana).toContainText('Growth (colaborador) · Support (lector) · Legal archive (lector)')
    await expect(ana).toContainText('visto por última vez')
    await expect(ana).toContainText('activo')
    const eric = person(page, 'eric@example.test')
    await expect(eric).toContainText('Solo administrador')
    await audit(page, 'admin people')
  })

  test('the last administrator cannot step down; with a second one, they can', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    const eric = person(page, 'eric@example.test')
    await expect(eric.getByRole('button', { name: 'Quitar administrador: Eric' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expect(eric).toContainText('La instalación siempre conserva un administrador')
    const ana = person(page, 'ana@example.test')
    await ana.getByRole('button', { name: 'Nombrar administrador: Ana' }).click()
    // Asked first, saying what it gives.
    const dialog = page.getByRole('dialog', { name: '¿Nombrar administrador a Ana?' })
    await expect(dialog).toContainText('eliminar brains')
    await dialog.getByRole('button', { name: 'Nombrar administrador: Ana' }).click()
    // The keyboard lands on what the change says, not on the page.
    await expect(page.getByRole('status').filter({ hasText: 'Ana ahora es administrador.' })).toBeFocused()
    await expect(eric.getByRole('button', { name: 'Quitar administrador: Eric' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
    // Removing my own rights: asked, then the administration closes and says why.
    // A refusal does not throw me out.
    await page.route('**/v1/admin/accounts/acc_eric', (r) =>
      r.request().method() === 'PATCH'
        ? r.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'internal', message: 'Boom.', howToProceed: 'Probar otra vez.' },
            }),
          })
        : r.continue(),
    )
    await eric.getByRole('button', { name: 'Quitar administrador: Eric' }).click()
    const self = page.getByRole('dialog', { name: '¿Quitar tus derechos de administrador?' })
    await expect(self).toContainText('sales de la administración en cuanto termine')
    await self.getByRole('button', { name: 'Quitar mis derechos de administrador' }).click()
    await expect(eric.getByRole('alert')).toContainText('Boom.')
    await expect(page.getByRole('navigation', { name: 'Administración' })).toBeVisible()
    await page.unroute('**/v1/admin/accounts/acc_eric')
    await eric.getByRole('button', { name: 'Quitar administrador: Eric' }).click()
    await page
      .getByRole('dialog', { name: '¿Quitar tus derechos de administrador?' })
      .getByRole('button', { name: 'Quitar mis derechos de administrador' })
      .click()
    await expect(page.locator('[data-state="forbidden"]')).toContainText(
      'Quitaste tus propios derechos de administrador',
    )
    // Said once: coming back later reads as any other refusal.
    await page.goto('/admin/services')
    await expect(page.locator('[data-state="forbidden"]')).toContainText('Solo la administración')
    await page.getByRole('button', { name: /Cuenta/ }).click()
    await expect(page.locator('#account-menu').getByRole('link', { name: 'Administración' })).toHaveCount(0)
  })

  test('find people by name, email or status; a filter with nothing offers to clear it; many people go by pages', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { people: 'much-data' })
    await page.goto('/admin/people')
    const list = page.getByRole('region', { name: 'Personas en esta instalación' })
    await expect(list.locator('li[data-person]')).toHaveCount(20)
    await list.getByRole('button', { name: /Mostrar 20 más/ }).click()
    await expect(list.locator('li[data-person]')).toHaveCount(40)
    // The keyboard goes to the first person just shown; after the last page too (the button is gone).
    await expect(list.locator('li[data-person]').nth(20)).toBeFocused()
    await list.getByRole('button', { name: /más/ }).click()
    await expect(list.locator('li[data-person]')).toHaveCount(47)
    await expect(list.locator('li[data-person]').nth(40)).toBeFocused()
    await list.getByLabel('Buscar por nombre o email').fill('person41@')
    await expect(list.locator('li[data-person]')).toHaveCount(1)
    await list.getByLabel('Buscar por nombre o email').fill('ana@')
    await expect(list.locator('li[data-person]')).toHaveCount(1)
    await list.getByLabel('Estado').selectOption('removed')
    await expect(list.locator('[data-state="filtered-empty"]')).toContainText(
      'No hay resultados para estos filtros.',
    )
    await list.getByRole('button', { name: 'Quitar los filtros' }).first().click()
    await expect(list.getByLabel('Buscar por nombre o email')).toBeFocused()
    await expect(list.locator('li[data-person]')).toHaveCount(20)
  })

  test('let someone create brains, and stop it', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    const ana = person(page, 'ana@example.test')
    await ana.getByRole('button', { name: 'Permitir crear brains: Ana' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana puede crear brains.' })).toBeFocused()
    await ana.getByRole('button', { name: 'Dejar de crear brains: Ana' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana ya no puede crear brains.' })).toBeVisible()
  })

  test('deactivate says what ends and asks first; reactivate brings the person back', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    const ana = person(page, 'ana@example.test')
    await ana.getByRole('button', { name: 'Desactivar a Ana' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Desactivar a Ana?' })
    await expect(dialog).toContainText('cierra sesión en todos lados')
    await expect(dialog).toContainText('Lo que Ana escribió queda')
    await dialog.getByRole('button', { name: 'Desactivar a Ana' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana quedó desactivado.' })).toBeFocused()
    await expect(ana).toContainText('desactivado')
    await ana.getByRole('button', { name: 'Reactivar a Ana' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana volvió a estar activo.' })).toBeVisible()
    await expect(ana.getByRole('button', { name: 'Desactivar a Ana' })).toBeVisible()
  })

  test('a reset link for a person is made here, shown once', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    const ana = person(page, 'ana@example.test')
    await ana.getByRole('button', { name: 'Crear un enlace de restablecimiento para Ana' }).click()
    const shown = ana.getByRole('region', { name: /Enlace de restablecimiento para Ana/ })
    await expect(shown).toContainText('/reset#token=')
    await shown.getByRole('button', { name: 'Listo, lo copié' }).click()
    await expect(page.getByText('/reset#token=')).toHaveCount(0)
  })

  test('someone who is not an administrator is told so, and has no way in', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto('/')
    await page.getByRole('button', { name: /Cuenta/ }).click()
    await expect(page.locator('#account-menu').getByRole('link', { name: 'Administración' })).toHaveCount(0)
    for (const path of ['/admin/people', '/admin/invitations', '/admin/services']) {
      await page.goto(path)
      await expect(page.locator('[data-state="forbidden"]')).toContainText('Solo la administración')
    }
  })
})

test.describe('administration: invitations', () => {
  test('by status, with a new link to copy even when it also went by email', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    await page
      .getByRole('navigation', { name: 'Administración' })
      .getByRole('link', { name: 'Invitaciones' })
      .click()
    await expect(page).toHaveURL(/\/admin\/invitations$/)
    await expect(page.getByRole('form', { name: 'Invitar personas' })).toBeVisible()
    const list = page.getByRole('region', { name: 'Invitaciones' })
    await list.getByLabel('Mostrar').selectOption('expired')
    await expect(list.getByRole('listitem')).toHaveCount(1)
    await expect(list.getByRole('listitem')).toContainText('cy@example.test')
    await list.getByLabel('Mostrar').selectOption('used')
    await expect(list.getByRole('listitem')).toContainText('ana@example.test')
    await list.getByLabel('Mostrar').selectOption('revoked')
    await expect(list.locator('[data-state="filtered-empty"]')).toBeVisible()
    await list.getByRole('button', { name: 'Mostrar todas las invitaciones' }).click()
    await expect(list.getByLabel('Mostrar')).toHaveValue('all')
    await list.getByLabel('Mostrar').selectOption('pending')
    const bo = list.getByRole('listitem').filter({ hasText: 'bo@example.test' })
    await bo.getByRole('button', { name: 'Enlace nuevo para bo@example.test' }).click()
    await expect(bo).toContainText('Un enlace nuevo llegó a bo@example.test.')
    await expect(bo.getByRole('region', { name: 'Invitación para bo@example.test' })).toContainText(
      '/invite#token=',
    )
    await expect(bo.getByRole('button', { name: 'Copiar el enlace' })).toBeFocused()
    await bo.getByRole('button', { name: 'Listo, lo copié' }).click()
    await expect(page.getByText('/invite#token=')).toHaveCount(0)
    const kept = await page.evaluate(
      () => JSON.stringify({ ...localStorage, ...sessionStorage }) + location.href,
    )
    expect(kept).not.toContain('inv_fixture')
    await audit(page, 'admin invitations')
  })
})

test.describe('administration: service accounts', () => {
  test('each with its brains, main keys and the short keys live, with their references', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/services')
    const svc = page
      .getByRole('region', { name: 'Cuentas de servicio' })
      .getByRole('listitem')
      .filter({ hasText: 'Factory runner' })
      .first()
    await expect(svc).toContainText('Growth (colaborador)')
    await expect(svc).toContainText('…F4ct')
    await expect(svc).toContainText('3 claves cortas activas: run r_8kq2, step 3, run r_9zz1')
    const old = page
      .getByRole('region', { name: 'Cuentas de servicio' })
      .getByRole('listitem')
      .filter({ hasText: 'Old importer' })
      .first()
    await expect(old).toContainText('desactivado')
    await audit(page, 'admin services')
  })

  test('create one: its main key is shown once, and gone once hidden', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/services')
    const form = page.getByRole('form', { name: 'Cuenta de servicio nueva' })
    await form.getByLabel('Nombre').fill('Nightly import')
    await form.getByRole('checkbox', { name: 'Growth' }).check()
    await form.getByLabel('Rol en Growth').selectOption('reader')
    await form.getByRole('button', { name: 'Crear cuenta de servicio' }).click()
    const once = page.getByRole('region', { name: 'Clave principal de Nightly import' })
    await expect(once).toContainText('rscb_')
    await expect(once).toContainText('Se muestra solo ahora:')
    await expect(once.getByRole('button', { name: 'Copiar la clave' })).toBeFocused()
    const secret = (await once.locator('code').textContent()) ?? ''
    await once.getByRole('button', { name: 'Listo, ocultar la clave' }).click()
    await expect(page.getByText(secret)).toHaveCount(0)
    // The keyboard is not lost on the page: it lands on what the hiding says.
    await expect(
      page.getByRole('status').filter({ hasText: 'La clave de Nightly import está oculta.' }),
    ).toBeFocused()
    const kept = await page.evaluate(
      () => JSON.stringify({ ...localStorage, ...sessionStorage }) + location.href + document.body.innerHTML,
    )
    expect(kept).not.toContain(secret)
    const row = page
      .getByRole('region', { name: 'Cuentas de servicio' })
      .getByRole('listitem')
      .filter({ hasText: 'Nightly import' })
      .first()
    await expect(row).toContainText('Growth (lector)')
    await expect(row).toContainText(`…${secret.slice(-4)}`)
  })

  test('rotate: a new main key once, then the old one revoked after a second press', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/services')
    const svc = page
      .getByRole('region', { name: 'Cuentas de servicio' })
      .getByRole('listitem')
      .filter({ hasText: 'Factory runner' })
      .first()
    await svc.getByRole('button', { name: 'Clave principal nueva para Factory runner' }).click()
    const once = page.getByRole('region', { name: 'Clave principal de Factory runner' })
    await expect(once).toContainText('rscb_')
    await expect(once).toContainText('revoca la vieja')
    await once.getByRole('button', { name: 'Listo, ocultar la clave' }).click()
    // At most two main keys at once: the button says why it waits.
    await expect(
      svc.getByRole('button', { name: 'Clave principal nueva para Factory runner' }),
    ).toHaveAttribute('aria-disabled', 'true')
    const oldKey = svc.getByRole('listitem').filter({ hasText: '…F4ct' })
    await oldKey.getByRole('button', { name: 'Revocar …F4ct' }).click()
    await expect(oldKey.getByRole('button', { name: 'Revocar …F4ct y sus claves cortas' })).toBeFocused()
    await oldKey.getByRole('button', { name: 'Revocar …F4ct y sus claves cortas' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Clave …F4ct revocada.' })).toBeFocused()
    await expect(svc.getByRole('listitem').filter({ hasText: '…F4ct' })).toContainText('revocada')
  })

  test('a service account is deactivated in its own words, and the keyboard lands on what happened', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/services')
    const svc = page
      .getByRole('region', { name: 'Cuentas de servicio' })
      .getByRole('listitem')
      .filter({ hasText: 'Factory runner' })
      .first()
    await svc.getByRole('button', { name: 'Desactivar a Factory runner' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Desactivar a Factory runner?' })
    await expect(dialog).toContainText('dejan de funcionar ahora')
    await expect(dialog).not.toContainText('signed out')
    await expect(dialog).not.toContainText('connected apps')
    await dialog.getByRole('button', { name: 'Desactivar a Factory runner' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Factory runner quedó desactivado.' }),
    ).toBeFocused()
    await expect(svc).toContainText('desactivado')
    // A new one that was never used says so in its words.
    const form = page.getByRole('form', { name: 'Cuenta de servicio nueva' })
    await form.getByLabel('Nombre').fill('Fresh runner')
    await form.getByRole('button', { name: 'Crear cuenta de servicio' }).click()
    await page
      .getByRole('region', { name: 'Clave principal de Fresh runner' })
      .getByRole('button', { name: 'Listo, ocultar la clave' })
      .click()
    const fresh = page
      .getByRole('region', { name: 'Cuentas de servicio' })
      .getByRole('listitem')
      .filter({ hasText: 'Fresh runner' })
      .first()
    await expect(fresh).toContainText('nunca usado')
    await expect(fresh).not.toContainText('signed in')
    // With its only key revoked, it says it has none working.
    await fresh.getByRole('button', { name: /^Revocar …/ }).click()
    await fresh.getByRole('button', { name: /y sus claves cortas$/ }).click()
    await expect(fresh).toContainText('Sin clave principal: haz una para usar esta cuenta.')
  })

  test('a key shown is forgotten when the page goes to the back/forward cache', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/services')
    const svc = page
      .getByRole('region', { name: 'Cuentas de servicio' })
      .getByRole('listitem')
      .filter({ hasText: 'Factory runner' })
      .first()
    await svc.getByRole('button', { name: 'Clave principal nueva para Factory runner' }).click()
    await expect(page.getByRole('region', { name: 'Clave principal de Factory runner' })).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })))
    await expect(page.getByRole('region', { name: 'Clave principal de Factory runner' })).toHaveCount(0)
  })
})

test.describe('administration: sizes', () => {
  for (const width of [320, 375] as const) {
    test(`at ${width} px nothing scrolls sideways`, async ({ page, context, baseURL }) => {
      await scenario(context, baseURL as string, 'signed-in')
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['/admin/people', '/admin/invitations', '/admin/services']) {
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible()
        await expect(page.getByRole('listitem').first()).toBeVisible()
        await noSideScroll(page)
      }
    })
  }
})
