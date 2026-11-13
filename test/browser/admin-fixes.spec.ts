// Fixes of the reviews of B6 PR25b, against the fixture API: the audit's times where the person is, in the
// same zone as its day filters; a download pinned to the view and built from the applied filters only; the
// keyboard on the first new line after «Show 100 more»; a new mail server asks for its password again; the
// limit is lowered only after asking; a provider changed while in use turns meaning search off; switching
// provider takes back the acceptance.
import type { Page } from '@playwright/test'
import { expect, scenario, test } from './fixture.ts'

const rows = (page: Page) => page.getByRole('table', { name: 'Líneas de auditoría' }).locator('tbody tr')

test.describe('audit: times and days where the person is', () => {
  test.use({ timezoneId: 'Europe/Madrid' })
  test('in Madrid, a line at 23:30 UTC on the 28th is 00:30 on the 29th, and the 29th finds it', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { 'admin-audit': 'much-data' })
    await page.goto('/admin/audit')
    await expect(page.getByText('Días y horas están en tu zona horaria (Europe/Madrid).')).toBeVisible()
    await expect(rows(page).filter({ hasText: 'line 11' })).toContainText('29 oct 2026, 00:30')
    await page.getByLabel('Desde').fill('2026-10-29')
    await page.getByLabel('Hasta').fill('2026-10-29')
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(rows(page).filter({ hasText: 'line 11' })).toHaveCount(1)
    await expect(rows(page).filter({ hasText: 'line 12' })).toHaveCount(0)
  })
})

test.describe('audit: at UTC+14', () => {
  test.use({ timezoneId: 'Pacific/Kiritimati' })
  test('the same line is 13:30 on the 29th; the 29th there ends at 10:00 UTC', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { 'admin-audit': 'much-data' })
    await page.goto('/admin/audit')
    await expect(rows(page).filter({ hasText: 'line 11' })).toContainText('29 oct 2026, 13:30')
    await page.getByLabel('Desde').fill('2026-10-29')
    await page.getByLabel('Hasta').fill('2026-10-29')
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    await expect(rows(page).filter({ hasText: 'line 11' })).toHaveCount(1)
    // 10:30 UTC on the 29th is the 30th at UTC+14.
    await expect(rows(page).filter({ hasText: /line 0$/ })).toHaveCount(0)
  })
})

test.describe('audit: the download is the view', () => {
  test('pinned to the first line shown; typed filters not applied change nothing; more lines take the keyboard', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { 'admin-audit': 'much-data' })
    await page.goto('/admin/audit')
    await expect(rows(page)).toHaveCount(100)
    const first = (await rows(page).first().getAttribute('id'))?.replace('audit-', '')
    const link = page.getByRole('link', { name: 'Descargar estas líneas (CSV)' })
    const before = (await link.getAttribute('href')) as string
    expect(new URL(before, 'http://x').searchParams.get('upTo')).toBe(first)
    // Typed, not applied: the file is still the view's.
    await page.getByLabel('Acción').fill('member.')
    await expect(link).toHaveAttribute('href', before)
    await page.getByRole('button', { name: 'Mostrar 100 más' }).click()
    await expect(rows(page).nth(100)).toBeFocused()
  })
})

test.describe('mail: a new server needs its password again', () => {
  test('changing the server with the password kept asks for it, and sends nothing', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/email')
    await expect(page.getByRole('group', { name: 'Contraseña' })).toContainText(
      'Conservar la actual (configurada)',
    )
    await expect(page.locator('body')).not.toContainText('ends in …')
    await page.getByLabel('Servidor de correo').fill('smtp.other.example')
    let sent = false
    page.on('request', (r) => {
      if (r.method() === 'PUT' && r.url().endsWith('/v1/admin/mail')) sent = true
    })
    await page.getByRole('button', { name: 'Guardar los ajustes de correo' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Escríbela otra vez' })).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Usar una nueva' })).toBeFocused()
    expect(sent).toBe(false)
    await expect(page.getByText('Usa los ajustes guardados: guarda primero tus cambios.')).toBeVisible()
  })

  test('a failed test says its category only', async ({ page, context, baseURL }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/email')
    const failures = page.getByRole('region', { name: 'Fallos de envío recientes' })
    await expect(failures).toContainText('timeout')
    // The final review of B6: mail not sent because it was not set up is not a send failure; it is said
    // apart, once, by how many.
    await expect(failures.getByRole('listitem').filter({ hasText: 'dan@example.test' })).toHaveCount(0)
    await expect(failures).toContainText(
      '1 correo no se envió porque el correo no estaba configurado entonces.',
    )
  })
})

test.describe('limits: lowering asks first', () => {
  test('a lower limit for every key is confirmed; keeping it changes nothing', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/limits')
    await page.getByLabel('Peticiones por minuto, por clave').fill('300')
    await page.getByRole('button', { name: 'Guardar el límite' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Bajar el límite para todas las claves?' })
    await expect(dialog).toContainText('300 peticiones por minuto en lugar de 600')
    await dialog.getByRole('button', { name: 'Conservar el límite actual' }).click()
    // Nothing was saved; what was typed is still there.
    expect(
      ((await (await page.request.get('/v1/admin/settings')).json()) as { rateLimit: number }).rateLimit,
    ).toBe(600)
    await expect(page.getByLabel('Peticiones por minuto, por clave')).toHaveValue('300')
    await page.getByRole('button', { name: 'Guardar el límite' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Bajar el límite' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Guardado.' })).toBeFocused()
  })
})

test.describe('meaning search: a new destination, a new acceptance', () => {
  test('switching provider takes the acceptance back; the one in use says so; a new key turns it off', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/meaning')
    const openai = page.getByRole('region', { name: 'OpenAI' })
    await openai.getByLabel('Clave de API de OpenAI').fill('sk-test-0123456789abcdefghij-k9Z2')
    await openai.getByRole('button', { name: 'Guardar la clave' }).click()
    const ollama = page.getByRole('region', { name: 'Ollama' })
    await ollama.getByLabel('Dirección de Ollama').fill('http://localhost:11434')
    await ollama.getByRole('button', { name: 'Guardar la dirección' }).click()
    await expect(ollama).toContainText('Dirección: http://localhost:11434')
    const on = page.getByRole('region', { name: 'Activar la búsqueda por significado' })
    await on.getByRole('radio', { name: /OpenAI/ }).check()
    await on.getByRole('checkbox', { name: /Entiendo/ }).check()
    await on.getByRole('radio', { name: /Ollama/ }).check()
    await expect(on.getByRole('checkbox', { name: /Entiendo/ })).not.toBeChecked()
    await expect(on.getByRole('button', { name: 'Activar la búsqueda por significado' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await on.getByRole('radio', { name: /OpenAI/ }).check()
    await on.getByRole('checkbox', { name: /Entiendo/ }).check()
    await on.getByRole('button', { name: 'Activar la búsqueda por significado' }).click()
    await expect(page.getByText('Activada con OpenAI (')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Cambiar de proveedor' })).toContainText('en uso')
    await openai.getByLabel('Clave de API de OpenAI').fill('sk-another-account-9876543210')
    await openai.getByRole('button', { name: 'Guardar la clave' }).click()
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'La búsqueda por significado está desactivada: OpenAI cambió' }),
    ).toBeFocused()
    await expect(page.getByText('Desactivada: las búsquedas usan solo palabras.')).toBeVisible()
  })
})

test.describe('second review: an empty view, and why meaning search went off', () => {
  test('the download of an empty view is pinned to the newest line the server had', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in', { 'admin-audit': 'much-data' })
    await page.goto('/admin/audit')
    await page.getByLabel('Acción').fill('nothing.')
    const read = page.waitForResponse(
      (r) => r.url().includes('/v1/admin/audit?') && r.url().includes('nothing.'),
    )
    await page.getByRole('button', { name: 'Aplicar filtros' }).click()
    const top = ((await (await read).json()) as { upTo: string }).upTo
    await expect(page.getByText('No hay líneas para estos filtros.')).toBeVisible()
    const href = (await page
      .getByRole('link', { name: 'Descargar estas líneas (CSV)' })
      .getAttribute('href')) as string
    expect(new URL(href, 'http://x').searchParams.get('upTo')).toBe(top)
  })

  test('turned off by a new destination: the screen says why until it is on again', async ({
    page,
    context,
    baseURL,
  }) => {
    await scenario(context, baseURL as string, 'signed-in')
    await page.goto('/admin/meaning')
    const openai = page.getByRole('region', { name: 'OpenAI' })
    await openai.getByLabel('Clave de API de OpenAI').fill('sk-test-0123456789abcdefghij-k9Z2')
    await openai.getByRole('button', { name: 'Guardar la clave' }).click()
    const on = page.getByRole('region', { name: 'Activar la búsqueda por significado' })
    await on.getByRole('radio', { name: /OpenAI/ }).check()
    await on.getByRole('checkbox', { name: /Entiendo/ }).check()
    await on.getByRole('button', { name: 'Activar la búsqueda por significado' }).click()
    await openai.getByLabel('Clave de API de OpenAI').fill('sk-another-account-9876543210')
    await openai.getByRole('button', { name: 'Guardar la clave' }).click()
    await page.reload()
    await expect(page.getByText(/Turned off: the key or address of openai changed/)).toBeVisible()
  })
})
