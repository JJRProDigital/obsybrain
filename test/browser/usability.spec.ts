// The usability review of PR17 (ux skill: every screen says where you are, what it is, what you can do,
// what just happened and what comes next; errors sit next to their field; the keyboard lands where the
// work is). Each test walks a real task against the fixture API.
import { CODE, expect, INVITE, keepTheKey, PASSWORD, RESET, scenario, test } from './fixture.ts'

test.describe('U1: home with no brains', () => {
  test('right after the setup, the administrator sees it worked and what to do next', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'fresh')
    await page.goto('/setup')
    await page.getByLabel('Nombre de esta instalación').fill('obsybrain')
    await page.getByLabel('Tu nombre').fill('Eric')
    await page.getByLabel('Tu email').fill('eric@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await keepTheKey(page)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('status').filter({ hasText: 'Brain está configurado.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Para empezar' })).toBeVisible()
    // A way forward that works today: connect an agent to this installation, with the address to copy.
    await expect(page.getByText(`${baseURL}/mcp`)).toBeVisible()
    await expect(page.getByRole('button', { name: /Copy/ }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /README/ })).toHaveAttribute('href', /github\.com/)
  })

  test('a person in no brain is told who to ask, can copy their email, and can sign out', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'member', { home: 'empty' })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Todavía no estás en ningún brain' })).toBeVisible()
    await expect(
      page.getByText('Un curador de un brain, o un administrador, puede añadirte a uno.'),
    ).toBeVisible()
    await expect(page.getByText('ana@example.test').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copiar mi email' })).toBeVisible()
    await page.getByRole('main').getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole('status').filter({ hasText: 'Sesión cerrada.' })).toBeVisible()
  })
})

test.describe('U2: invitation and reset links', () => {
  test('a missing invitation link has a title and a way forward; pasting the link in the same tab works', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-out')
    await page.goto('/invite')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Este enlace de invitación no funciona' }),
    ).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
    await page.evaluate((t) => {
      location.hash = `#token=${t}`
    }, INVITE)
    // The keyboard goes to the new title, so a screen reader announces the invitation; the first field is
    // the next stop.
    await expect(page.getByRole('heading', { level: 1, name: 'Acepta tu invitación' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Tu nombre')).toBeFocused()
    expect(await page.evaluate(() => location.href)).not.toContain(INVITE)
  })

  test('a used invitation link has a title and a way forward', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-out')
    await page.goto('/invite#token=inv_not_a_real_token_000')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Este enlace de invitación no funciona' }),
    ).toBeVisible()
    await expect(page.getByRole('main').getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('a reset link pasted in the same tab opens the new password form; a used one leads to a new link', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-out')
    await page.goto('/reset')
    await expect(page.getByRole('heading', { level: 1, name: 'Restablece tu contraseña' })).toBeVisible()
    await page.evaluate((t) => {
      location.hash = `#token=${t}`
    }, RESET)
    await expect(page.getByRole('heading', { level: 1, name: 'Elige una contraseña nueva' })).toBeVisible()
    await expect(page.getByLabel('Contraseña nueva')).toBeFocused()
    await page.getByLabel('Contraseña nueva').fill('a new long passphrase')
    await page.getByRole('button', { name: 'Guardar la contraseña nueva' }).click()
    await expect(page.getByRole('heading', { name: 'Tu contraseña cambió' })).toBeVisible()
    // The same link again: it is used, and the page says so before anyone types.
    await page.evaluate((t) => {
      location.hash = `#token=${t}`
    }, RESET)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Este enlace de restablecimiento no funciona' }),
    ).toBeFocused()
    await expect(page.getByLabel('Contraseña nueva')).toHaveCount(0)
    // By keyboard: the way forward is the next stop.
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pedir un enlace nuevo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 1, name: 'Restablece tu contraseña' })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
  })
})

test.describe('U3: an installation that cannot send email', () => {
  test('the reset page says to ask an administrator, before anyone types an email', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-out', {}, { mail: false })
    await page.goto('/reset')
    await expect(page.getByRole('heading', { level: 1, name: 'Restablece tu contraseña' })).toBeVisible()
    await expect(
      page.getByText(
        'Esta instalación no puede enviar email. Pide a tu administrador un enlace de restablecimiento.',
      ),
    ).toBeVisible()
    await expect(page.getByLabel('Email')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Volver a iniciar sesión' })).toBeVisible()
  })
})

test.describe('U4: the setup form', () => {
  test('checks in the browser first: every problem next to its field, the keyboard on the first', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'fresh')
    let sent = 0
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/v1/setup')) sent++
    })
    await page.goto('/setup')
    await expect(page.getByRole('heading', { name: 'Configurar obsybrain' })).toBeVisible()
    const top = await page.getByLabel('Nombre de esta instalación').boundingBox()
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    const name = page.getByLabel('Nombre de esta instalación')
    await expect(name).toBeFocused()
    await expect(name).toHaveAttribute('aria-invalid', 'true')
    await expect(name).toHaveAccessibleDescription(/Enter a name for this installation\./)
    await expect(page.getByLabel('Tu nombre')).toHaveAccessibleDescription(/Enter your name\./)
    await expect(page.getByLabel('Tu email')).toHaveAccessibleDescription(/Enter your email\./)
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAccessibleDescription(
      /Enter a password\./,
    )
    // No banner pushes the form down.
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect((await name.boundingBox())?.y).toBe(top?.y)
    await name.fill('obsybrain')
    await page.getByLabel('Tu nombre').fill('Eric')
    await page.getByLabel('Tu email').fill('eric@')
    await page.getByLabel('Contraseña', { exact: true }).fill('too short')
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await expect(page.getByLabel('Tu email')).toBeFocused()
    await expect(page.getByLabel('Tu email')).toHaveAccessibleDescription(
      /Enter an email like name@example\.com\./,
    )
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAccessibleDescription(
      /at least 12 characters/,
    )
    await expect(name).not.toHaveAttribute('aria-invalid', 'true')
    expect(sent).toBe(0)
    await page.getByLabel('Tu email').fill('eric@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await keepTheKey(page)
    await expect(page).toHaveURL(/\/$/)
    expect(sent).toBe(1)
  })
})

test.describe('U5: the small things', () => {
  test('each screen has its own title, and moving to another puts the keyboard on its heading', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/')
    await expect(page).toHaveTitle('Tus brains · obsybrain')
    await page.getByRole('link', { name: 'Growth' }).click()
    await expect(page).toHaveTitle('Growth · obsybrain')
    await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeFocused()
    await expect(page.getByRole('banner')).toContainText('Eres curador')
    await page
      .getByRole('navigation', { name: 'Secciones de este brain' })
      .getByRole('link', { name: 'Todos los brains', exact: true })
      .click()
    await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeFocused()
  })

  test('the kind of an alert reads as a word, in sentence case', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-out')
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill('eric@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill('wrong one here')
    await page.getByLabel('Contraseña', { exact: true }).press('Enter')
    const kind = page.getByRole('alert').locator('.kind')
    await expect(kind).toHaveText('Problem')
    await expect(kind).toHaveCSS('text-transform', 'none')
  })

  test('signing out says so on the sign-in page', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/')
    await page.getByRole('button', { name: /Account/ }).click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    await expect(page.getByRole('status').filter({ hasText: 'Sesión cerrada.' })).toBeVisible()
  })

  test('every password field can be shown', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-out')
    for (const [path, label] of [
      ['/sign-in', 'Contraseña'],
      [`/invite#token=${INVITE}`, 'Elige una contraseña'],
      [`/reset#token=${RESET}`, 'Contraseña nueva'],
    ] as const) {
      await page.goto(path)
      const field = page.getByLabel(label, { exact: true })
      await expect(field).toHaveAttribute('type', 'password')
      await page.getByRole('button', { name: 'Mostrar' }).click()
      await expect(field).toHaveAttribute('type', 'text')
      await expect(page.getByRole('button', { name: 'Ocultar' })).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('the authenticator code takes a pasted "424 242"', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-out')
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill('ana@example.test')
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
    const code = page.getByLabel('Código de tu app de autenticación')
    await expect(code).toBeFocused()
    await code.fill(`${CODE.slice(0, 3)} ${CODE.slice(3)}`)
    await expect(code).toHaveValue(CODE)
    await code.press('Enter')
    await expect(page.getByRole('heading', { name: 'Tus brains' })).toBeVisible()
  })

  test('search with no brains says there is nothing to search yet', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'member', { home: 'empty' })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Todavía no estás en ningún brain' })).toBeVisible()
    await page.locator('html[data-keys="on"]').waitFor({ state: 'attached' })
    await page.keyboard.press('Control+k')
    const search = page.getByRole('dialog', { name: 'Buscar' })
    await expect(search).toContainText('Todavía no hay nada que buscar')
    await expect(search.getByLabel('Buscar')).toHaveCount(0)
  })

  test('the setup page logo is not a link to sign in', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'fresh')
    await page.goto('/setup')
    await expect(page.getByRole('heading', { name: 'Configurar obsybrain' })).toBeVisible()
    await expect(page.locator('header').getByRole('link')).toHaveCount(0)
  })
})

test.describe('U5: on a touch-only device', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  test('"Atajos de teclado" is not offered, and "?" still works', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Growth' })).toBeVisible()
    await page.getByRole('button', { name: /Account/ }).click()
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Atajos de teclado/ })).toBeHidden()
    await page.keyboard.press('Escape')
    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Atajos de teclado' })).toBeVisible()
    await page.keyboard.press('Escape')
    await context.clearCookies()
    await page.goto('/sign-in')
    await expect(
      page.getByRole('contentinfo').getByRole('button', { name: 'Atajos de teclado' }),
    ).toBeHidden()
  })
})
