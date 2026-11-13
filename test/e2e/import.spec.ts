// Settings › Import against the real server and PostgreSQL (plan T031; local lane): a curator imports the sample
// 02-DOCS (test/fixtures/docs-sample/) as a .zip from the screen; the report says what came in; the overview of
// the brain, open in another tab, marks its third step by the event, without reloading; the wiki has the pages.
import { expect, type Page, test } from '@playwright/test'
import { zipOfFolder } from '../helpers/zipfolder.ts'
import { keepTheKey } from './key.ts'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }
const SAMPLE = new URL('../fixtures/docs-sample/', import.meta.url).pathname

test.describe.configure({ mode: 'serial' })

async function signedInAdmin(page: Page, baseURL: string): Promise<void> {
  await page.goto('/')
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/Configurar obsybrain|Iniciar sesión|Tus brains/)
  const where = await h1.textContent()
  if (where === 'Configurar obsybrain') {
    await page.getByLabel('Nombre de esta instalación').fill('obsybrain')
    await page.getByLabel('Dirección que abre la gente').fill(baseURL)
    await page.getByLabel('Tu nombre').fill(ADMIN.name)
    await page.getByLabel('Tu email').fill(ADMIN.email)
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await keepTheKey(page)
  } else if (where === 'Iniciar sesión') {
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeVisible()
}

test('a curator imports the sample docs; the overview marks step 3 by the event', async ({
  page,
  baseURL,
  context,
}) => {
  await signedInAdmin(page, baseURL as string)
  await page.getByRole('button', { name: 'Crear brain' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Crear un brain' })
  await dialog.getByLabel('Nombre').fill('Import walk')
  await dialog.getByRole('button', { name: 'Crear brain' }).click()
  await expect(page).toHaveURL(/\/b\/[^/]+$/)
  const slug = decodeURIComponent(new URL(page.url()).pathname.split('/')[2] as string)
  const third = page.getByRole('region', { name: 'Primeros pasos' }).getByRole('listitem').nth(2)
  await expect(third).toContainText('Por hacer')
  const overviewUrl = page.url()
  // The import, from Settings in another tab.
  const other = await context.newPage()
  await other.goto(`/b/${slug}/settings/import`)
  const part = other.getByRole('region', { name: 'Importar una carpeta de documentación' })
  await part.getByLabel('Zip a importar').setInputFiles({
    name: 'docs-sample.zip',
    mimeType: 'application/zip',
    buffer: await zipOfFolder(SAMPLE),
  })
  await part.getByRole('button', { name: 'Importar la carpeta' }).click()
  const report = part.getByRole('region', { name: 'Qué entró' })
  await expect(report).toContainText('Importadas 5 páginas, 4 entradas y 5 enlaces de docs-sample.zip.')
  await report.getByText('Quedó fuera (7)').click()
  await expect(report).toContainText('raw/keys/admin.totp')
  // The overview heard it.
  await expect(third).toContainText('Hecho', { timeout: 10_000 })
  expect(page.url()).toBe(overviewUrl)
  // The wiki has the pages, linked.
  await report.getByRole('link', { name: 'Abrir el wiki' }).click()
  await expect(other.getByText('Getting started').first()).toBeVisible()
  const graph = await other.request.get(`/v1/brains/${slug}/wiki/graph`)
  const g = (await graph.json()) as { nodes: unknown[]; edges: unknown[] }
  expect([g.nodes.length, g.edges.length]).toEqual([5, 5])
})
