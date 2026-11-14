// «Guía» (the manual, /guia): two panes — the sections list (a strip of chips on a phone) beside the
// active section. The manual opens on its index; an entry of the list, a link inside the manual (the
// TOC, «Siguiente →») and a deep link (/guia#seccion-07-agente) open one section at a time, and the
// active section's own screenshots load from /guia-assets/ — the <img> the guide renderer draws on
// this screen only (the wiki keeps images as links).
import type { Page } from '@playwright/test'
import { expect, scenario, test } from './fixture.ts'

const oneSectionAtATime = async (page: Page, id: string) => {
  await expect(page.locator(`#seccion-${id}`)).toBeVisible()
  await expect(page.locator('main section[id^="seccion-"]')).toHaveCount(1)
}

test('the manual opens on its index: the rail entry, the section list and the table of contents', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/guia')
  await expect(page.getByRole('heading', { name: 'Guía', exact: true })).toBeVisible()
  // The rail-foot entry leads here from every screen.
  await expect(page.locator('.rail-foot').getByRole('link', { name: 'Guía', exact: true })).toBeVisible()
  // The section list names every part of the manual, and the index is where the manual opens.
  const list = page.locator('.guia-nav')
  await expect(list.getByRole('link', { name: 'Volver al índice' })).toBeVisible()
  for (const title of ['00 · Empezar', '07 · Conecta tu agente', '10 · Búsqueda y atajos'])
    await expect(list.getByRole('link', { name: title })).toBeVisible()
  await expect(list.locator('a[aria-current]')).toHaveAttribute('href', '#seccion-indice')
  // The index renders with its own table of contents; no section is stacked under it.
  await expect(page.locator('#seccion-indice').getByRole('link', { name: '00 · Empezar' })).toBeVisible()
  await oneSectionAtATime(page, 'indice')
})

test('an entry of the section list opens that section, and its own «Índice» link comes back', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/guia')
  await page.locator('.guia-nav').getByRole('link', { name: '07 · Conecta tu agente' }).click()
  await oneSectionAtATime(page, '07-agente')
  // The hash names the section, so the address can be copied or shared as it is.
  await expect(page).toHaveURL(/\/guia#seccion-07-agente$/)
  // The section's own «← Índice» link (the renderer's anchor) turns back to the index.
  await page.locator('#seccion-07-agente').getByRole('link', { name: '← Índice' }).click()
  await oneSectionAtATime(page, 'indice')
  await expect(page).toHaveURL(/\/guia#seccion-indice$/)
})

test('a deep link opens the section named in the hash directly', async ({ page, context, baseURL }) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/guia#seccion-07-agente')
  await oneSectionAtATime(page, '07-agente')
  // The list marks the section the hash names.
  await expect(page.locator('.guia-nav').locator("a[aria-current='page']")).toHaveAttribute(
    'href',
    '#seccion-07-agente',
  )
})

test('a section opens from the table of contents, and the manual carries one screenshot that loaded', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/guia')
  // A link inside the manual («04-propuestas.md» → #seccion-04-propuestas) turns the page.
  await page.locator('#seccion-indice').getByRole('link', { name: '04 · Propuestas' }).click()
  await oneSectionAtATime(page, '04-propuestas')
  await expect(page).toHaveURL(/\/guia#seccion-04-propuestas$/)
  // A picture, not a link: the img asks for /guia-assets/ and the server answers with the bytes.
  const shot = page.locator('main img[src^="/guia-assets/"]').first()
  await shot.scrollIntoViewIfNeeded()
  await expect
    .poll(async () => shot.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
})
