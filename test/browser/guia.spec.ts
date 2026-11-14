// «Guía» (the manual, /guia; PR for the guide). Every screen's own test: the manual opens with its index
// (the rail's entry and a sections table), and one of its own screenshots loads from /guia-assets/ —
// the <img> the guide renderer draws on this screen only (the wiki keeps images as links).
import { expect, scenario, test } from './fixture.ts'

test('the manual opens: its rail entry, the index and its table of contents', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/guia')
  await expect(page.getByRole('heading', { name: 'Guía', exact: true })).toBeVisible()
  // The rail-foot entry leads here from every screen.
  await expect(page.locator('.rail-foot').getByRole('link', { name: 'Guía', exact: true })).toBeVisible()
  // The index lists the manual's sections, each linking to its own anchor on the page.
  await expect(page.locator('#seccion-indice').getByRole('link', { name: '00 · Empezar' })).toBeVisible()
  await expect(page.locator('#seccion-00-empezar')).toBeVisible()
})

test('a section anchor works and the manual carries one screenshot that loaded', async ({
  page,
  context,
  baseURL,
}) => {
  await scenario(context, baseURL as string, 'signed-in')
  await page.goto('/guia')
  await page.getByRole('link', { name: '04 · Propuestas' }).first().click()
  await expect(page.locator('#seccion-04-propuestas')).toBeInViewport()
  // A picture, not a link: the img asks for /guia-assets/ and the server answers with the bytes.
  const shot = page.locator('main img[src^="/guia-assets/"]').first()
  await shot.scrollIntoViewIfNeeded()
  await expect
    .poll(async () => shot.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
})
