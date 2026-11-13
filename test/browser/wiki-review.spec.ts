// Review of PR19 (spec B6 «Wiki», CA10, CA20): what a person met using the wiki. One «Save changes» for
// every part of a page; Enter in a source field adds the source; a source found by its words; every page
// on the map whatever its status; saving over someone else's revision shows the result first and keeps
// both when it can; who read a page, grouped, and one visit is one read; history by part and by line;
// drafts that never outlive the session. Against the fixture API.
import type { BrowserContext, Page } from '@playwright/test'
import { expect, noSideScroll, scenario, test } from './fixture.ts'

const RETENTION = '/b/growth/pages/audience/retention'
const EDIT = `${RETENTION}?view=edit`
const body = (page: Page) => page.getByLabel('Cuerpo', { exact: true })
const said = (page: Page, text: string | RegExp) => page.getByRole('status').filter({ hasText: text })

async function behind(baseURL: string, id: string, change: Record<string, unknown>) {
  await fetch(`${baseURL}/__fixture/scenarios/${id}/wiki-edit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ brain: 'growth', address: 'audience/retention', ...change }),
  })
}
const drafts = (page: Page) =>
  page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('rscb.draft.')))

test.describe('drafts of an edit', () => {
  test('signing out forgets them: signing in again shows the page as it is', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Título', { exact: true }).fill('Retention, private draft')
    expect(await drafts(page)).toHaveLength(1)
    await page.getByRole('button', { name: /Cuenta/ }).click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/sign-in$/)
    expect(await drafts(page)).toEqual([])
  })

  test('a session that ends forgets them too', async ({ page, context, baseURL }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Título', { exact: true }).fill('Retention, private draft')
    await s.endSessions()
    await page.getByRole('link', { name: 'Volver a la página' }).click()
    await expect(page).toHaveURL(/\/sign-in/)
    expect(await drafts(page)).toEqual([])
  })

  test('a draft belongs to its page: another page does not show it', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Título', { exact: true }).fill('Retention, mine')
    await page.goto('/b/growth/pages/audience/intros?view=edit')
    await expect(page.getByLabel('Título', { exact: true })).toHaveValue('Writing intros')
    await expect(page.getByText('Tus cambios sin guardar en esta pestaña volvieron.')).toHaveCount(0)
  })
})

test.describe('sources in the editor', () => {
  test('B1: Enter in a source field adds the source and never saves the page', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    const sources = page.getByRole('group', { name: 'Fuentes' })
    await sources.getByLabel('O un enlace').fill('https://example.test/notes')
    await sources.getByLabel('O un enlace').press('Enter')
    await expect(
      sources.getByRole('listitem').filter({ hasText: 'https://example.test/notes' }),
    ).toBeVisible()
    await expect(page).toHaveURL(/\?view=edit$/)
    await expect(said(page, /Guardado como la revisión/)).toHaveCount(0)
    await sources.getByLabel('Entrada del diario').fill('ent_fx_hooks')
    await sources.getByLabel('Entrada del diario').press('Enter')
    await expect(sources.getByRole('listitem').filter({ hasText: 'The hook goes first' })).toBeVisible()
    await expect(page).toHaveURL(/\?view=edit$/)
  })

  test('M2: an entry is found by its words, keyboard only, and shown by its title and date', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    const sources = page.getByRole('group', { name: 'Fuentes' })
    // The sources the page has are named by their titles, not their ids.
    await expect(sources.getByRole('listitem').filter({ hasText: 'Short intros keep viewers' })).toBeVisible()
    await sources.getByRole('button', { name: 'Quitar The hook goes first' }).click()
    const field = sources.getByLabel('Entrada del diario')
    await field.fill('greeting')
    const list = page.getByRole('listbox', { name: 'Entradas del diario' })
    const option = list.getByRole('option', { name: /The hook goes first/ })
    await expect(option).toBeVisible()
    await expect(option).toContainText('oct')
    await expect(option).toHaveAttribute('aria-selected', 'true')
    await field.press('Enter')
    await expect(sources.getByRole('listitem').filter({ hasText: 'The hook goes first' })).toBeVisible()
    await expect(field).toHaveValue('')
    await expect(page).toHaveURL(/\?view=edit$/)
  })
})

test.describe('one Save for the whole page (M1)', () => {
  test('a status chosen, then ⌘ Enter in the body: saved with the rest', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Estado', { exact: true }).selectOption('stale')
    await body(page).fill('Kept short.')
    await body(page).press('ControlOrMeta+Enter')
    await expect(page).toHaveURL(new RegExp(`${RETENTION}$`))
    await expect(
      said(page, 'Guardado como la revisión 5. La página está desactualizada ahora.'),
    ).toBeVisible()
    await expect(page.locator('.page-meta')).toContainText('Desactualizada')
    await expect(page.locator('.prose')).toContainText('Kept short.')
  })

  test('only a status, ⌘ Enter from its own field', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    const status = page.getByLabel('Estado', { exact: true })
    await status.selectOption('retired')
    await status.press('ControlOrMeta+Enter')
    await expect(said(page, 'Guardado como la revisión 4. La página está retirada ahora.')).toBeVisible()
  })

  test('leaving with a status not saved: the page says so, and the edit still has it', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Estado', { exact: true }).selectOption('stale')
    await expect(page.getByText('Aún sin guardar')).toBeVisible()
    await page.getByRole('link', { name: 'Volver a la página' }).click()
    await expect(
      page.getByRole('note').filter({ hasText: 'Tus cambios en esta página todavía no se guardan.' }),
    ).toBeVisible()
    await expect(page.locator('.page-meta')).toContainText('Vigente')
    await page.getByRole('link', { name: 'Volver a la edición' }).click()
    await expect(page.getByLabel('Estado', { exact: true })).toHaveValue('stale')
  })

  test('choosing the status the page has is no change', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    const status = page.getByLabel('Estado', { exact: true })
    await status.selectOption('stale')
    await status.selectOption('current')
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(said(page, 'Nada cambió: no hay nada que guardar.')).toBeVisible()
  })

  test('content, status and address in one Save; the old address still leads there', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Resumen').fill('Still what keeps viewers.')
    await page.getByLabel('Estado', { exact: true }).selectOption('stale')
    await page.getByLabel('Dirección', { exact: true }).fill('audience/what-keeps-viewers')
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(page).toHaveURL(/\/pages\/audience\/what-keeps-viewers$/)
    await expect(
      said(
        page,
        'Guardado como la revisión 6. La página está desactualizada ahora. La página vive en audience/what-keeps-viewers ahora',
      ),
    ).toBeVisible()
  })
})

// A second person (the same curator in another browser) saves the page meanwhile.
async function other(context: BrowserContext, baseURL: string, id: string) {
  const b = context.browser()
  if (!b) throw new Error('no browser')
  const c = await b.newContext({ baseURL, viewport: { width: 1440, height: 900 } })
  await c.setExtraHTTPHeaders({ 'x-fixture-scenario': id })
  await c.addCookies([
    { name: 'rscb_session', value: 'fx.acc_eric', url: baseURL, httpOnly: true, sameSite: 'Lax' },
  ])
  return c
}

test.describe('saving over a newer revision (M4, CA10)', () => {
  test('both added a paragraph: the result keeps both and is shown before saving', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    const c2 = await other(context, baseURL as string, s.id)
    const p2 = await c2.newPage()
    await page.goto(EDIT)
    await p2.goto(EDIT)
    const start = await body(page).inputValue()
    await body(p2).fill(`${start}\n\nTheirs: hooks matter.`)
    await p2.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(said(p2, 'Guardado como la revisión 4.')).toBeVisible()
    await body(page).fill(`${start}\n\nMine: thumbnails matter.`)
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    const conflict = page.getByRole('region', { name: 'Eric guardó la revisión 4 mientras editabas' })
    await expect(conflict).toBeVisible()
    await expect(conflict.getByRole('radio', { name: 'Conservar ambos' })).toBeChecked()
    const result = conflict.locator('[data-part="result-body"]')
    await expect(result).toContainText('Theirs: hooks matter.')
    await expect(result).toContainText('Mine: thumbnails matter.')
    await conflict.getByRole('button', { name: 'Guardar este resultado' }).click()
    await expect(said(page, 'Guardado como la revisión 5.')).toBeVisible()
    await expect(page.locator('.prose')).toContainText('Theirs: hooks matter.')
    await expect(page.locator('.prose')).toContainText('Mine: thumbnails matter.')
    await c2.close()
  })

  test('names who saved; the same line changed two ways asks which to keep', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await body(page).fill('Mine, all of it.')
    await behind(baseURL as string, s.id, { body: 'Eva says: intros of 5 seconds.' })
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    const conflict = page.getByRole('region', { name: 'Eva guardó la revisión 4 mientras editabas' })
    await expect(conflict).toContainText('Está en la revisión 4 ahora.')
    await expect(conflict.getByRole('radio', { name: 'Conservar ambos' })).toHaveCount(0)
    const save = conflict.getByRole('button', { name: 'Guardar este resultado' })
    await expect(save).toHaveAttribute('aria-disabled', 'true')
    await conflict.getByRole('radio', { name: 'Conservar el suyo' }).check()
    await expect(save).not.toHaveAttribute('aria-disabled', 'true')
    await expect(conflict.getByRole('region', { name: 'Lo que se guardará' })).toContainText(
      'Su revisión tal como está',
    )
    await conflict.getByRole('radio', { name: 'Conservar el mío' }).check()
    await save.click()
    await expect(said(page, 'Guardado como la revisión 5.')).toBeVisible()
    await expect(page.locator('.prose')).toContainText('Mine, all of it.')
  })

  test('C2: their tags are shown and kept when I changed the body', async ({ page, context, baseURL }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Etiquetas').fill('metric, q4, mine')
    await behind(baseURL as string, s.id, { tags: ['metric', 'q4', 'theirs'] })
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    const conflict = page.getByRole('region', { name: /guardó la revisión 4 mientras editabas/ })
    const theirs = conflict.getByRole('region', { name: 'Lo que cambió Eva' })
    await expect(theirs.locator('ins').filter({ hasText: 'theirs' })).toBeVisible()
    await conflict.getByRole('button', { name: 'Guardar este resultado' }).click()
    await expect(page.locator('.page-main .tags')).toContainText('theirs')
    await expect(page.locator('.page-main .tags')).toContainText('mine')
  })
})

test.describe('a conflict on a long body (CA6)', () => {
  test('choosing a version does not work the conflict out again: no click blocks the page', async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    let seed = 11
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const text = () =>
      Array.from({ length: 6000 }, () => ['- a', '- b', '', '- c'][Math.floor(rnd() * 4)]).join('\n')
    // Typing thousands of lines key by key takes the test runner minutes: the text is put in at once.
    const put = (v: string) =>
      body(page).evaluate((el: HTMLTextAreaElement, v) => {
        el.value = v
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }, v)
    // The page holds 6000 short lines; both sides rewrite all of them.
    await page.goto(EDIT)
    await put(text())
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(said(page, 'Guardado como la revisión 4.')).toBeVisible()
    await page.goto(EDIT)
    await put(text())
    await behind(baseURL as string, s.id, { body: text() })
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    const conflict = page.getByRole('region', { name: /guardó la revisión 5 mientras editabas/ })
    await expect(conflict).toBeVisible()
    // The conflict is worked out once (a performance measure each time), well under 200 ms.
    const worked = () =>
      page.evaluate(() => performance.getEntriesByName('wiki: conflict worked out').map((e) => e.duration))
    await expect.poll(async () => (await worked()).length).toBeGreaterThan(0)
    const first = await worked()
    for (const c of ['Conservar el mío', 'Conservar el suyo', 'Conservar el mío', 'Conservar el suyo']) {
      await conflict.getByRole('radio', { name: c }).check()
      await expect(conflict.getByRole('radio', { name: c })).toBeChecked()
    }
    const after = await worked()
    expect(after, 'choosing a version works nothing out again').toEqual(first)
    for (const ms of after) expect(ms, 'the conflict, in ms').toBeLessThan(200)
  })
})

test.describe('a save that is partly refused', () => {
  test('says what was not saved and why; a second Save sends only what is left', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    // The server keeps the content redacted: what it saved is not what was typed.
    await page.route('**/v1/brains/growth/**', async (route) => {
      if (route.request().method() === 'GET') return route.fallback()
      const r = await route.fetch()
      const text = (await r.text()).replaceAll('Partial summary.', 'Partial [redacted].')
      await route.fulfill({ response: r, body: text })
    })
    const sent: string[] = []
    page.on('request', (r) => {
      if (r.method() !== 'GET' && r.url().includes('/v1/brains/'))
        sent.push(`${r.method()} ${new URL(r.url()).pathname} ${r.postData() ?? ''}`)
    })
    await page.goto(EDIT)
    await page.getByLabel('Resumen').fill('Partial summary.')
    await page.getByLabel('Estado', { exact: true }).selectOption('stale')
    await page.getByLabel('Dirección', { exact: true }).fill('audience/intros')
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    const alert = page.getByRole('alert')
    await expect(alert).toContainText(
      'El traslado no se guardó: the address "audience/intros" is taken or reserved by another page. Tus otros cambios se guardaron como la revisión 5.',
    )
    await expect(page.getByText(/nothing was saved/i)).toHaveCount(0)
    await expect(page.getByText(/Part of it was saved/)).toHaveCount(0)
    await expect(page.getByLabel('Resumen')).toHaveValue('Partial [redacted].')
    await expect(page.getByLabel('Dirección', { exact: true })).toHaveValue('audience/intros')
    expect(sent).toHaveLength(3)
    sent.length = 0
    await page.getByLabel('Dirección', { exact: true }).fill('audience/free-one')
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(said(page, 'Guardado como la revisión 6.')).toBeVisible()
    await expect(page).toHaveURL(/\/b\/growth\/pages\/audience\/free-one$/)
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatch(/^POST \/v1\/brains\/growth\/wiki\/changes /)
    expect(JSON.parse((sent[0] as string).split(' ').slice(2).join(' '))).toMatchObject({
      op: 'move',
      address: 'audience/retention',
      to: 'audience/free-one',
    })
  })
})

test.describe('the map (M3)', () => {
  test('every page whatever its status, with its status in words; a status filter, all by default', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/wiki')
    const status = page.getByLabel('Estado')
    await expect(status).toHaveValue('')
    await expect(status.locator('option:checked')).toHaveText('Todos los estados')
    const weekly = page.getByRole('listitem').filter({ hasText: 'Weekly review' })
    await expect(weekly.locator('.tag')).toHaveText('Desactualizada')
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Consent in 2024' }).locator('.tag'),
    ).toHaveText('Retirada')
    await status.selectOption('stale')
    await expect(page).toHaveURL(/status=stale/)
    await expect(page.getByRole('link', { name: 'Weekly review' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Retention' })).toHaveCount(0)
    await status.selectOption('')
    await page.getByLabel('Filtrar por palabras').fill('consent')
    await expect(page.getByRole('link', { name: 'Consent in 2024' })).toBeVisible()
  })

  test('no tag in the wiki: no tag filter', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.route('**/v1/brains/growth/wiki/map*', async (route) => {
      const r = await route.fetch()
      const j = (await r.json()) as { groups: { pages: { tags: string[] }[] }[] }
      for (const g of j.groups) for (const p of g.pages) p.tags = []
      await route.fulfill({ response: r, json: j })
    })
    await page.goto('/b/growth/wiki')
    await expect(page.getByLabel('Tipo')).toBeVisible()
    await expect(page.getByLabel('Etiqueta', { exact: true })).toHaveCount(0)
  })
})

test.describe('a page', () => {
  test('M5: who read it, one line a person or agent, with how many times and when last', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(RETENTION)
    const readers = page.getByRole('region', { name: 'Quién la leyó' })
    await expect(readers.getByRole('listitem')).toHaveCount(3)
    await expect(readers.getByRole('listitem').filter({ hasText: 'Ana' })).toContainText('con Claude Code')
    await expect(readers.getByRole('listitem').filter({ hasText: 'Ana' })).toContainText('2 veces')
  })

  test('M5: one visit asks for the page once (one read)', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    const asked: string[] = []
    page.on('request', (r) => {
      if (/\/v1\/brains\/growth\/pages\/audience\/retention/.test(r.url())) asked.push(r.url())
    })
    await page.goto(RETENTION)
    await expect(page.getByRole('region', { name: 'Cambios recientes' }).getByRole('listitem')).toHaveCount(3)
    await expect(page.getByRole('region', { name: 'Quién la leyó' }).getByRole('listitem')).toHaveCount(3)
    await page.waitForTimeout(300)
    expect(asked).toHaveLength(1)
  })

  test('[[links]] show the title of their page, the address on hover; a stale page says so', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/pages/audience/intros')
    const prose = page.locator('.prose')
    await expect(prose.getByRole('link', { name: 'Retention' })).toHaveAttribute(
      'title',
      'audience/retention',
    )
    await expect(prose.getByRole('link', { name: 'Weekly review (desactualizada)' })).toBeVisible()
    const out = page.getByRole('group', { name: 'Desde esta página' })
    await expect(out.getByRole('listitem').filter({ hasText: 'Weekly review' })).toContainText(
      'desactualizada',
    )
  })

  test('N2: a source opened and closed leaves no extra step: Back leaves the page', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/b/growth/wiki')
    await page.getByRole('link', { name: 'Retention' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Retention' })).toBeVisible()
    await page.getByRole('button', { name: 'Short intros keep viewers' }).click()
    await expect(page).toHaveURL(/\?source=ent_fx_intros$/)
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click()
    await expect(page).toHaveURL(new RegExp(`${RETENTION}$`))
    await page.goBack()
    await expect(page).toHaveURL(/\/b\/growth\/wiki$/)
  })
})

test.describe('history (M6 and the kinds of change)', () => {
  test('each revision says what it changed and why', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await page.getByLabel('Estado', { exact: true }).selectOption('stale')
    await page.getByLabel('Por qué (se muestra en el registro)').fill('The numbers are from October.')
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    await expect(said(page, /Guardado como la revisión 4/)).toBeVisible()
    await page.goto(`${RETENTION}?view=history`)
    const revisions = page.getByRole('region', { name: 'Revisiones' })
    const four = revisions.getByRole('listitem').filter({ hasText: 'Revisión 4' })
    await expect(four).toContainText('Revisión 4 · estado → desactualizada por Eric')
    await expect(four).toContainText('Por qué: The numbers are from October.')
    await expect(revisions.getByRole('listitem').filter({ hasText: 'Revisión 1' })).toContainText(
      'Revisión 1 · creada por Eric',
    )
    await page.goto('/b/growth/wiki/log')
    const line = page.getByRole('list', { name: 'Cambios' }).getByRole('listitem').first()
    await expect(line).toContainText('Estado directo → stale: audience/retention')
    await expect(line).toContainText('Por qué: The numbers are from October.')
    // The status part of the difference, on its own.
    await page.goto(`${RETENTION}?view=history&compare=3,4`)
    const diff = page.getByRole('region', { name: 'Cambios de la revisión 3 a la 4' })
    const status = diff.locator('.diff-part').filter({ has: page.getByRole('heading', { name: 'Estado' }) })
    await expect(status.locator('del')).toContainText('Vigente')
    await expect(status.locator('ins')).toContainText('Desactualizada')
  })

  test('a sentence rewritten shows the old line and the new line whole', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(`${RETENTION}?view=history&compare=1,2`)
    const diff = page.getByRole('region', { name: 'Cambios de la revisión 1 a la 2' })
    await expect(diff.locator('del').filter({ hasText: 'Long intros lose viewers.' })).toHaveCount(1)
    await expect(
      diff.locator('ins').filter({
        hasText:
          'Intros under ten seconds keep viewers past the first minute. Long intros lose a third of them before the hook.',
      }),
    ).toHaveCount(1)
  })
})

test.describe('the [[ of the body', () => {
  test('the first page found is chosen: Enter takes it', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    await body(page).fill('See [[pric')
    const option = page.getByRole('listbox', { name: 'Páginas para enlazar' }).getByRole('option').first()
    await expect(option).toHaveAttribute('aria-selected', 'true')
    await body(page).press('Enter')
    await expect(body(page)).toHaveValue('See [[product/pricing]]')
  })

  test('C3: completing inside a link already there replaces it whole', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(EDIT)
    const field = body(page)
    await field.fill('See [[audience/intros]] now.')
    await field.focus()
    await field.evaluate((el: HTMLTextAreaElement) => {
      const at = el.value.indexOf('aud') + 3
      el.setSelectionRange(at, at)
      el.dispatchEvent(new Event('click'))
    })
    const list = page.getByRole('listbox', { name: 'Páginas para enlazar' })
    await list.getByRole('option', { name: /audience\/intros/ }).click()
    await expect(field).toHaveValue('See [[audience/intros]] now.')
  })

  test('an answer to an older question never replaces the newer one', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.route('**/v1/brains/growth/wiki/pages?q=pro*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('q') !== 'pro') return route.fallback()
      await new Promise((r) => setTimeout(r, 900))
      await route.fulfill({
        json: { items: [{ address: 'zzz/late', title: 'Late', status: 'current' }], next: null, total: 1 },
      })
    })
    await page.goto(EDIT)
    await body(page).fill('[[pro')
    await page.waitForTimeout(250)
    await body(page).fill('[[product/m')
    const list = page.getByRole('listbox', { name: 'Páginas para enlazar' })
    await expect(list.getByRole('option', { name: /product\/monthly-only/ })).toBeVisible()
    await page.waitForTimeout(1000)
    await expect(list.getByRole('option', { name: /zzz\/late/ })).toHaveCount(0)
  })

  test('keeps the first page chosen when an answer to an older question arrives late', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    let late = () => {}
    const arrived = new Promise<void>((r) => {
      late = r
    })
    await page.route('**/v1/brains/growth/wiki/pages?q=pro*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('q') !== 'pro') return route.fallback()
      await new Promise((r) => setTimeout(r, 900))
      await route.fulfill({
        json: { items: [{ address: 'zzz/late', title: 'Late', status: 'current' }], next: null, total: 1 },
      })
      late()
    })
    await page.goto(EDIT)
    await body(page).fill('[[pro')
    await page.waitForTimeout(250)
    await body(page).fill('[[product/m')
    const first = page.getByRole('listbox', { name: 'Páginas para enlazar' }).getByRole('option').first()
    await expect(first).toContainText('product/monthly-only')
    await expect(first).toHaveAttribute('aria-selected', 'true')
    await arrived
    await page.waitForTimeout(100)
    await expect(first).toContainText('product/monthly-only')
    await expect(first).toHaveAttribute('aria-selected', 'true')
    await body(page).press('Enter')
    await expect(body(page)).toHaveValue('[[product/monthly-only]]')
  })
})

test.describe('the log', () => {
  test('N1: «Show more» for an old filter does not add its lines under a new one', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { log: 'much-data' })
    let slow = true
    await page.route('**/v1/brains/growth/wiki/log?*cursor=*', async (route) => {
      if (slow) await new Promise((r) => setTimeout(r, 800))
      await route.fallback()
    })
    await page.goto('/b/growth/wiki/log')
    const list = page.getByRole('list', { name: 'Cambios' })
    await expect(list.getByRole('listitem')).toHaveCount(50)
    await page.getByRole('button', { name: 'Mostrar más' }).click()
    await page.getByLabel('Tipo de cambio').selectOption('direct')
    slow = false
    await page.waitForTimeout(1200)
    await expect(list.getByRole('listitem').filter({ hasText: 'Aprobada:' })).toHaveCount(0)
  })
})

test.describe('search', () => {
  test('a result shows plain text, not markdown', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/')
    await page
      .getByRole('button', { name: /Buscar/ })
      .first()
      .click()
    const dialog = page.getByRole('dialog', { name: 'Buscar' })
    await dialog.getByRole('searchbox', { name: 'Buscar' }).fill('retention')
    await dialog.getByRole('searchbox', { name: 'Buscar' }).press('Enter')
    const snippet = dialog.locator('.snippet').first()
    await expect(snippet).toContainText('What keeps viewers')
    await expect(snippet).not.toContainText('##')
    await expect(snippet).not.toContainText('[[')
  })
})

test.describe('shortcuts (CA20)', () => {
  test('e edits the page, g d goes to the decisions, g l to the log; ? lists them', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto(RETENTION)
    await expect(page.getByRole('heading', { level: 1, name: 'Retention' })).toBeVisible()
    await page.keyboard.press('?')
    const help = page.getByRole('dialog', { name: 'Atajos de teclado' })
    for (const id of ['edit', 'go-decisions', 'go-log'])
      await expect(help.locator(`[data-shortcut="${id}"]`)).toBeVisible()
    await page.keyboard.press('Escape')
    await page.keyboard.press('e')
    await expect(page).toHaveURL(/\?view=edit$/)
    await page.locator('main h1').focus()
    await page.keyboard.press('g')
    await page.keyboard.press('d')
    await expect(page).toHaveURL(/\/wiki\/decisions$/)
    await page.keyboard.press('g')
    await page.keyboard.press('l')
    await expect(page).toHaveURL(/\/wiki\/log$/)
  })
})

// The design gate of the changed screens at the three widths the web is checked at: nothing scrolls
// sideways, and the editor, its conflict with both versions and the result, the map and the history fit.
for (const width of [1440, 768, 390]) {
  test(`at ${width} px the editor, a conflict, the map and the history fit`, async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await scenario(context, baseURL as string, 'signed-in')
    await page.setViewportSize({ width, height: 900 })
    await page.goto(EDIT)
    await expect(body(page)).toBeVisible()
    await noSideScroll(page)
    await body(page).fill(
      'Mine, all of it, a long line that has to wrap at the narrow width of a phone screen.',
    )
    await page.getByLabel('Título', { exact: true }).fill('Retention, mine')
    await behind(baseURL as string, s.id, { body: 'El suyo, todo.', tags: ['metric', 'theirs'] })
    await page.getByRole('button', { name: 'Guardar los cambios' }).click()
    const conflict = page.getByRole('region', { name: /guardó la revisión 4 mientras editabas/ })
    await conflict.getByRole('radio', { name: 'Conservar el mío' }).check()
    await expect(conflict.locator('[data-part="result-body"]')).toBeVisible()
    await noSideScroll(page)
    await page.screenshot({ path: test.info().outputPath(`conflict-${width}.png`), fullPage: true })
    await page.goto('/b/growth/wiki')
    await expect(page.getByLabel('Estado')).toBeVisible()
    await noSideScroll(page)
    await page.goto(`${RETENTION}?view=history&compare=1,3`)
    await expect(page.getByRole('region', { name: 'Cambios de la revisión 1 a la 3' })).toBeVisible()
    await noSideScroll(page)
  })
}
