// Spec B6 «Overview de un cerebro» and CA19 (T015, PR18): a brain at a glance — purpose, numbers,
// today's sessions with their summary, what waits for review, health — and, for a new brain, the three
// first steps, each marked by itself when it happens (an agent's first entry arrives by the live feed,
// without reloading). Importing a folder is the third (B7 PR32, test/browser/import.spec.ts).
import { expect, noSideScroll, scenario, test } from './fixture.ts'

test.describe('a new brain', () => {
  test("CA19: three first steps; the agent's first entry marks the first two without reloading", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'alone')
    await page.goto('/')
    await page.getByRole('button', { name: 'Crear brain' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'Crear un brain' })
    await dialog.getByLabel('Nombre').fill('Onboarding')
    await dialog.getByRole('button', { name: 'Crear brain' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Onboarding' })).toBeVisible()
    const steps = page.getByRole('region', { name: 'Primeros pasos' })
    const items = steps.getByRole('listitem')
    await expect(items).toHaveCount(3)
    await expect(items.nth(0)).toContainText('Conecta tu agente')
    // A screen reader hears each step with its number.
    await expect(steps.getByRole('heading', { level: 3, name: '1. Conecta tu agente' })).toBeVisible()
    await expect(items.nth(0)).toContainText('Por hacer')
    // Step 1 says what marks it.
    await expect(items.nth(0)).toContainText('cuando tu agente abre una sesión, busca, lee o guarda')
    await expect(items.nth(1)).toContainText('primera entrada')
    await expect(items.nth(1)).toContainText('Por hacer')
    await expect(items.nth(2)).toContainText('Importa una carpeta de documentación')
    await expect(items.nth(2).getByRole('link', { name: 'Importar una carpeta' })).toBeVisible()
    await expect(steps).not.toContainText('Ninguna todavía')
    // The first step leads to «Connect your agent» for this brain, and back.
    await items.nth(0).getByRole('link', { name: 'Conecta tu agente' }).click()
    await expect(page).toHaveURL(/\/connect\?brain=onboarding$/)
    await expect(page.getByRole('main')).toContainText('Onboarding')
    await page.goBack()
    await expect(items.nth(0)).toContainText('Por hacer')
    // The agent writes; the page hears it.
    const url = page.url()
    await s.emit('onboarding')
    await expect(items.nth(0)).toContainText('Hecho', { timeout: 5_000 })
    await expect(items.nth(1)).toContainText('Hecho')
    // The brain has an entry now: an import can no longer be taken, and the step says why.
    await expect(items.nth(2)).toContainText('solo entra en un brain vacío')
    expect(page.url()).toBe(url)
    await expect(page.getByText('1 entrada', { exact: false }).first()).toBeVisible()
  })
})

test.describe('a brain at work', () => {
  test("numbers, today's sessions with their summary, what waits and its health", async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth')
    await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
    await expect(page.getByText('What we learn about audience, retention and intros.')).toBeVisible()
    const numbers = page.getByRole('region', { name: 'En números' })
    await expect(numbers).toContainText('300')
    await expect(numbers).toContainText('1284')
    await expect(numbers).toContainText('37')
    // No first steps once the brain works.
    await expect(page.getByRole('region', { name: 'Primeros pasos' })).toHaveCount(0)
    const today = page.getByRole('region', { name: 'Sesiones de hoy' })
    await expect(today.getByRole('listitem')).toHaveCount(3)
    await expect(today).toContainText('Review the intros of October')
    await expect(today).toContainText('Claude Code')
    await expect(today).toContainText('Short intros keep viewers past 30 seconds')
    await expect(today).toContainText('abierta')
    // A program without a purpose: said in words, never a raw user agent.
    const third = today.getByRole('listitem').nth(2)
    await expect(third).toContainText('Trabajo sin nombre · un cliente de API')
    await expect(today).not.toContainText('curl/')
    await expect(today).not.toContainText('Sesión sin propósito dado')
    const waiting = page.getByRole('region', { name: 'Esperando revisión' })
    await expect(waiting.getByRole('listitem')).toHaveCount(3)
    await expect(waiting).toContainText('Intros: keep them under 10 seconds')
    await expect(waiting).toContainText('antiguo')
    const health = page.getByRole('region', { name: 'Salud' })
    await expect(health).toContainText('3 enlaces rotos')
    await expect(health).toContainText('4 páginas huérfanas')
  })

  test('a quiet day and a healthy wiki say so', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/legal-archive')
    await expect(page.getByRole('heading', { level: 1, name: 'Legal archive' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Salud' })).toContainText('Nada que corregir')
    await expect(page.getByRole('region', { name: 'Esperando revisión' })).toContainText(
      'Nada espera revisión',
    )
  })

  test('at 320 px nothing scrolls sideways', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in', { overview: 'much-data' })
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/b/growth')
    await expect(page.getByRole('region', { name: 'Sesiones de hoy' }).getByRole('listitem')).toHaveCount(20)
    await noSideScroll(page)
  })
})

test.describe('states', () => {
  test('loading keeps the shape, then the overview', async ({ page, context, baseURL }) => {
    const s = await scenario(context, baseURL as string, 'signed-in', { overview: 'loading' })
    await page.goto('/b/growth')
    await expect(page.locator('[data-state="loading"]').first()).toBeVisible()
    await expect(page.getByRole('region', { name: 'En números' })).toBeVisible({ timeout: 10_000 })
    await s.state('overview', 'normal')
  })

  test('an error says what happened, and "try again" recovers', async ({ page, context, baseURL }) => {
    const s = await scenario(context, baseURL as string, 'signed-in', { overview: 'error' })
    await page.goto('/b/growth')
    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Something went wrong on the server')
    await s.state('overview', 'normal')
    await alert.getByRole('button', { name: 'Probar otra vez' }).click()
    await expect(page.getByRole('region', { name: 'En números' })).toBeVisible()
  })

  test('offline keeps what is on screen', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth')
    await expect(page.getByRole('region', { name: 'En números' })).toBeVisible()
    await context.setOffline(true)
    await expect(page.getByText('Estás sin conexión.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'En números' })).toBeVisible()
    await context.setOffline(false)
  })
})
