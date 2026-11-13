// Spec B6 «Search» (PR23, T039): ⌘K or Ctrl K from anywhere searches the current brain or all of mine; each
// result says why it is there; filters at the side, in a panel on a phone; with no results it suggests
// removing the filters or searching all; Enter opens and Esc goes back, with the keyboard where it was.
import { expect, noSideScroll, scenario, test } from './fixture.ts'

const dialog = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Buscar' })

// Ctrl+K is heard once the signed-in shell is drawn (its keys on): pressed before, it reaches nothing.
const signedInShell = async (page: import('@playwright/test').Page) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Tus brains' })).toBeVisible()
  await page.locator('html[data-keys="on"]').waitFor({ state: 'attached' })
}

test('inside a brain it searches that brain; each result says why', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
  const asked: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/v1/search')) asked.push(r.url())
  })
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await expect(d.getByRole('searchbox', { name: 'Buscar' })).toBeFocused()
  await expect(d.getByRole('radio', { name: 'Este brain (Growth)' })).toBeChecked()
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('intro')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  const results = d.getByRole('list', { name: 'Resultados' }).getByRole('listitem')
  await expect(results.first()).toBeVisible()
  await expect(results.first()).toContainText('matched by words')
  expect(asked.at(-1)).toContain('brains=growth')
  await d.getByRole('radio', { name: 'Todos mis brains' }).check()
  await expect.poll(() => asked.at(-1) ?? '').not.toContain('brains=')
})

test('Enter opens a result; the arrows move between results', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('retention')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  const first = d.getByRole('list', { name: 'Resultados' }).getByRole('link').first()
  await expect(first).toBeVisible()
  await d.getByRole('searchbox', { name: 'Buscar' }).press('ArrowDown')
  await expect(first).toBeFocused()
  const href = await first.getAttribute('href')
  await page.keyboard.press('Enter')
  await expect(d).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`${href?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
})

test('Esc goes back, with the keyboard where it was', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  const link = page
    .getByRole('navigation', { name: 'Secciones de este brain' })
    .getByRole('link', { name: 'Diario' })
  await link.focus()
  await page.keyboard.press('Control+k')
  await expect(dialog(page)).toBeVisible()
  await dialog(page).getByRole('searchbox', { name: 'Buscar' }).fill('retention')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(link).toBeFocused()
  // Also from a result.
  await page.keyboard.press('Control+k')
  await dialog(page).getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await dialog(page).getByRole('searchbox', { name: 'Buscar' }).press('ArrowDown')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toBeHidden()
  await expect(link).toBeFocused()
})

test('Ctrl K works while typing in a field; letters do not', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth/journal')
  const field = page.getByLabel('Referencia')
  await page.locator('summary').filter({ hasText: 'Filtrar las sesiones' }).click()
  await field.fill('g j')
  await expect(page).toHaveURL(/\/journal$/)
  await field.press('Control+k')
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(field).toBeFocused()
})

test('no results: remove the filters, or search all my brains', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await d.getByLabel('Escrita o cambiada desde').fill('2030-01-01')
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('retention')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByText('Nada encontrado para "retention".')).toBeVisible()
  await expect(d.getByText('Los filtros pueden estar ocultándolo.')).toBeVisible()
  await d.getByRole('button', { name: 'Quitar los filtros' }).first().click()
  await expect(d.getByRole('list', { name: 'Resultados' }).getByRole('listitem').first()).toBeVisible()
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('zzz-nothing')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByText('Puede estar en otro brain')).toBeVisible()
  await d.getByRole('button', { name: 'Buscar en todos mis brains' }).click()
  await expect(d.getByRole('radio', { name: 'Todos mis brains' })).toBeChecked()
  await expect(d.getByRole('button', { name: 'Buscar en todos mis brains' })).toHaveCount(0)
})

test('on a phone the filters are in a panel; nothing scrolls sideways at 320 px', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/b/growth')
  await page.getByRole('button', { name: 'Buscar' }).first().click()
  const d = dialog(page)
  await expect(d.getByLabel('Tipo')).toBeHidden()
  await d.getByRole('button', { name: 'Filtros' }).click()
  await expect(d.getByLabel('Tipo')).toBeVisible()
  await d.getByLabel('Tipo').selectOption('guide')
  await d.getByRole('button', { name: 'Ocultar los filtros' }).click()
  await expect(d.getByRole('button', { name: 'Filtros (1)' })).toBeVisible()
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('intro')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByRole('list', { name: 'Resultados' }).getByRole('listitem').first()).toBeVisible()
  await noSideScroll(page)
})

test('outside a brain it searches all my brains; much data shows more on request', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in', { search: 'much-data' })
  await page.goto('/')
  await signedInShell(page)
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await expect(d.getByRole('radio')).toHaveCount(0)
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('intro')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  const results = d.getByRole('list', { name: 'Resultados' }).getByRole('listitem')
  await expect(results).toHaveCount(20)
  await d.getByRole('button', { name: 'Mostrar más resultados' }).click()
  await expect(results.nth(20)).toBeVisible()
})

test('an error says what happened and keeps the words', async ({ page, context, baseURL }) => {
  const s = await scenario(context, baseURL as string, 'signed-in', { search: 'error' })
  await page.goto('/')
  await signedInShell(page)
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('retention')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByRole('alert')).toContainText('Something went wrong on the server')
  await expect(d.getByRole('searchbox', { name: 'Buscar' })).toHaveValue('retention')
  await s.state('search', 'normal')
  await d.getByRole('button', { name: 'Probar otra vez' }).click()
  await expect(d.getByRole('list', { name: 'Resultados' })).toBeVisible()
})

// Review of PR23.
test('«Show more» pages the words that were searched, not what the field says now', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in', { search: 'much-data' })
  await page.goto('/')
  await signedInShell(page)
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('intro')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByRole('list', { name: 'Resultados' }).getByRole('listitem')).toHaveCount(20)
  const asked: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/v1/search')) asked.push(r.url())
  })
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('something else')
  await d.getByRole('button', { name: 'Mostrar más resultados' }).click()
  await expect.poll(() => asked.length).toBe(1)
  expect(asked[0]).toContain('q=intro')
  expect(asked[0]).toContain('offset=20')
})

test('reopened in another brain, the old results are gone', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
  await page.keyboard.press('Control+k')
  await dialog(page).getByRole('searchbox', { name: 'Buscar' }).fill('intro')
  await dialog(page).getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(dialog(page).getByRole('list', { name: 'Resultados' })).toBeVisible()
  await page.keyboard.press('Escape')
  // Moving inside the web (no reload): the dialog keeps its state, so the old answer must go.
  await page.getByRole('link', { name: 'Todos los brains', exact: true }).click()
  await page.getByRole('link', { name: 'Support' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Support' })).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(dialog(page).getByRole('radio', { name: 'Este brain (Support)' })).toBeChecked()
  await expect(dialog(page).getByRole('list', { name: 'Resultados' })).toHaveCount(0)
})

test('a filter changed while a search is on its way runs; the older answer never lands', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
  // The first answer is slow; the second fast.
  let n = 0
  await page.route('**/v1/search?*', async (route) => {
    n += 1
    if (n === 2) await new Promise((r) => setTimeout(r, 1_500))
    await route.continue()
  })
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('retention')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByRole('list', { name: 'Resultados' })).toBeVisible()
  await d.getByLabel('Mostrar').selectOption('entries')
  await d.getByLabel('Mostrar').selectOption('pages')
  await page.waitForTimeout(2_000)
  const kinds = await d.getByRole('list', { name: 'Resultados' }).getByRole('listitem').allTextContents()
  expect(kinds.length).toBeGreaterThan(0)
  for (const k of kinds) expect(k).toContain('Página del wiki')
})

test('snippets highlight what matched and show no markdown; Type follows what is shown', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('retention')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByRole('list', { name: 'Resultados' }).locator('mark').first()).toBeVisible()
  await expect(d.getByRole('list', { name: 'Resultados' })).not.toContainText('«')
  await expect(d.getByRole('list', { name: 'Resultados' })).not.toContainText('[[')
  await expect(d.getByRole('list', { name: 'Resultados' })).not.toContainText('##')
  await d.getByLabel('Mostrar').selectOption('pages')
  const types = await d.getByLabel('Tipo').locator('option').allTextContents()
  expect(types).not.toContain('Learning')
  expect(types).toContain('Tema')
})

test('on a phone the filters open right below their button, without moving what is above', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.setViewportSize({ width: 375, height: 740 })
  await page.goto('/b/growth')
  await page.getByRole('button', { name: 'Buscar' }).first().click()
  const d = dialog(page)
  const toggle = d.getByRole('button', { name: 'Filtros' })
  const before = await toggle.boundingBox()
  await toggle.click()
  const after = await d.getByRole('button', { name: 'Ocultar los filtros' }).boundingBox()
  expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2)
  const panel = await d.getByLabel('Mostrar').boundingBox()
  expect(panel?.y ?? 0).toBeGreaterThan((after?.y ?? 0) + (after?.height ?? 0) - 1)
})

test('new words sent while a search is on its way replace it; old answers never show under new words', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/b/growth')
  await expect(page.getByRole('heading', { level: 1, name: 'Growth' })).toBeVisible()
  let n = 0
  await page.route('**/v1/search?*', async (route) => {
    n += 1
    if (n === 1) await new Promise((r) => setTimeout(r, 1_500))
    await route.continue()
  })
  await page.keyboard.press('Control+k')
  const d = dialog(page)
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('retention')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await d.getByRole('searchbox', { name: 'Buscar' }).fill('zzz-nothing-at-all')
  await d.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
  await expect(d.getByText('Nada encontrado para "zzz-nothing-at-all".')).toBeVisible()
  await page.waitForTimeout(1_800)
  await expect(d.getByRole('list', { name: 'Resultados' })).toHaveCount(0)
  expect(n).toBe(2)
})
