// The doors of the web against the real server and PostgreSQL (plan T009, local lane): first run from the
// web, an invitation sent by email and accepted, signing out and in, and a password reset. One fresh
// installation for the whole file, in order.
import { type APIRequestContext, expect, test } from '@playwright/test'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }
const WEB = { 'x-requested-with': 'obsybrain-web' }
// The installation key of the e2e server (test/e2e/server.ts).
const E2E_SECRET = 'e2e-secret-of-at-least-thirty-two-characters'

test.describe.configure({ mode: 'serial' })

async function mailLink(request: APIRequestContext, to: string, kind: 'invite' | 'reset'): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const r = await request.get(`/__e2e/mail?to=${encodeURIComponent(to)}`)
    if (r.ok()) {
      const m = (await r.json()) as { text: string }
      const link = new RegExp(`https?://\\S+/${kind}#token=[\\w-]+`).exec(m.text)?.[0]
      if (link) return new URL(link).pathname + new URL(link).hash
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`no ${kind} mail to ${to}`)
}

test('first run from the web makes the administrator and signs them in', async ({ page, baseURL }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/setup$/)
  await page.getByLabel('Nombre de esta instalación').fill('obsybrain')
  await page.getByLabel('Dirección que abre la gente').fill(baseURL as string)
  await page.getByLabel('Tu nombre').fill(ADMIN.name)
  await page.getByLabel('Tu email').fill(ADMIN.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
  // T019: the last step shows the installation key of this process (OBSY_BRAIN_SECRET), once.
  await expect(page.getByRole('heading', { level: 1, name: 'Guarda la clave de instalación' })).toBeVisible()
  await expect(page.locator('pre')).toHaveText(E2E_SECRET)
  await page.getByLabel('Guardé la clave de instalación en un lugar seguro, fuera de esta máquina').check()
  await page.getByRole('button', { name: 'Continuar a obsybrain' }).click()
  await expect(page.getByRole('heading', { name: 'Tus brains' })).toBeVisible()
  expect((await page.request.post('/v1/setup/key', { headers: WEB, data: {} })).status()).toBe(404)
  await expect(page.locator('body')).not.toContainText(E2E_SECRET)
  // U1: the administrator sees it worked and the next step, with the agent command for this address.
  await expect(page.getByRole('status').filter({ hasText: 'Brain is set up.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Para empezar' })).toBeVisible()
  await expect(page.getByText(`${baseURL}/mcp`)).toBeVisible()
  await expect(page.locator('header')).toContainText('obsybrain')
})

test('an invitation by email is accepted and opens a session', async ({ page, browser }) => {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Contraseña').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('heading', { name: 'Tus brains' })).toBeVisible()
  // The admin creates a brain and invites Marta with the same session the web uses.
  const made = await page.request.post('/v1/brains', {
    headers: WEB,
    data: { slug: 'growth', name: 'Growth', purpose: 'Audience and retention.' },
  })
  expect(made.status()).toBe(201)
  const inv = await page.request.post('/v1/invitations', {
    headers: WEB,
    data: { emails: ['marta@example.test'], brains: [{ slug: 'growth', role: 'contributor' }] },
  })
  expect(inv.status()).toBe(201)
  const link = await mailLink(page.request, 'marta@example.test', 'invite')

  const marta = await browser.newContext()
  const p = await marta.newPage()
  await p.goto(link)
  await expect(p.getByRole('heading', { name: 'Acepta tu invitación' })).toBeVisible()
  await expect(p).toHaveURL(/\/invite$/)
  await expect(p.getByText('marta@example.test')).toBeVisible()
  await expect(p.getByText('Growth')).toBeVisible()
  await p.getByLabel('Tu nombre').fill('Marta')
  await p.getByLabel('Elige una contraseña').fill('a long passphrase for marta')
  await p.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(p.getByRole('link', { name: 'Growth' })).toBeVisible()
  // The welcome comes from the real accept answer: what she joined, with her role.
  await expect(p.getByRole('status').filter({ hasText: /Welcome — you joined Growth as/ })).toBeVisible()
  const me = await p.request.get('/v1/me')
  expect(((await me.json()) as { account: { name: string } }).account.name).toBe('Marta')
  // The link works once; opened again while signed in, it says so and leads to her brains.
  await p.goto(link)
  await expect(p.getByRole('heading', { level: 1, name: 'This invitation is already used' })).toBeVisible()
  await expect(p.getByRole('alert')).toContainText('Este enlace de invitación no es válido')
  await expect(p.getByRole('main').getByRole('link', { name: 'Go to your brains' })).toBeVisible()
  await marta.close()
})

test('signing out ends the session; signing in again works', async ({ page }) => {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill('marta@example.test')
  await page.getByLabel('Contraseña').fill('a long passphrase for marta')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.getByRole('link', { name: 'Growth' }).click()
  await expect(page.getByRole('heading', { name: 'Growth' })).toBeVisible()
  await page.getByRole('button', { name: /Cuenta/ }).click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('status').filter({ hasText: 'Signed out.' })).toBeVisible()
  expect((await page.request.get('/v1/me')).status()).toBe(401)
})

test('a password reset by email sets a new password', async ({ page, browser }) => {
  await page.goto('/reset')
  await page.getByLabel('Email').fill('marta@example.test')
  await page.getByRole('button', { name: 'Enviar el enlace' }).click()
  await expect(page.getByRole('heading', { name: 'Revisa tu email' })).toBeVisible()
  const link = await mailLink(page.request, 'marta@example.test', 'reset')
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await p.goto(link)
  await p.getByLabel('Contraseña nueva').fill('a newer passphrase for marta')
  await p.getByRole('button', { name: 'Guardar la contraseña nueva' }).click()
  await expect(p.getByRole('heading', { name: 'Tu contraseña cambió' })).toBeVisible()
  await p.getByRole('link', { name: 'Iniciar sesión' }).click()
  await p.getByLabel('Email').fill('marta@example.test')
  await p.getByLabel('Contraseña').fill('a newer passphrase for marta')
  await p.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(p.getByRole('link', { name: 'Growth' })).toBeVisible()
  await ctx.close()
})
