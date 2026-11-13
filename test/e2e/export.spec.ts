// Settings › Export against the real server and PostgreSQL (plan T024; local lane): a curator saves the
// readable export from the screen and gets the brain's wiki as files a vault opens; then the faithful one,
// with its manifest. The audit has both.
import { readFileSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'
import { filesOf } from '../helpers/unzip.ts'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }
const WEB = { 'x-requested-with': 'obsybrain-web' }

test.describe.configure({ mode: 'serial' })

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
  } else if (where === 'Iniciar sesión') {
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeVisible()
}

test('a curator saves both exports from Settings, and they hold the brain', async ({ page, baseURL }) => {
  await signedInAdmin(page, baseURL as string)
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear brain' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Crear un brain' })
  await dialog.getByLabel('Nombre').fill('Export walk')
  await dialog.getByLabel('Para qué sirve').fill('What the export e2e walks.')
  await dialog.getByRole('button', { name: 'Crear brain' }).click()
  await expect(page).toHaveURL(/\/b\/[^/]+$/)
  const slug = decodeURIComponent(new URL(page.url()).pathname.split('/')[2] as string)
  for (const [address, body] of [
    ['audience/retention', 'Retention leads to [[audience/intros]].'],
    ['audience/intros', 'Short intros.'],
  ]) {
    const r = await page.request.post(`/v1/brains/${slug}/wiki/changes`, {
      headers: WEB,
      data: {
        op: 'create',
        address,
        type: 'topic',
        title: `About ${address}`,
        summary: 'A page.',
        body,
        tags: [],
        sources: [],
        reason: 'The export walk.',
      },
    })
    expect(r.status(), await r.text()).toBe(201)
  }
  await page.goto(`/b/${slug}/settings/archive`)
  const part = page.getByRole('region', { name: 'Exportar', exact: true })
  const [readable] = await Promise.all([
    page.waitForEvent('download'),
    part.getByRole('button', { name: 'Descargar la exportación' }).click(),
  ])
  expect(readable.suggestedFilename()).toMatch(
    new RegExp(`^obsybrain-${slug}-readable-\\d{8}T\\d{6}Z\\.zip$`),
  )
  const files = filesOf(readFileSync(await readable.path()))
  expect(files.get('wiki/audience/retention.md')).toContain('[[wiki/audience/intros|audience/intros]]')
  expect(files.has('index.md')).toBe(true)
  await expect(part.getByRole('status')).toContainText('Saved obsybrain-')

  await part.getByLabel('Faithful').check()
  const [faithful] = await Promise.all([
    page.waitForEvent('download'),
    part.getByRole('button', { name: 'Descargar la exportación' }).click(),
  ])
  const all = filesOf(readFileSync(await faithful.path()))
  const manifest = JSON.parse(all.get('manifest.json') as string) as {
    format: string
    counts: { pages: number }
  }
  expect(manifest.format).toBe('obsybrain-faithful')
  expect(manifest.counts.pages).toBe(2)
  const audit = await page.request.get(`/v1/brains/${slug}/audit?action=brain.export`)
  expect(audit.status()).toBe(200)
  const lines = ((await audit.json()) as { items: { action: string }[] }).items.filter(
    (i) => i.action === 'brain.export',
  )
  expect(lines.length).toBe(2)
})
