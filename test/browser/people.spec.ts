// Inviting people from the web (spec B4 «Invitar», B6 «Admin › people · invitations»; moved to PR18 by the
// usability review of PR17): whoever may invite gives emails, brains and a role; with mail the invitation
// goes by email, without it the single-use link is shown once to copy; pending invitations can get a new
// link or be withdrawn; and the administration makes a reset link for a person.
import type { Locator, Page } from '@playwright/test'
import { expect, noSideScroll, scenario, test } from './fixture.ts'

test.describe('invite', () => {
  test('the administration invites two people to a brain by email; they wait in the list', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/')
    await page.getByRole('button', { name: /Cuenta/ }).click()
    await page.locator('#account-menu').getByRole('link', { name: 'Personas' }).click()
    await expect(page).toHaveURL(/\/people$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Personas' })).toBeVisible()
    const form = page.getByRole('form', { name: 'Invitar personas' })
    await form.getByLabel('Emails').fill('zoe@example.test, yan@example.test')
    await form.getByRole('checkbox', { name: 'Growth' }).check()
    await form.getByLabel('Rol en Growth').selectOption('contributor')
    await form.getByRole('button', { name: 'Enviar invitaciones' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Invitaciones enviadas' })).toContainText(
      'zoe@example.test',
    )
    // The link went by mail: it is not shown.
    await expect(page.getByText('/invite#token=')).toHaveCount(0)
    const list = page.getByRole('region', { name: 'Invitaciones' })
    await expect(list.getByRole('listitem').filter({ hasText: 'zoe@example.test' })).toContainText(
      'pendiente',
    )
    await expect(list.getByRole('listitem').filter({ hasText: 'zoe@example.test' })).toContainText(
      'Growth como colaborador',
    )
  })

  test('without mail, the link is shown once to copy, and gone once closed', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', {}, { mail: false })
    await page.goto('/people')
    const form = page.getByRole('form', { name: 'Invitar personas' })
    await expect(form).toContainText('Esta instalación no puede enviar email')
    await form.getByLabel('Emails').fill('zoe@example.test')
    await form.getByRole('button', { name: 'Crear enlace de invitación' }).click()
    const shown = page.getByRole('region', { name: 'Enlaces para enviar' })
    await expect(shown).toContainText('zoe@example.test')
    await expect(shown).toContainText('/invite#token=')
    await expect(shown).toContainText('Mostrado solo ahora.')
    await expect(shown.getByRole('button', { name: 'Copiar el enlace' })).toBeVisible()
    await shown.getByRole('button', { name: 'Listo, lo copié' }).click()
    await expect(page.getByText('/invite#token=')).toHaveCount(0)
    const kept = await page.evaluate(
      () => JSON.stringify({ ...localStorage, ...sessionStorage }) + location.href,
    )
    expect(kept).not.toContain('inv_fixture')
  })

  test('a wrong email is said next to the field; nothing is sent and the text stays', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/people')
    const form = page.getByRole('form', { name: 'Invitar personas' })
    await form.getByLabel('Emails').fill('zoe@example.test, not-an-email')
    await form.getByRole('button', { name: 'Enviar invitaciones' }).click()
    await expect(form.getByText('"not-an-email" no es un email')).toBeVisible()
    await expect(form.getByLabel('Emails')).toBeFocused()
    await expect(form.getByLabel('Emails')).toHaveValue('zoe@example.test, not-an-email')
  })

  test('someone who already has an account: the server says what to do instead', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/people')
    const form = page.getByRole('form', { name: 'Invitar personas' })
    await form.getByLabel('Emails').fill('ana@example.test')
    await form.getByRole('button', { name: 'Enviar invitaciones' }).click()
    await expect(form.getByRole('alert')).toContainText('ana@example.test ya tiene una cuenta.')
    await expect(form.getByRole('alert')).toContainText('Añade a esa persona al brain como miembro.')
    await expect(form.getByLabel('Emails')).toHaveValue('ana@example.test')
  })
})

test.describe('pending invitations', () => {
  test('a new link, shown once without mail; withdrawing one says so', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in', {}, { mail: false })
    await page.goto('/people')
    const bo = page.getByRole('region', { name: 'Invitaciones' }).getByRole('listitem').filter({
      hasText: 'bo@example.test',
    })
    await bo.getByRole('button', { name: 'Enlace nuevo' }).click()
    await expect(bo.getByRole('region', { name: 'Invitación para bo@example.test' })).toContainText(
      '/invite#token=',
    )
    await bo.getByRole('button', { name: 'Retirar' }).click()
    const confirm = page.getByRole('dialog', { name: '¿Retirar la invitación?' })
    await expect(confirm).toContainText('bo@example.test')
    await confirm.getByRole('button', { name: 'Retirar la invitación' }).click()
    await expect(bo).toContainText('retirada')
    await expect(bo.getByRole('button', { name: 'Retirar' })).toHaveCount(0)
  })
})

test.describe('reset links', () => {
  test('the administration makes a reset link for a person, shown once to copy', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    // Reset links moved with the people to the administration (PR25a); People points there.
    await page.goto('/people')
    await page
      .getByRole('region', { name: 'Personas en esta instalación' })
      .getByRole('link', { name: 'Administración › Personas' })
      .click()
    await expect(page).toHaveURL(/\/admin\/people$/)
    const ana = page
      .getByRole('region', { name: 'Personas en esta instalación' })
      .getByRole('listitem')
      .filter({
        hasText: 'ana@example.test',
      })
    await ana.getByRole('button', { name: 'Crear un enlace de restablecimiento' }).click()
    const shown = ana.getByRole('region', { name: /Enlace de restablecimiento para Ana/ })
    await expect(shown).toContainText('/reset#token=')
    await expect(shown).toContainText('Funciona una sola vez, durante 1 hora.')
    await shown.getByRole('button', { name: 'Listo, lo copié' }).click()
    await expect(page.getByText('/reset#token=')).toHaveCount(0)
  })
})

test.describe('who may', () => {
  test('a person who may not invite is told who can, and is not offered the page', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto('/')
    await page.getByRole('button', { name: /Cuenta/ }).click()
    await expect(page.getByRole('link', { name: 'Personas' })).toHaveCount(0)
    await page.goto('/people')
    await expect(page.getByRole('alert')).toContainText('Solo la administración invita a personas nuevas')
    await expect(page.getByRole('alert')).toContainText('Pídeselo a la administración')
  })

  test('at 320 px the page fits', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in', {}, { mail: false })
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/people')
    await page.getByLabel('Emails').fill('zoe@example.test')
    await page.getByRole('button', { name: 'Crear enlace de invitación' }).click()
    await expect(page.getByRole('region', { name: 'Enlaces para enviar' })).toBeVisible()
    await noSideScroll(page)
  })
})

// Review of PR18 (P1–P3): a one-time link appears next to what made it, in view, with the keyboard on
// its «Copy link»; a link that no longer works is not shown as working; withdrawing keeps the keyboard
// on the page.
async function inView(page: Page, l: Locator) {
  const box = await l.boundingBox()
  const vp = page.viewportSize()
  expect(box, 'it is on the page').not.toBeNull()
  if (!box || !vp) return
  expect(box.y, 'not above the window').toBeGreaterThanOrEqual(0)
  expect(box.y + box.height, 'not below the window').toBeLessThanOrEqual(vp.height)
}

test.describe('links in view (P1, P2, P3)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('P1: «New link» shows the link by its row, scrolls it into view and focuses «Copy link»', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', {}, { mail: false })
    await page.goto('/people')
    const bo = page.getByRole('region', { name: 'Invitaciones' }).getByRole('listitem').filter({
      hasText: 'bo@example.test',
    })
    await bo.getByRole('button', { name: 'Enlace nuevo para bo@example.test' }).click()
    const copy = bo.getByRole('button', { name: 'Copiar el enlace' })
    await expect(copy).toBeFocused()
    await inView(page, copy)
    await expect(bo).toContainText('/invite#token=')
    await expect(
      page.getByRole('status').filter({ hasText: 'El enlace para bo@example.test está listo' }),
    ).toHaveCount(1)
  })

  test('P1: a link made by the form is in view with the keyboard on «Copy link»', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', {}, { mail: false })
    await page.goto('/people')
    const form = page.getByRole('form', { name: 'Invitar personas' })
    await form.getByLabel('Emails').fill('zoe@example.test')
    await form.getByRole('button', { name: 'Crear enlace de invitación' }).click()
    const shown = page.getByRole('region', { name: 'Enlaces para enviar' })
    const copy = shown.getByRole('button', { name: 'Copiar el enlace' })
    await expect(copy).toBeFocused()
    await inView(page, copy)
  })

  test('P1: a reset link shows by the person, in view, focused', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    const ana = page
      .getByRole('region', { name: 'Personas en esta instalación' })
      .getByRole('listitem')
      .filter({ hasText: 'ana@example.test' })
    await ana.getByRole('button', { name: 'Crear un enlace de restablecimiento para Ana' }).click()
    const copy = ana.getByRole('button', { name: 'Copiar el enlace' })
    await expect(copy).toBeFocused()
    await inView(page, copy)
    await expect(ana).toContainText('/reset#token=')
  })

  test('P2: a new link replaces the one before; withdrawing removes its links', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', {}, { mail: false })
    await page.goto('/people')
    const bo = page.getByRole('region', { name: 'Invitaciones' }).getByRole('listitem').filter({
      hasText: 'bo@example.test',
    })
    await bo.getByRole('button', { name: 'Enlace nuevo para bo@example.test' }).click()
    await expect(page.getByText('/invite#token=')).toHaveCount(1)
    // One new link a minute: a second press soon after says so, and the link shown still works.
    await bo.getByRole('button', { name: 'Enlace nuevo para bo@example.test' }).click()
    await expect(bo.getByRole('alert')).toContainText('less than a minute ago')
    await expect(page.getByText('/invite#token=')).toHaveCount(1)
    await bo.getByRole('button', { name: 'Retirar la invitación de bo@example.test' }).click()
    await page
      .getByRole('dialog', { name: '¿Retirar la invitación?' })
      .getByRole('button', { name: 'Retirar la invitación' })
      .click()
    await expect(bo).toContainText('retirada')
    await expect(page.getByText('/invite#token=')).toHaveCount(0)
    // Nothing still announces a link that is gone.
    await expect(page.getByRole('status').filter({ hasText: 'is ready' })).toHaveCount(0)
  })

  test('P2: a link made by the form goes when its invitation gets a new one', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', {}, { mail: false })
    await page.goto('/people')
    const form = page.getByRole('form', { name: 'Invitar personas' })
    await form.getByLabel('Emails').fill('zoe@example.test')
    await form.getByRole('button', { name: 'Crear enlace de invitación' }).click()
    await expect(page.getByRole('region', { name: 'Enlaces para enviar' })).toBeVisible()
    const zoe = page.getByRole('region', { name: 'Invitaciones' }).getByRole('listitem').filter({
      hasText: 'zoe@example.test',
    })
    await zoe.getByRole('button', { name: 'Enlace nuevo para zoe@example.test' }).click()
    await expect(page.getByRole('region', { name: 'Enlaces para enviar' })).toHaveCount(0)
    await expect(page.getByText('/invite#token=')).toHaveCount(1)
  })

  test('P2: only a pending invitation says until when it works', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/people')
    const row = (email: string) =>
      page.getByRole('region', { name: 'Invitaciones' }).getByRole('listitem').filter({ hasText: email })
    await expect(row('bo@example.test')).toContainText('funciona hasta')
    for (const email of ['cy@example.test', 'ana@example.test'])
      await expect(row(email)).not.toContainText('funciona hasta')
    await expect(row('cy@example.test')).toContainText('venció el')
  })

  test('P3: withdrawing says so and keeps the keyboard on the list; the dialog has one «Keep it»', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/people')
    const bo = page.getByRole('region', { name: 'Invitaciones' }).getByRole('listitem').filter({
      hasText: 'bo@example.test',
    })
    await bo.getByRole('button', { name: 'Retirar la invitación de bo@example.test' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Retirar la invitación?' })
    await expect(dialog.getByRole('button', { name: 'Conservarla' })).toHaveCount(1)
    await dialog.getByRole('button', { name: 'Retirar la invitación' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Invitación retirada.' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Invitaciones' })).toBeFocused()
  })

  // PR26 (spec B6 «Mucho dato»): accepted invitations stay, so a long history comes by pages from the
  // server (a cursor and 20 at a time), and «Show more» puts the keyboard on the first new one.
  test('a long history of invitations comes 20 at a time from the server; the keyboard lands on the first new one', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { people: 'much-data' })
    const asked: URL[] = []
    page.on('request', (r) => {
      const u = new URL(r.url())
      if (u.pathname === '/v1/invitations' && r.method() === 'GET') asked.push(u)
    })
    await page.goto('/people')
    const rows = page.getByRole('region', { name: 'Invitaciones' }).locator('li[data-invitation]')
    await expect(rows).toHaveCount(20)
    expect(asked.at(-1)?.searchParams.get('limit')).toBe('20')
    await page.getByRole('button', { name: 'Mostrar más invitaciones' }).click()
    await expect(rows).toHaveCount(40)
    await expect(rows.nth(20)).toBeFocused()
    expect(asked.at(-1)?.searchParams.get('cursor')).toBeTruthy()
    await page.getByRole('button', { name: 'Mostrar más invitaciones' }).click()
    await expect(rows).toHaveCount(48)
    await expect(rows.nth(40)).toBeFocused()
    await expect(page.getByRole('button', { name: 'Mostrar más invitaciones' })).toHaveCount(0)
  })

  // Review of PR26: after a filter change, «Show more» still put the keyboard on the first new one (the
  // index it went to before was not reset), and the status is asked of the server.
  test('the «Show» filter asks the server; after changing it, «Show more» still lands on the first new one', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { people: 'much-data' })
    const asked: URL[] = []
    page.on('request', (r) => {
      const u = new URL(r.url())
      if (u.pathname === '/v1/invitations' && r.method() === 'GET') asked.push(u)
    })
    await page.goto('/admin/invitations')
    const rows = page.getByRole('region', { name: 'Invitaciones' }).locator('li[data-invitation]')
    await expect(rows).toHaveCount(20)
    await page.getByRole('button', { name: 'Mostrar más invitaciones' }).click()
    await expect(rows.nth(20)).toBeFocused()
    await page.getByLabel('Mostrar').selectOption('used')
    await expect.poll(() => asked.at(-1)?.searchParams.get('status')).toBe('used')
    await expect(rows).toHaveCount(20)
    await expect(rows.filter({ hasNotText: 'aceptada' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Mostrar más invitaciones' }).click()
    await expect(rows).toHaveCount(40)
    await expect(rows.nth(20)).toBeFocused()
    // Back to all: the first 20 again, and «Show more» lands on the 21st once more.
    await page.getByLabel('Mostrar').selectOption('all')
    await expect(rows).toHaveCount(20)
    await page.getByRole('button', { name: 'Mostrar más invitaciones' }).click()
    await expect(rows.nth(20)).toBeFocused()
  })
})
