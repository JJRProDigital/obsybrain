// A brain's settings (spec B6 «Settings de un cerebro», plan T046; PR25a and its fixes), against the
// fixture API: four tabs (Members, Agents, Health, Archive); who is in the brain and with which role (the
// last curator stays, and the screen says why; a role is saved with its own button); the repositories
// agents find it by; the compile guide (folded until opened) and the usage note; meaning search; the health
// thresholds; archiving and, for the administration, deleting. Each part saves only what it changed, on the
// value it read: another curator's change in another part is never erased, and one in the same field is
// shown with what was typed kept. Only curators reach it.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, noSideScroll, scenario, test } from './fixture.ts'

async function audit(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const bad = r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(bad).toEqual([])
}

const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true })
const tab = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Partes de los ajustes' }).getByRole('link', { name })
const member = (page: Page, name: string) =>
  region(page, 'Miembros').getByRole('listitem').filter({ hasText: name })

test.describe('settings of a brain', () => {
  test('a curator reaches them from the brain; four tabs, each with its parts, each passing the audit', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth')
    await page
      .getByRole('navigation', { name: 'Secciones de este brain' })
      .getByRole('link', { name: 'Ajustes' })
      .click()
    await expect(page).toHaveURL(/\/b\/growth\/settings$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Ajustes' })).toBeVisible()
    await expect(tab(page, 'Miembros')).toHaveAttribute('aria-current', 'page')
    const parts: Record<string, string[]> = {
      Members: ['Miembros'],
      Agents: ['Repositories', 'Nota de uso', 'Guía de compilación', 'Búsqueda por significado'],
      'Umbrales de salud': ['Umbrales de salud'],
      Archive: ['Exportar', 'Archivar', 'Eliminar este brain'],
    }
    for (const [name, regions] of Object.entries(parts)) {
      await tab(page, name).click()
      await expect(tab(page, name)).toHaveAttribute('aria-current', 'page')
      for (const r of regions) await expect(region(page, r)).toBeVisible()
      await expect(
        page
          .getByRole('navigation', { name: 'Secciones de este brain' })
          .getByRole('link', { name: 'Ajustes' }),
      ).toHaveAttribute('aria-current', /page|true/)
      await audit(page, `settings ${name}`)
    }
    // A part heading reads stronger than a field label.
    await tab(page, 'Umbrales de salud').click()
    const size = async (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize))
    expect(await size('#health-title')).toBeGreaterThan(await size('label[for="threshold-staleDays"]'))
    await page.evaluate(() => localStorage.setItem('rscb.theme', 'light'))
    await page.reload()
    await expect(region(page, 'Umbrales de salud').getByLabel('Desactualizada tras (días)')).toBeVisible()
    await audit(page, 'settings light')
  })

  test('the only curator cannot be demoted or removed, and the select says why', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings')
    const eric = member(page, 'Eric')
    await expect(eric).toContainText('Solo curador')
    const select = eric.getByRole('combobox')
    // Off but still reachable, so its reason is heard: moving through it changes nothing.
    await expect(select).toHaveAttribute('aria-disabled', 'true')
    await expect(select).toHaveAccessibleDescription(/A brain always keeps a curator/)
    await select.focus()
    await expect(select).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(select).toHaveValue('curator')
    await expect(eric.getByRole('button', { name: /Guardar rol/ })).toHaveCount(0)
    await expect(eric.getByRole('button', { name: /Remove/ })).toHaveCount(0)
  })

  test('a role is saved with its own button (moving through the list saves nothing), then the list is read again', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings')
    const ana = member(page, 'Ana')
    const select = ana.getByLabel('Rol de Ana')
    const writes: string[] = []
    page.on('request', (r) => {
      if (r.method() !== 'GET' && r.url().includes('/members')) writes.push(r.method())
    })
    await select.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByRole('status').filter({ hasText: 'Ana ahora es' })).toHaveCount(0)
    expect(writes).toEqual([])
    await select.selectOption('reader')
    await ana.getByRole('button', { name: 'Guardar el rol de Ana' }).click()
    const said = page.getByRole('status').filter({ hasText: 'Ana ahora es lector.' })
    await expect(said).toBeFocused()
    await expect(ana.getByRole('button', { name: 'Guardar el rol de Ana' })).toHaveCount(0)
    await expect(select).toHaveValue('reader')
    // One write: the button's; choosing in the list sent nothing.
    expect(writes).toHaveLength(1)
  })

  test('giving up one’s own curator role asks first, then the page says why it closes', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings')
    await member(page, 'Ana').getByLabel('Rol de Ana').selectOption('curator')
    await member(page, 'Ana').getByRole('button', { name: 'Guardar el rol de Ana' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana ahora es curador.' })).toBeVisible()
    await member(page, 'Eric').getByLabel('Rol de Eric').selectOption('contributor')
    await member(page, 'Eric').getByRole('button', { name: 'Guardar el rol de Eric' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Renunciar al rol de curador?' })
    await expect(dialog).toContainText('can no longer change its settings')
    await dialog.getByRole('button', { name: 'Renunciar' }).click()
    await expect(page.locator('[data-state="forbidden"]')).toContainText(
      'Solo los curadores de Growth cambian sus ajustes',
    )
  })

  // The root cause of the B7 flake (F1-PR13): the row copied its saved role into the choice in an effect that
  // runs after paint. A role picked before that first effect (Playwright's selectOption does not wait for
  // stability, and a loaded machine delays effects) was put back, so «Save role of Ana» never appeared and
  // the next click waited until its timeout. Here the role is picked the moment the row is in the page.
  test('a role picked the moment the row appears is kept', async ({ page, context, baseURL }) => {
    await page.addInitScript(() => {
      const watch = new MutationObserver(() => {
        const s = document.querySelector<HTMLSelectElement>('select[aria-label="Rol de Ana"]')
        if (!s) return
        watch.disconnect()
        s.value = 'curator'
        s.dispatchEvent(new Event('change', { bubbles: true }))
      })
      document.addEventListener('DOMContentLoaded', () =>
        watch.observe(document.body, { childList: true, subtree: true }),
      )
    })
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings')
    const ana = member(page, 'Ana')
    await expect(ana.getByRole('button', { name: 'Guardar el rol de Ana' })).toBeVisible()
    await expect(ana.getByLabel('Rol de Ana', { exact: true })).toHaveValue('curator')
    await ana.getByRole('button', { name: 'Guardar el rol de Ana' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana ahora es curador.' })).toBeVisible()
  })

  test('leaving a brain speaks to you, by your row', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings')
    await member(page, 'Ana').getByLabel('Rol de Ana').selectOption('curator')
    await member(page, 'Ana').getByRole('button', { name: 'Guardar el rol de Ana' }).click()
    // Leaving needs another curator: the role is saved (and said) before Eric asks to leave. Without this wait, a
    // slow save left the leave button refusing, and the test hung until its timeout (B7 debt, fixed in PR35).
    await expect(page.getByRole('status').filter({ hasText: 'Ana ahora es curador.' })).toBeVisible()
    const eric = member(page, 'Eric')
    await eric.getByRole('button', { name: 'Salir de Growth' }).click()
    await expect(eric).toContainText('Ya no podrás abrir Growth.')
    await expect(eric.getByRole('button', { name: 'Salir de Growth ahora' })).toBeFocused()
  })

  test('remove: the confirmation is by the row with the keyboard on it', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings')
    const ana = member(page, 'Ana')
    await ana.getByRole('button', { name: 'Eliminar a Ana' }).click()
    const yes = ana.getByRole('button', { name: 'Eliminar a Ana de Growth' })
    await expect(yes).toBeFocused()
    await yes.click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana ya no está en Growth.' })).toBeFocused()
    await expect(member(page, 'Ana')).toHaveCount(0)
  })

  test('add: an unknown email is said; someone already in the brain is not changed, and the keyboard goes to their role', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings')
    const members = region(page, 'Miembros')
    await members.getByLabel('Email o id de cuenta').fill('nobody@example.test')
    await members.getByRole('button', { name: 'Añadir miembro' }).click()
    await expect(members.getByRole('alert')).toContainText('There is no account with that id or email')
    await expect(members.getByLabel('Email o id de cuenta')).toHaveValue('nobody@example.test')
    await members.getByLabel('Email o id de cuenta').fill('ana@example.test')
    await members.getByLabel('Rol del nuevo miembro').selectOption('curator')
    await expect(members).toContainText('Las cuentas de servicio entran como colaborador o lector')
    await members.getByRole('button', { name: 'Añadir miembro' }).click()
    await expect(members).toContainText('Ana ya es colaborador — cambia su rol en la lista.')
    await expect(member(page, 'Ana').getByLabel('Rol de Ana')).toBeFocused()
    await expect(member(page, 'Ana').getByLabel('Rol de Ana')).toHaveValue('contributor')
    // Removed, then added again by the form.
    await member(page, 'Ana').getByRole('button', { name: 'Eliminar a Ana' }).click()
    await member(page, 'Ana').getByRole('button', { name: 'Eliminar a Ana de Growth' }).click()
    await members.getByLabel('Email o id de cuenta').fill('ana@example.test')
    await members.getByLabel('Rol del nuevo miembro').selectOption('contributor')
    await members.getByRole('button', { name: 'Añadir miembro' }).click()
    await expect(member(page, 'Ana').getByLabel('Rol de Ana')).toHaveValue('contributor')
    await expect(members.getByLabel('Email o id de cuenta')).toHaveValue('')
  })

  test('a repository: what it matches before linking, linked, then unlinked', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    const repos = region(page, 'Repositories')
    await expect(repos.getByRole('listitem').filter({ hasText: 'github.com/acme/growth-site' })).toBeVisible()
    const field = repos.getByLabel('Dirección del repositorio')
    await field.fill('~/code/app')
    await expect(repos).toContainText('Esa es una carpeta de tu máquina')
    await field.fill('acme/app')
    await expect(repos).toContainText('use the full address, e.g. github.com/org/repo')
    await field.fill('git@github.com:Acme/App.git')
    await expect(repos).toContainText('Matches github.com/acme/app')
    await repos.getByRole('button', { name: 'Vincular repositorio' }).click()
    await expect(repos.getByRole('listitem').filter({ hasText: 'github.com/acme/app' })).toBeVisible()
    await expect(field).toHaveValue('')
    const row = repos.getByRole('listitem').filter({ hasText: 'github.com/acme/app' })
    await row.getByRole('button', { name: 'Unlink github.com/acme/app' }).click()
    await expect(row.getByRole('button', { name: 'Desvincularlo' })).toBeFocused()
    await row.getByRole('button', { name: 'Desvincularlo' }).click()
    await expect(repos.getByRole('listitem').filter({ hasText: 'github.com/acme/app' })).toHaveCount(0)
  })

  test('the compile guide is folded until opened; the default shown, a custom one saved, then reset to default', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    const guide = region(page, 'Guía de compilación')
    await expect(guide).toContainText('Default')
    await expect(guide.getByLabel('Guía de compilación')).toHaveCount(0)
    await guide.getByRole('button', { name: 'Editar la guía' }).click()
    const text = guide.getByLabel('Guía de compilación')
    await expect(text).toBeFocused()
    await expect(text).toHaveValue(/How to compile this brain's journal/)
    await text.fill('')
    await expect(guide).toContainText('Una guía vacía es la guía por defecto.')
    await text.fill('Keep pages short. Cite every entry.')
    await guide.getByRole('button', { name: 'Guardar la guía' }).click()
    await expect(guide.getByRole('status')).toContainText('Guardado.')
    await expect(guide).toContainText('Custom')
    await guide.getByRole('button', { name: 'Volver a la de por defecto' }).click()
    await expect(text).toHaveValue(/How to compile this brain's journal/)
    await guide.getByRole('button', { name: 'Guardar la guía' }).click()
    await expect(guide.getByRole('status')).toContainText('Guardado.')
    await expect(guide).toContainText('Default')
  })

  test('two curators, same field: the save is refused, their text shown, mine kept to save again', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    const note = region(page, 'Nota de uso')
    const text = note.getByLabel('Nota de uso')
    await text.fill('Always name the ticket.')
    await s.settingsEdit('growth', { usageNote: 'Write in English.' })
    await note.getByRole('button', { name: 'Guardar la nota' }).click()
    await expect(note.getByRole('alert')).toContainText('Alguien cambió esto')
    await expect(note).toContainText('Write in English.')
    await expect(text).toHaveValue('Always name the ticket.')
    await note.getByRole('button', { name: 'Guardar la nota' }).click()
    await expect(note.getByRole('status')).toContainText('Guardado.')
  })

  test('a reset to the default while another curator saved a guide: it is said, not hidden as «nothing to save»', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    const guide = region(page, 'Guía de compilación')
    await guide.getByRole('button', { name: 'Editar la guía' }).click()
    await expect(guide.getByLabel('Guía de compilación')).toHaveValue(/How to compile this brain's journal/)
    // Cora saves a guide of her own; Carla, who still sees the default, «resets» it.
    await s.settingsEdit('growth', { guide: 'Cora wrote this guide.' })
    await guide.getByRole('button', { name: 'Volver a la de por defecto' }).click()
    await guide.getByRole('button', { name: 'Guardar la guía' }).click()
    await expect(guide.getByRole('alert')).toContainText('Alguien cambió esto')
    await expect(guide).toContainText('Cora wrote this guide.')
    await expect(guide.getByLabel('Guía de compilación')).toHaveValue(/How to compile this brain's journal/)
  })

  test('saving with nothing changed asks the server and says so', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    const note = region(page, 'Nota de uso')
    await expect(note.getByLabel('Nota de uso')).toHaveValue('')
    const asked = page.waitForRequest((r) => r.method() === 'PUT' && r.url().endsWith('/wiki/settings'))
    await note.getByRole('button', { name: 'Guardar la nota' }).click()
    expect((await asked).postDataJSON()).toEqual({ base: { usageNote: '' } })
    await expect(note.getByRole('status')).toContainText('Nada cambió')
  })

  test('arriving on a tab while the settings are read again: no empty box to type in, then the values', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    await expect(region(page, 'Nota de uso').getByLabel('Nota de uso')).toBeVisible()
    await s.settingsEdit('growth', { usageNote: 'Write in English.' })
    await tab(page, 'Umbrales de salud').click()
    await expect(region(page, 'Umbrales de salud').getByLabel('Desactualizada tras (días)')).toBeVisible()
    await s.state('settings', 'loading')
    await tab(page, 'Agentes').click()
    await expect(
      region(page, 'Nota de uso')
        .getByRole('status')
        .or(region(page, 'Nota de uso').locator('[aria-busy="true"]'))
        .first(),
    ).toBeVisible()
    await expect(region(page, 'Nota de uso').getByLabel('Nota de uso')).toHaveCount(0)
    await expect(region(page, 'Nota de uso').getByLabel('Nota de uso')).toHaveValue('Write in English.', {
      timeout: 8000,
    })
    await s.state('settings', 'normal')
  })

  test('unsaved thresholds and the meaning box stay while moving between tabs', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/health')
    await region(page, 'Umbrales de salud').getByLabel('Desactualizada tras (días)').fill('33')
    await tab(page, 'Agentes').click()
    await region(page, 'Búsqueda por significado')
      .getByLabel('Dejar este brain fuera de la búsqueda por significado')
      .check()
    await tab(page, 'Umbrales de salud').click()
    await expect(region(page, 'Umbrales de salud').getByLabel('Desactualizada tras (días)')).toHaveValue('33')
    await tab(page, 'Agentes').click()
    await expect(
      region(page, 'Búsqueda por significado').getByLabel(
        'Dejar este brain fuera de la búsqueda por significado',
      ),
    ).toBeChecked()
  })

  test('the keyboard lands on the tab’s first heading: arriving by a link, and changing tab', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/health')
    await expect(page.getByRole('heading', { level: 2, name: 'Umbrales de salud' })).toBeFocused()
    await tab(page, 'Agentes').click()
    await expect(page.getByRole('heading', { level: 2, name: 'Repositories' })).toBeFocused()
  })

  test('another curator’s note is never erased by a save of another part (the reviewer’s first case)', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    await expect(region(page, 'Nota de uso').getByLabel('Nota de uso')).toHaveValue('')
    // Meanwhile another curator writes the note.
    await s.settingsEdit('growth', { usageNote: 'Write in English.' })
    // I save the meaning search, then the thresholds: neither touches the note.
    await region(page, 'Búsqueda por significado')
      .getByLabel('Dejar este brain fuera de la búsqueda por significado')
      .check()
    await region(page, 'Búsqueda por significado').getByRole('button', { name: 'Guardar' }).click()
    await expect(region(page, 'Búsqueda por significado').getByRole('status')).toContainText('Guardado.')
    await tab(page, 'Umbrales de salud').click()
    await region(page, 'Umbrales de salud').getByLabel('Desactualizada tras (días)').fill('30')
    await region(page, 'Umbrales de salud').getByRole('button', { name: 'Guardar' }).click()
    await expect(region(page, 'Umbrales de salud').getByRole('status')).toContainText('Guardado.')
    await page.reload()
    await tab(page, 'Agentes').click()
    await expect(region(page, 'Nota de uso').getByLabel('Nota de uso')).toHaveValue('Write in English.')
  })

  test('another curator’s thresholds are never erased, and the same one is shown with mine kept (the reviewer’s second case)', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/health')
    const health = region(page, 'Umbrales de salud')
    await expect(health.getByLabel('Desactualizada tras (días)')).toHaveValue('90')
    // Meanwhile another curator changes how long a page may be, and when it is stale.
    await s.settingsEdit('growth', { longChars: 30000 })
    // I change only when a page is stale. What this part shows changed under me: said, theirs taken into the
    // field I did not touch, mine kept; saving again keeps both.
    await health.getByLabel('Desactualizada tras (días)').fill('25')
    await health.getByRole('button', { name: 'Guardar' }).click()
    await expect(health.getByRole('alert')).toContainText('Alguien cambió esto')
    await expect(health.getByLabel('Long after (characters)')).toHaveValue('30000')
    await expect(health.getByLabel('Desactualizada tras (días)')).toHaveValue('25')
    await health.getByRole('button', { name: 'Guardar' }).click()
    await expect(health.getByRole('status')).toContainText('Guardado.')
    await s.settingsEdit('growth', { staleDays: 60 })
    // Now the same field: refused, their values shown, mine kept.
    await health.getByLabel('Desactualizada tras (días)').fill('45')
    await health.getByRole('button', { name: 'Guardar' }).click()
    await expect(health.getByRole('alert')).toContainText('Alguien cambió esto')
    await expect(health).toContainText('Desactualizada tras (días): 60')
    await expect(health.getByLabel('Desactualizada tras (días)')).toHaveValue('45')
    await health.getByRole('button', { name: 'Guardar' }).click()
    await expect(health.getByRole('status')).toContainText('Guardado.')
    await page.reload()
    await expect(health.getByLabel('Long after (characters)')).toHaveValue('30000')
    await expect(health.getByLabel('Desactualizada tras (días)')).toHaveValue('45')
  })

  test('a draft lives in memory only and goes once saved: what another curator saves later shows', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    const text = region(page, 'Nota de uso').getByLabel('Nota de uso')
    await text.fill('A secret pasted by mistake rscb_not_a_real_one')
    expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }))).not.toContain(
      'rscb_not',
    )
    // Kept while moving inside the web.
    await tab(page, 'Umbrales de salud').click()
    await tab(page, 'Agentes').click()
    await expect(text).toHaveValue('A secret pasted by mistake rscb_not_a_real_one')
    await text.fill('Name the ticket.')
    await region(page, 'Nota de uso').getByRole('button', { name: 'Guardar la nota' }).click()
    await expect(region(page, 'Nota de uso').getByRole('status')).toContainText('Guardado.')
    await s.settingsEdit('growth', { usageNote: 'Write in English.' })
    // Back to the tab: the settings are read again, and no old draft hides what is there now.
    await tab(page, 'Umbrales de salud').click()
    await tab(page, 'Agentes').click()
    await expect(region(page, 'Nota de uso').getByLabel('Nota de uso')).toHaveValue('Write in English.')
  })

  test('meaning search and the health thresholds are saved; a number out of range is said by its field', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/agents')
    const meaning = region(page, 'Búsqueda por significado')
    await meaning.getByLabel('Dejar este brain fuera de la búsqueda por significado').check()
    await meaning.getByRole('button', { name: 'Guardar' }).click()
    await expect(meaning.getByRole('status')).toContainText('Guardado.')
    await tab(page, 'Umbrales de salud').click()
    const health = region(page, 'Umbrales de salud')
    const stale = health.getByLabel('Desactualizada tras (días)')
    await stale.fill('0')
    await health.getByRole('button', { name: 'Guardar' }).click()
    await expect(health).toContainText('Un número entero de 1 a 3650.')
    await expect(stale).toBeFocused()
    await stale.fill('30')
    await health.getByRole('button', { name: 'Guardar' }).click()
    await expect(health.getByRole('status')).toContainText('Guardado.')
  })

  test('archive says what stops and what still works, and asks first; archived, settings and links are read-only', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/archive')
    await region(page, 'Archivar').getByRole('button', { name: 'Archivar este brain' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Archivar Growth?' })
    await expect(dialog).toContainText('Lo que se detiene')
    await expect(dialog).toContainText('no repository can be linked')
    await expect(dialog).toContainText('Lo que sigue funcionando: leer, buscar')
    await expect(dialog).toContainText('who is a member')
    await dialog.getByRole('button', { name: 'Archivar Growth' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Growth is archived.' })).toBeFocused()
    await tab(page, 'Agentes').click()
    await expect(
      region(page, 'Repositories').getByRole('button', { name: 'Vincular repositorio' }),
    ).toHaveAttribute('aria-disabled', 'true')
    await region(page, 'Guía de compilación').getByRole('button', { name: 'Editar la guía' }).click()
    await expect(
      region(page, 'Guía de compilación').getByRole('button', { name: 'Guardar la guía' }),
    ).toHaveAttribute('aria-disabled', 'true')
    await expect(region(page, 'Guía de compilación')).toContainText('archived')
    // Members still change on an archived brain.
    await tab(page, 'Miembros').click()
    await member(page, 'Ana').getByLabel('Rol de Ana').selectOption('reader')
    await member(page, 'Ana').getByRole('button', { name: 'Guardar el rol de Ana' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Ana ahora es lector.' })).toBeVisible()
    await tab(page, 'Archivar').click()
    await region(page, 'Archivar').getByRole('button', { name: 'Desarchivar este brain' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Growth is active again.' })).toBeVisible()
  })

  test('the administration deletes a brain by typing its name', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/settings/archive')
    await region(page, 'Eliminar este brain').getByRole('button', { name: 'Eliminar este brain' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Eliminar Growth?' })
    const confirm = dialog.getByRole('button', { name: 'Eliminar Growth para siempre' })
    await confirm.click()
    await expect(dialog.getByLabel('Escribe growth para confirmar')).toBeFocused()
    await dialog.getByLabel('Escribe growth para confirmar').fill('growth')
    await confirm.click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('status').filter({ hasText: 'Growth was deleted.' })).toBeVisible()
  })

  test('someone who is not a curator is told who to ask, and is not offered the page', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto('/b/growth')
    await expect(
      page
        .getByRole('navigation', { name: 'Secciones de este brain' })
        .getByRole('link', { name: 'Ajustes' }),
    ).toHaveCount(0)
    for (const path of ['/b/growth/settings', '/b/growth/settings/health']) {
      await page.goto(path)
      const state = page.locator('[data-state="forbidden"]')
      await expect(state).toContainText('Solo los curadores de Growth cambian sus ajustes')
      await expect(state).toContainText('Pide el rol de curador a un curador de Growth')
    }
  })

  test('loading and error states keep their shape; an error offers to try again', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in', { settings: 'error' })
    await page.goto('/b/growth/settings/agents')
    await expect(region(page, 'Nota de uso').getByRole('button', { name: 'Probar otra vez' })).toBeVisible()
    await s.state('settings', 'normal')
    await region(page, 'Nota de uso').getByRole('button', { name: 'Probar otra vez' }).click()
    await expect(region(page, 'Nota de uso').getByLabel('Nota de uso')).toBeVisible()
  })

  for (const width of [320, 375] as const) {
    test(`at ${width} px nothing scrolls sideways, and each tab fits in about two screens`, async ({
      page,
      context,
      baseURL,
    }) => {
      await scenario(context, baseURL as string, 'signed-in')
      await page.setViewportSize({ width, height: 800 })
      for (const path of ['', '/agents', '/health', '/archive']) {
        await page.goto(`/b/growth/settings${path}`)
        await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
        if (path === '/agents')
          await region(page, 'Repositories')
            .getByLabel('Dirección del repositorio')
            .fill('ssh://git@gitlab.example.com:2222/a-very-long-group/a-very-long-project-name.git')
        await noSideScroll(page)
        const tall = await page.evaluate(() => document.documentElement.scrollHeight)
        expect(tall, `${path || '/'} is ${tall}px tall`).toBeLessThan(800 * 3)
      }
    })
  }
})
