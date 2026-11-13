// Settings › Import and the third first step (spec B7 «Importar», plan T031), against the fixture API. Job: a
// curator of a new brain brings in a documentation folder as a .zip. Done when: the screen says what came in and
// what did not, leads to the wiki, and the overview's step 3 is marked (by the event, without reloading). States:
// ready, a file that cannot go (said before it goes), uploading then writing, done with the report, refused (the
// server's words; the file stays chosen), a brain with content (no form, said why), offline, a long report. By
// keyboard alone; at 320 px without sideways scroll; the audit passes.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { zipOfFolder } from '../helpers/zipfolder.ts'
import { expect, noSideScroll, scenario, test } from './fixture.ts'

const SAMPLE = new URL('../fixtures/docs-sample/', import.meta.url).pathname

async function audit(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const bad = r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(bad).toEqual([])
}

const part = (page: Page) => page.getByRole('region', { name: 'Importar una carpeta de documentación' })

async function newBrain(page: Page, name = 'Onboarding') {
  await page.goto('/')
  await page.getByRole('button', { name: 'Crear brain' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Crear un brain' })
  await dialog.getByLabel('Nombre').fill(name)
  await dialog.getByRole('button', { name: 'Crear brain' }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

test.describe('importing a documentation folder', () => {
  test('from the first steps to the report, and the third step marks itself', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await newBrain(page)
    const steps = page.getByRole('region', { name: 'Primeros pasos' })
    const third = steps.getByRole('listitem').nth(2)
    await expect(steps.getByRole('listitem')).toHaveCount(3)
    await expect(
      third.getByRole('heading', { level: 3, name: '3. Importa una carpeta de documentación' }),
    ).toBeVisible()
    await expect(third).toContainText('Por hacer')
    await third.getByRole('link', { name: 'Importar una carpeta' }).click()
    await expect(page).toHaveURL(/\/b\/onboarding\/settings\/import$/)
    const p = part(page)
    await expect(p).toContainText('Solo en un brain vacío')
    await expect(page.getByRole('link', { name: 'Importar', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await audit(page, 'import ready')
    await p.getByLabel('Zip a importar').setInputFiles({
      name: 'docs-sample.zip',
      mimeType: 'application/zip',
      buffer: await zipOfFolder(SAMPLE),
    })
    await p.getByRole('button', { name: 'Importar la carpeta' }).click()
    const report = p.getByRole('region', { name: 'Qué entró' })
    await expect(report).toBeVisible()
    await expect(report.getByRole('heading', { name: 'Qué entró' })).toBeFocused()
    await expect(report).toContainText('Importadas 5 páginas, 4 entradas y 5 enlaces de docs-sample.zip.')
    await report.getByText('Quedó fuera (7)').click()
    await expect(report).toContainText('raw/keys/admin.totp — con nombre de clave o secreto: nunca se lee')
    await report.getByText('Enlaces que no llevan a ninguna parte (3)').click()
    await expect(report).toContainText('missing-page desde topics/retention')
    // A link to a file that was left out says so (review of PR32).
    await expect(report).toContainText(
      'wiki/diagram.png desde topics/retention apunta a un archivo que quedó fuera',
    )
    // A file that was not UTF-8 was read as Windows-1252, and the report says which.
    await report.getByText('Leídos como Windows-1252 (1)').click()
    await expect(report).toContainText('wiki/latin.md')
    await report.getByText('Nombres convertidos en direcciones (1)').click()
    await expect(report).toContainText('wiki/topics/Audience Notes.md se convierte en topics/audience-notes')
    await expect(report.getByRole('link', { name: 'Abrir el wiki' })).toHaveAttribute(
      'href',
      '/b/onboarding/wiki',
    )
    await audit(page, 'import done')
    await page.goto('/b/onboarding')
    await expect(third).toContainText('Hecho')
    await expect(third).toContainText('Importado.')
  })

  test('the third step marks itself when someone else imports, without reloading', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await newBrain(page)
    const third = page.getByRole('region', { name: 'Primeros pasos' }).getByRole('listitem').nth(2)
    await expect(third).toContainText('Por hacer')
    const url = page.url()
    await s.emit('onboarding', 'brain.imported', { target: { id: '', label: 'docs' } })
    await expect(third).toContainText('Hecho', { timeout: 5_000 })
    expect(page.url()).toBe(url)
  })

  test('a file that cannot go is said before it goes; a refusal keeps the file and says what to do', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await newBrain(page)
    await page.goto('/b/onboarding/settings/import')
    const p = part(page)
    const input = p.getByLabel('Zip a importar')
    // Nothing chosen: the button says what to do first.
    await p.getByRole('button', { name: 'Importar la carpeta' }).click()
    await expect(p).toContainText('Primero elige un .zip para importar.')
    await expect(input).toBeFocused()
    await input.setInputFiles({
      name: 'notes.tar.gz',
      mimeType: 'application/gzip',
      buffer: Buffer.from('x'),
    })
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(p).toContainText('Esto no es un .zip.')
    // A .zip that is not one: the server's words, and the person can choose another.
    await input.setInputFiles({
      name: 'broken.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from('not a zip'),
    })
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    await p.getByRole('button', { name: 'Importar la carpeta' }).click()
    const alert = p.getByRole('alert')
    await expect(alert).toContainText('This is not a zip obsybrain can read: its end record is missing')
    await expect(alert).toContainText(
      'Make the zip again from the folder (with no links in it) and import it.',
    )
    await expect(alert).toBeFocused()
    await expect(p.getByRole('region', { name: 'Qué entró' })).toHaveCount(0)
    await audit(page, 'import refused')
  })

  test('the form waits for the overview: nothing to send until the brain is known to be empty', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { overview: 'loading' })
    await newBrain(page, 'Slow')
    await page.goto('/b/slow/settings/import')
    const p = part(page)
    await expect(p).toBeVisible()
    await expect(p.getByLabel('Zip a importar')).toHaveCount(0)
    await expect(p.getByLabel('Zip a importar')).toBeVisible({ timeout: 10_000 })
  })

  test('a brain with content says why it cannot import, instead of a form', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/import')
    const p = part(page)
    await expect(p).toContainText('Este brain ya tiene contenido')
    await expect(p.getByLabel('Zip a importar')).toHaveCount(0)
  })

  test('by keyboard alone, with a long report', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in', { import: 'much-data' })
    await newBrain(page)
    await page.goto('/b/onboarding/settings/import')
    await expect(page.locator('#import-title')).toBeFocused()
    const p = part(page)
    await p.getByLabel('Zip a importar').setInputFiles({
      name: 'docs.zip',
      mimeType: 'application/zip',
      buffer: await zipOfFolder(SAMPLE),
    })
    await p.getByLabel('Zip a importar').focus()
    await page.keyboard.press('Tab')
    await expect(p.getByRole('button', { name: 'Importar la carpeta' })).toBeFocused()
    await page.keyboard.press('Enter')
    const report = p.getByRole('region', { name: 'Qué entró' })
    await expect(report.getByRole('heading', { name: 'Qué entró' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(report.getByRole('link', { name: 'Abrir el wiki' })).toBeFocused()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    await expect(report).toContainText('Quedó fuera (1234)')
    await expect(report).toContainText('Y 734 más, sin listar aquí.')
  })

  test('offline, the button says why it waits; at 320 px it fits and passes the audit', async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await scenario(context, baseURL as string, 'signed-in')
    await newBrain(page)
    await page.goto('/b/onboarding/settings/import')
    const button = part(page).getByRole('button', { name: 'Importar la carpeta' })
    await expect(button).toBeEnabled()
    await noSideScroll(page)
    await audit(page, 'import 320')
    await context.setOffline(true)
    await expect(button).toBeDisabled()
    await context.setOffline(false)
    await expect(button).toBeEnabled()
  })
})
