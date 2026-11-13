// Admin › People › Imported authors (review of PR32), against the fixture API. Job: an administrator erases the
// name of someone a faithful import brought in. Done when: the author is listed apart (name, the brains they wrote
// in, when they came in), «Anonymise» asks first, then says it and the row signs as «Former author». An
// installation with no imported author shows no such section. By keyboard; at 320 px without sideways scroll.
import { expect, noSideScroll, scenario, test } from './fixture.ts'

test.describe('imported authors in the administration', () => {
  test('listed apart, anonymised after asking, and said', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/people')
    const part = page.getByRole('region', { name: 'Autores importados' })
    await expect(part).toContainText('Old Colleague (imported)')
    await expect(part).toContainText('Growth')
    await expect(part).toContainText('No pueden iniciar sesión')
    // Not among the people who sign in.
    await expect(page.getByRole('region', { name: 'Personas en esta instalación' })).not.toContainText(
      'Old Colleague',
    )
    const anonymise = part.getByRole('button', { name: 'Anonimizar a Old Colleague (imported)' })
    await anonymise.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: '¿Anonimizar a Old Colleague (imported)?' })
    await expect(dialog).toContainText('Autor anterior')
    await dialog.getByRole('button', { name: 'Anonimizar', exact: true }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'ahora firma como Autor anterior' }),
    ).toBeVisible()
    await expect(part.getByRole('listitem')).toHaveText(/^Autor anterior/)
    await expect(part.getByRole('listitem')).not.toContainText('Old Colleague')
    await expect(part.getByRole('button', { name: /^Anonymise/ })).toHaveCount(0)
    await page.setViewportSize({ width: 320, height: 800 })
    await noSideScroll(page)
  })

  test('no imported author, no section', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in', { people: 'empty' })
    await page.goto('/admin/people')
    await expect(page.getByRole('heading', { level: 2, name: 'Personas en esta instalación' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Autores importados' })).toHaveCount(0)
  })
})
