// Admin › Backups & system against the real server and PostgreSQL (plan T018; CA10 web, risk 9; local lane): a copy
// made by hand; a copy that fails shows the band at the top of the administration until a good copy; restoring a copy
// with the name of the installation and the password answers first, then everyone (this person too) signs in again,
// with «Restored. Everyone signs in again». Files run in name order on one server: this one runs last, because a
// restore ends every session and key of the installation.
import { chmod } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { keepTheKey } from './key.ts'

const ADMIN = { name: 'Eric', email: 'eric@example.test', password: 'correct horse battery staple' }

test.describe.configure({ mode: 'serial' })

async function signedInAdmin(page: Page, baseURL: string): Promise<void> {
  await page.goto('/')
  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/Configurar obsybrain|Inicia sesión|Iniciar sesión|Tus brains/)
  const where = await h1.textContent()
  if (where === 'Configurar obsybrain') {
    await page.getByLabel('Nombre de esta instalación').fill('obsybrain')
    await page.getByLabel('Dirección que abre la gente').fill(baseURL)
    await page.getByLabel('Tu nombre').fill(ADMIN.name)
    await page.getByLabel('Tu email').fill(ADMIN.email)
    await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.password)
    await page.getByRole('button', { name: 'Configurar e iniciar sesión' }).click()
    await keepTheKey(page)
  } else if (/Inicia sesión|Iniciar sesión/.test(where ?? '')) {
    await page.getByLabel('Email').fill(ADMIN.email)
    await page.getByLabel('Contraseña').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeVisible()
}

async function makeCopy(page: Page, done: RegExp): Promise<void> {
  await page.goto('/admin/system')
  const part = page.getByRole('region', { name: 'Copias' })
  await expect(part.getByRole('button', { name: 'Hacer una copia ahora' })).toBeVisible()
  await part.getByRole('button', { name: 'Hacer una copia ahora' }).click()
  await expect(part.getByRole('status').filter({ hasText: done })).toBeFocused({ timeout: 20_000 })
}

test('CA10 (web): a copy that fails shows the band of the administration until a good copy', async ({
  page,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const { dir } = (await (await page.request.get('/__e2e/backups')).json()) as { dir: string }
  await makeCopy(page, /Copia hecha:/)
  await chmod(dir, 0o500)
  try {
    await makeCopy(page, /La copia no terminó/)
    await expect(page.getByRole('note').filter({ hasText: 'La última copia falló' })).toContainText(
      'obsybrain no puede escribir en la carpeta de las copias',
    )
    await page.goto('/admin/people')
    await expect(page.getByRole('alert').filter({ hasText: 'La última copia falló' })).toBeVisible()
  } finally {
    await chmod(dir, 0o700)
  }
  await makeCopy(page, /Copia hecha:/)
  await page.goto('/admin/people')
  await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible()
  await expect(page.getByText('La última copia falló')).toHaveCount(0)
})

test('risk 9: restoring with the name and the password answers first; then everyone signs in again', async ({
  page,
  browser,
  baseURL,
}) => {
  await signedInAdmin(page, baseURL as string)
  const name = ((await (await page.request.get('/v1/me')).json()) as { installation: { name: string } })
    .installation.name
  // Another person's session elsewhere ends too.
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await signedInAdmin(otherPage, baseURL as string)
  await makeCopy(page, /Copia hecha:/)
  const part = page.getByRole('region', { name: 'Copias' })
  await part
    .locator('.copies > li')
    .first()
    .getByRole('button', { name: /Restaurar la copia de/ })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Primero, obsybrain hace una copia de lo que hay ahora')
  await dialog.getByLabel('Nombre de esta instalación').fill(name)
  await dialog.getByLabel('Tu contraseña').fill(ADMIN.password)
  await dialog.getByRole('button', { name: 'Restaurar esta copia' }).click()
  await expect(page).toHaveURL(/\/sign-in$/, { timeout: 30_000 })
  await expect(
    page.getByRole('status').filter({ hasText: 'Restaurado. Todo el mundo vuelve a iniciar sesión' }),
  ).toBeVisible()
  expect((await page.request.get('/v1/me')).status()).toBe(401)
  expect((await otherPage.request.get('/v1/me')).status()).toBe(401)
  await other.close()
  // Signing in again works, and the copy made before the restore is listed.
  await page.getByLabel('Email').fill(ADMIN.email)
  await page.getByLabel('Contraseña').fill(ADMIN.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeVisible()
  await page.goto('/admin/system')
  await expect(page.getByRole('region', { name: 'Copias' })).toContainText('Antes de una restauración')
})
