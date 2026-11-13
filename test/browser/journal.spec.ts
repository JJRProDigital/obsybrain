// The journal in a real browser, against the fixture API (spec B6 «Journal», CA14–CA16; T022–T024): the
// sessions with their filters and every state; a session and its entries; an entry with what it can do by
// role (a reader nothing, a contributor their own, a curator everything); correcting with a conflict that
// keeps the text; forgetting with a reason; relating by picking an entry by its words; adding a correction
// from a wiki page; deciding a conflict; forgotten and to review; search and a page's sources open entries.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, noSideScroll, scenario, test } from './fixture.ts'

const J = '/b/growth/journal'

async function audit(page: Page, where: string) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze()
  const bad = r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${where}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(bad).toEqual([])
}

test.describe('Sesiones', () => {
  test('the side bar leads to it: newest first, with client, author, status, entries and summary', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth')
    await page
      .getByRole('navigation', { name: 'Secciones de este brain' })
      .getByRole('link', { name: 'Diario' })
      .click()
    await expect(page).toHaveURL(new RegExp(`${J}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Sesiones' })).toBeFocused()
    await expect(page).toHaveTitle(/^Sessions · /)
    const list = page.getByRole('list', { name: 'Sesiones' })
    const items = list.getByRole('listitem')
    await expect(items.first()).toContainText('Ediciones web · Eric')
    await expect(items.first()).toContainText('Eric, in the web')
    const intros = items.filter({ hasText: 'Review the intros of October' })
    await expect(intros).toContainText('Claude Code of Eric')
    await expect(intros).toContainText('Cerrada')
    await expect(intros).toContainText('2 entries')
    await expect(intros).toContainText('Short intros keep viewers past 30 seconds')
    await expect(items.filter({ hasText: 'Narrate the intro' })).toContainText('Cerrada sin resumen')
    await expect(items.filter({ hasText: 'Narrate the intro' })).toContainText('run r_77, step 3')
    await expect(
      page.getByRole('navigation', { name: 'Secciones de este brain' }).getByRole('link', { name: 'Diario' }),
    ).toHaveAttribute('aria-current', 'page')
    await audit(page, 'sessions')
  })

  test('filters picked from what the brain holds, applied together and kept in the address', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(J)
    await page.getByText('Filtrar las sesiones').click()
    await page.getByLabel('Cliente').selectOption('Codex')
    await page.getByLabel('Autor').selectOption({ label: 'Ana' })
    // Nothing applies until the button says so.
    await expect(page.getByRole('list', { name: 'Sesiones' }).getByRole('listitem')).toHaveCount(5)
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(page).toHaveURL(/client=Codex/)
    await expect(page).toHaveURL(/author=acc_ana/)
    const items = page.getByRole('list', { name: 'Sesiones' }).getByRole('listitem')
    await expect(items).toHaveCount(1)
    await expect(items).toContainText('Fix the onboarding emails')
    await page.reload()
    await expect(items).toHaveCount(1)
    await expect(page.getByLabel('Cliente')).toHaveValue('Codex')
    // A reference: part of it; Enter in its field applies.
    await page.getByRole('button', { name: 'Quitar los filtros' }).click()
    await page.getByText('Filtrar las sesiones').click()
    await page.getByLabel('Referencia externa').fill('r_77')
    await page.getByLabel('Referencia externa').press('Enter')
    await expect(items).toHaveCount(1)
    await expect(items).toContainText('Narrate the intro')
    await page.getByLabel('Tiene una entrada de tipo').selectOption('decision')
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(page.getByRole('heading', { name: 'No hay resultados para estos filtros' })).toBeVisible()
    await page.getByRole('button', { name: 'Quitar los filtros' }).first().click()
    await expect(items).toHaveCount(5)
  })

  test('empty says how entries arrive; loading has its shape; an error recovers', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in', { sessions: 'empty' })
    await page.goto(J)
    await expect(
      page.getByRole('heading', { name: 'Todavía no se escribió nada en este diario' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir al resumen' })).toBeVisible()
    await s.state('sessions', 'error')
    await page.reload()
    await expect(page.getByRole('alert')).toContainText('Esto no cargó')
    await s.state('sessions', 'normal')
    await page.getByRole('button', { name: 'Probar otra vez' }).click()
    await expect(page.getByRole('list', { name: 'Sesiones' })).toBeVisible()
    await s.state('sessions', 'loading')
    await page.goto(`${J}?status=open`)
    await expect(page.locator('[data-state="loading"]')).toBeVisible()
  })

  test('a lot of sessions come by pages; nothing scrolls sideways at 320 px; offline keeps what it has', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { sessions: 'much-data' })
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto(J)
    const items = page.getByRole('list', { name: 'Sesiones' }).getByRole('listitem')
    await expect(items).toHaveCount(50)
    await expect(page.getByText('505 sessions')).toBeVisible()
    await noSideScroll(page)
    await page.getByRole('button', { name: 'Mostrar más' }).click()
    await expect(items).toHaveCount(100)
    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await expect(page.getByText('Offline: more loads when the connection is back.')).toBeVisible()
    await expect(items).toHaveCount(100)
    await context.setOffline(false)
  })

  test('a brain the person is not in says so', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/nowhere/journal')
    await expect(page.locator('[data-state="forbidden"]')).toContainText(/curador/i)
  })
})

test.describe('A session', () => {
  test('its facts, its summary in plain text and its entries in order, each opening', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(J)
    await page.getByRole('link', { name: 'Review the intros of October' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Review the intros of October' })).toBeFocused()
    await expect(page.locator('.facts')).toContainText('Claude Code of Eric')
    await expect(page.getByRole('link', { name: 'Leer el resumen completo' })).toBeVisible()
    const entries = page.locator('#session-entries ~ ol > li')
    // In the order written, the summary last.
    await expect(entries).toHaveCount(3)
    await expect(entries.first()).toContainText('Short intros keep viewers')
    await page.getByRole('link', { name: 'The hook goes first' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'The hook goes first' })).toBeVisible()
    await audit(page, 'entry')
  })
})

test.describe('Una entrada', () => {
  test('a reader sees what it says and who wrote it, no action, and whom to ask', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto('/b/support/journal/entries/ent_fx_take_support')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Narrated the intro of video 41' }),
    ).toBeVisible()
    await expect(page.locator('.page-meta')).toContainText('RSC Factory (run r_77, step 3) on behalf of Eric')
    await expect(page.locator('[data-state="no-actions"]')).toContainText(
      'pide el rol de colaborador a un curador de Support (Eric)',
    )
    await expect(page.getByRole('button', { name: /Correct|Forget|Pin|Relate/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Añadir una corrección/ })).toHaveCount(0)
  })

  test('a contributor corrects their own entry: a new revision, said aloud, in its history', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto(`${J}/entries/ent_fx_30s`)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Thirty-second intros work best' }),
    ).toBeVisible()
    // Not hers: she relates it, but neither corrects nor forgets it.
    await page.goto(`${J}/entries/ent_fx_intros`)
    await expect(page.getByRole('button', { name: 'Relacionar con otra entrada…' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Editar esta entrada' })).toHaveCount(0)
    await page.goto(`${J}/entries/ent_fx_30s`)
    await page.getByRole('button', { name: 'Editar esta entrada' }).click()
    await page
      .getByLabel('Texto')
      .fill('In the support videos, intros of about twenty seconds kept the most viewers.')
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardada como la revisión 2.' })).toBeVisible()
    await expect(page.locator('.prose')).toContainText('twenty seconds')
    await expect(page.locator('#entry-history ~ ol li')).toHaveCount(2)
    await expect(page.getByRole('button', { name: 'Fijar' })).toHaveCount(0)
  })

  test('someone corrected it meanwhile: nothing saved, their version shown, mine kept and can still win', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/entries/ent_fx_hooks`)
    await page.getByRole('button', { name: 'Editar esta entrada' }).click()
    await page.getByLabel('Texto').fill('Mine: start with the question, always.')
    await fetch(`${baseURL}/__fixture/scenarios/${s.id}/entry-edit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brain: 'growth', id: 'ent_fx_hooks', content: 'El suyo: el hook va primero.' }),
    })
    // A reload loses nothing: the draft brings the form back.
    await page.reload()
    await expect(page.getByLabel('Texto')).toHaveValue('Mine: start with the question, always.')
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(page.getByRole('alert')).toContainText('Alguien cambió esta entrada mientras la corregías')
    await expect(page.getByRole('alert')).toContainText('El suyo: el hook va primero.')
    await expect(page.getByLabel('Tu texto')).toHaveValue('Mine: start with the question, always.')
    await page.getByRole('button', { name: 'Guardar el mío sobre el suyo' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardada como la revisión 3.' })).toBeVisible()
    await expect(page.locator('.prose')).toContainText('Mine: start with the question')
  })

  test('forgetting asks why and says what happens; a curator recovers it', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/entries/ent_fx_plain`)
    await page.getByRole('button', { name: 'Olvidar…' }).click()
    const d = page.getByRole('dialog', { name: '¿Olvidar esta entrada?' })
    await expect(d).toContainText('Sale de la búsqueda, del contexto de los agentes')
    // The reason is what the dialog asks: the keyboard starts there.
    await expect(d.getByLabel('Por qué (obligatorio)')).toBeFocused()
    await d.getByRole('button', { name: 'Olvidar la entrada' }).click()
    await expect(d.getByText('Di por qué se olvida.')).toBeVisible()
    await expect(d.getByLabel('Por qué (obligatorio)')).toBeFocused()
    await d.getByLabel('Por qué (obligatorio)').fill('Plain text was a dead end.')
    await d.getByRole('button', { name: 'Olvidar la entrada' }).click()
    await expect(d).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'Olvidada.' })).toBeVisible()
    await expect(page.locator('.page-main')).toContainText('Olvidada por Eric el')
    // «Forget…» is gone: the keyboard goes to what happened (review of PR20), not to the page's body.
    await expect(page.getByRole('status').filter({ hasText: 'Olvidada.' })).toBeFocused()
    await page.getByRole('button', { name: 'Recuperar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Recuperada' })).toBeVisible()
  })

  test('relating: the other entry is picked by its words, Enter picks and never sends', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/entries/ent_fx_hooks`)
    await page.getByRole('button', { name: 'Relacionar con otra entrada…' }).click()
    const d = page.getByRole('dialog', { name: 'Relacionar con otra entrada' })
    await d.getByLabel('is replaced by the other one', { exact: false }).check()
    await d.getByRole('button', { name: 'Guardar la relación' }).click()
    await expect(d.getByText('Elige la otra entrada de la lista.')).toBeVisible()
    await expect(d.getByLabel('La otra entrada')).toBeFocused()
    await d.getByLabel('La otra entrada').fill('thirty')
    await expect(d.getByRole('option', { name: /Thirty-second intros/ })).toBeVisible()
    await d.getByLabel('La otra entrada').press('Enter')
    await expect(d.getByText('Picked: Thirty-second intros work best')).toBeVisible()
    await expect(d).toBeVisible()
    await d.getByRole('button', { name: 'Guardar la relación' }).click()
    await expect(d).toBeHidden()
    await expect(page.getByRole('status').filter({ hasText: 'Relación guardada.' })).toBeVisible()
    await expect(page.locator('#entry-relations ~ ul')).toContainText(
      'Reemplazada por Thirty-second intros work best',
    )
    await expect(page.locator('.page-main')).toContainText('Reemplazada')
  })

  test('a curator pins and dates it; the markdown is safe; an entry that does not exist says so', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/entries/ent_fx_plain`)
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()
    await page.getByRole('button', { name: 'Fijar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Fijada' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Quitar fijado' })).toHaveAttribute('aria-pressed', 'true')
    // Its dates are shown open: it has one already.
    await expect(page.getByLabel('Revisar después de')).toHaveValue('2026-10-20')
    await page.getByLabel('Revisar después de').fill('2026-12-01')
    await page.getByRole('button', { name: 'Guardar las fechas' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Fechas guardadas.' })).toBeVisible()
    await page.goto(`${J}/entries/ent_nope`)
    await expect(
      page.getByRole('heading', { name: 'No tienes disponible ninguna entrada con ese id' }),
    ).toBeVisible()
  })

  test('at 320 px the entry, its actions and its aside fit', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto(`${J}/entries/ent_fx_take`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await noSideScroll(page)
    await page.getByRole('button', { name: 'Editar esta entrada' }).click()
    await noSideScroll(page)
    // Without a date, the dates are folded; opened, they fit too.
    await page.getByText('Fechas de revisión y vencimiento').click()
    await expect(page.getByLabel('Revisar después de')).toBeVisible()
    await noSideScroll(page)
    for (const path of ['', '/conflicts', '/to-review', '/forgotten', '/correct', '/sessions/ses_fx_3']) {
      await page.goto(`${J}${path}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await noSideScroll(page)
    }
  })
})

test.describe('Añadir una corrección', () => {
  test('CA12 in the web: from a wiki page, about that page, for one agent; it opens as the new entry', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/pages/audience/intros')
    await page.getByRole('link', { name: 'Añadir una corrección' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Añadir una corrección' })).toBeVisible()
    await expect(page.getByLabel('Una página del wiki')).toBeChecked()
    await expect(page.getByText('Picked: Writing intros')).toBeVisible()
    // A way back to where the person came from.
    await expect(page.getByRole('link', { name: 'Cancelar' })).toHaveAttribute(
      'href',
      '/b/growth/pages/audience/intros',
    )
    await page.getByRole('button', { name: 'Añadir corrección' }).click()
    await expect(page.getByText('Dale un título de una línea.')).toBeVisible()
    await expect(page.getByLabel('Título')).toBeFocused()
    await page.getByLabel('Título').fill('The long intro loses viewers')
    await page.getByLabel('La corrección').fill('Open with the question of the video; no greeting.')
    await page.getByLabel('Solo para un agente (opcional)').fill('narrator')
    await page.getByRole('button', { name: 'Añadir corrección' }).click()
    await expect(page).toHaveURL(/\/journal\/entries\/ent_fx_new/)
    await expect(page.getByRole('status').filter({ hasText: 'Corrección añadida.' })).toBeVisible()
    await expect(page.locator('.page-main')).toContainText('the page audience/intros')
    await expect(page.locator('.facts')).toContainText('narrator')
  })

  test('about an entry picked by its words; what is typed survives a reload', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/correct`)
    await page.getByLabel('Una entrada del diario').check()
    await page.getByLabel('Título').fill('Conservarlo')
    await page.getByLabel('La corrección').fill('Keep the HTML emails.')
    await page.reload()
    await expect(page.getByLabel('La corrección')).toHaveValue('Keep the HTML emails.')
    await page.getByLabel('La otra entrada').fill('plain')
    await expect(page.getByRole('option', { name: /Plain-text onboarding emails/ })).toBeVisible()
    await page.getByLabel('La otra entrada').press('ArrowDown')
    await page.getByLabel('La otra entrada').press('Enter')
    await expect(page.getByText('Picked: Plain-text onboarding emails')).toBeVisible()
    await page.getByRole('button', { name: 'Añadir corrección' }).click()
    await expect(page.locator('.page-main')).toContainText('the entry')
    await audit(page, 'new correction')
  })

  test('a reader cannot, and is told whom to ask', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'member')
    await page.goto('/b/support/journal/correct')
    await expect(page.locator('[data-state="forbidden"]')).toContainText('Support (Eric)')
    await expect(page.getByRole('button', { name: 'Añadir corrección' })).toHaveCount(0)
  })
})

test.describe('Conflicts, forgotten, to review', () => {
  test('CA11 in the web: a conflict side by side; «A replaces B» confirmed, it leaves the list', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/conflicts`)
    await expect(page.getByText('2 conflicts')).toBeVisible()
    const tab = page
      .getByRole('navigation', { name: 'Secciones del diario' })
      .getByRole('link', { name: /Conflicts/ })
    await expect(tab).toHaveText('Conflictos 2')
    const first = page.locator('.conflict-item').filter({ hasText: 'Estas dos se contradicen' })
    await expect(first).toContainText('Thirty-second intros work best')
    await expect(first).toContainText('Short intros keep viewers')
    await expect(page.locator('.conflict-item').filter({ hasText: 'Un agente preguntó' })).toContainText(
      '“Greetings help the narrator” replaces “No greeting before the hook”',
    )
    await first.getByRole('button', { name: 'Conservar esta: Short intros keep viewers' }).click()
    const d = page.getByRole('dialog', { name: '¿Decidir este conflicto?' })
    await expect(d).toContainText('leaves the agents’ context')
    await d.getByRole('button', { name: 'Decidir' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Decidido.' })).toBeVisible()
    await expect(page.getByText('1 conflict', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await audit(page, 'conflicts')
  })

  test('a reader reads conflicts without buttons; empty says what shows here', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'member')
    await page.goto('/b/support/journal/conflicts')
    await expect(page.locator('[data-state="read-only"]')).toContainText('Support (Eric)')
    await expect(page.locator('.conflict-item').first()).toBeVisible()
    await expect(page.locator('.conflict-item').getByRole('button')).toHaveCount(0)
    await s.state('conflicts', 'empty')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Sin conflictos' })).toBeVisible()
  })

  test('forgotten: for curators, with who and why, and recover; others are told whom to ask', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/forgotten`)
    const item = page.getByRole('listitem').filter({ hasText: 'Old pricing note' })
    await expect(item).toContainText('Olvidada por Eric el')
    await expect(item).toContainText('Replaced by the annual plans decision.')
    await item.getByRole('button', { name: 'Recuperar: Old pricing note' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Recuperada' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nada olvidado' })).toBeVisible()
    await context.clearCookies()
    await scenario(context, baseURL as string, 'member')
    await page.goto('/b/support/journal/forgotten')
    await expect(page.locator('[data-state="forbidden"]')).toContainText(
      'Las entradas olvidadas solo las ven los curadores',
    )
    await expect(
      page.getByRole('navigation', { name: 'Secciones del diario' }).getByRole('link', { name: 'Olvidadas' }),
    ).toHaveCount(0)
  })

  test('to review: past their date; «Mark reviewed» clears it', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${J}/to-review`)
    const item = page.getByRole('listitem').filter({ hasText: 'Plain-text onboarding emails' })
    await expect(item).toContainText('review was due 20 Oct 2026')
    await item.getByRole('button', { name: 'Marcar como revisada: Plain-text onboarding emails' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Marcada como revisada' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Nada para revisar' })).toBeVisible()
  })

  test('long lists go by pages; errors recover', async ({ page, context, baseURL }) => {
    const s = await scenario(context, baseURL as string, 'signed-in', {
      conflicts: 'much-data',
      forgotten: 'much-data',
    })
    await page.goto(`${J}/conflicts`)
    await expect(page.locator('.conflict-item')).toHaveCount(10)
    await page.getByRole('button', { name: 'Mostrar más' }).click()
    await expect(page.locator('.conflict-item')).toHaveCount(20)
    await page.goto(`${J}/forgotten`)
    await expect(page.locator('main ul.list > li')).toHaveCount(50)
    await s.state('to-review', 'error')
    await page.goto(`${J}/to-review`)
    await expect(page.getByRole('alert')).toContainText('Esto no cargó')
  })
})

test.describe('Entries open from elsewhere', () => {
  test('a search result that is an entry opens it', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth')
    await page
      .locator('header')
      .getByRole('button', { name: /Search/ })
      .click()
    await page.getByLabel('Buscar').fill('thirty')
    await page.keyboard.press('Enter')
    const hit = page
      .getByRole('dialog', { name: 'Buscar' })
      .getByRole('link', { name: 'Thirty-second intros work best' })
    await expect(hit).toBeVisible()
    await hit.click()
    await expect(page).toHaveURL(new RegExp(`${J}/entries/ent_fx_30s$`))
    await expect(
      page.getByRole('heading', { level: 1, name: 'Thirty-second intros work best' }),
    ).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Buscar' })).toBeHidden()
  })

  test('a page’s source panel opens the entry in the journal', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/pages/audience/retention')
    await page.getByRole('button', { name: 'The hook goes first' }).click()
    const panel = page.getByRole('dialog', { name: 'The hook goes first' })
    await panel.getByRole('link', { name: 'Abrir en el diario' }).click()
    await expect(page).toHaveURL(new RegExp(`${J}/entries/ent_fx_hooks$`))
    await expect(page.getByRole('heading', { level: 1, name: 'The hook goes first' })).toBeVisible()
  })
})
