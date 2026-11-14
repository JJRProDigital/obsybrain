// Capture helper: sign in once, then walk the screens, saving a PNG each.
// Run: node scripts/shots/run.mjs  (WSL, node 25)
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:8090'
const EMAIL = process.env.EMAIL ?? 'hola@juanjoserprofesionaldigital.com'
const PASSWORD = process.env.PASSWORD ?? ''
const OUT = '/mnt/e/pruebas2026/obsybrain/scripts/shots/png'
const SLUG = process.env.SLUG ?? 'emails-de-onboarding'

if (!PASSWORD) {
  console.log('PASSWORD env var required (the admin account password, used only to sign in, never stored)')
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const shot = async (name) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  console.log('shot', name)
}

// Sign in
await page.goto(`${BASE}/sign-in`)
await page.getByLabel(/correo|email/i).fill(EMAIL)
await page.getByLabel(/contrase|password/i).fill(PASSWORD)
await page.getByRole('button', { name: /iniciar sesi/i }).click()
await page.waitForURL(`${BASE}/`)
await shot('01-home')

// Brain screens
const b = `${BASE}/b/${SLUG}`
const walk = [
  ['02-brain-overview', `${b}`],
  ['03-wiki-map', `${b}/wiki`],
  ['04-wiki-decisions', `${b}/wiki/decisions`],
  ['05-wiki-log', `${b}/wiki/log`],
  ['06-wiki-graph', `${b}/wiki/graph`],
  ['07-wiki-page', `${b}/pages/como-trabajamos`],
  ['08-journal-sessions', `${b}/journal`],
  ['09-proposals', `${b}/proposals`],
  ['10-health', `${b}/health`],
  ['11-activity', `${b}/activity`],
  ['12-settings-members', `${b}/settings`],
  ['13-settings-agents', `${b}/settings/agents`],
  ['14-settings-import', `${b}/settings/import`],
  ['15-people', `/people`],
  ['16-profile', `/profile`],
  ['17-connect', `/connect`],
  ['18-admin-people', `/admin/people`],
  ['19-admin-branding', `/admin/branding`],
  ['20-admin-system', `/admin/system`],
]
for (const [name, path] of walk) {
  await page.goto(path.startsWith('/') ? `${BASE}${path}` : path)
  await shot(name)
}

// Search dialog
await page.keyboard.press('Control+k')
await shot('21-search-dialog')
await page.keyboard.press('Escape')
// Help dialog
await page.keyboard.press('?')
await shot('22-help-shortcuts')

await browser.close()
console.log('done:', OUT)
