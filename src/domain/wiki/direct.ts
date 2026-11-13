// A curator changes the wiki by hand, in the web, without a proposal (spec B2 «Editar a mano»): the
// same operations, checked the same way, written by the same applier, so history and log show it like
// an approved proposal. An edit goes against a revision: if the page moved on, nothing is saved and the
// current version comes back (CA10). Also the curator's settings: the compile guide and the map intro.
import { conflict, invalid } from '../../core/errors.ts'
import { redact } from '../../privacy/redact.ts'
import { allow, type Ctx, inBrain } from '../context.ts'
import { lockMeaning } from '../meaning.ts'
import { applyOps, type Revised } from './apply.ts'
import { type Problem, readOp } from './model.ts'
import { DEFAULT_GUIDE, getPage, type PageReading, settingsOf, type WikiSettings } from './pages.ts'
import { problemsOf } from './proposals.ts'
import { webOnly } from './review.ts'

export async function directChange(
  ctx: Ctx,
  slug: string,
  raw: unknown,
): Promise<{ revised: Revised[]; page: PageReading | null }> {
  const problems: Problem[] = []
  const op = readOp(raw, 0, problems)
  const out = await ctx.db.tx(async (db) => {
    const c = { ...ctx, db }
    const { brain, role } = await inBrain(c, { slug }, 'share')
    webOnly(c)
    await allow(c, 'wiki.decide', { role, brainStatus: brain.status }, brain.id)
    if (op) problems.push(...(await problemsOf(db, brain.id, [op], [], false)))
    if (!op || problems.length > 0) {
      const err = invalid(
        'El cambio tiene problemas; no se guardó nada.',
        'Corrige cada uno de los listados en "problems".',
      )
      err.problems = problems
      throw err
    }
    if (op.op === 'edit') {
      const now = await db.one(
        'SELECT p.revision FROM page_addresses a JOIN pages p ON p.id = a.page_id WHERE a.brain_id = $1 AND a.address = $2',
        [brain.id, op.address],
      )
      if (now && Number(now.revision) !== op.baseRevision) {
        const err = conflict(
          'page_changed',
          `"${op.address}" cambió desde la revisión ${op.baseRevision}; está en la ${now.revision}. No se guardó nada.`,
          'Aplica tu cambio sobre la versión actual (en "current") y guárdalo con su revisión.',
        )
        err.current = await getPage(c, slug, op.address)
        throw err
      }
    }
    const verb =
      op.op === 'revert'
        ? `De vuelta a la revisión ${op.toRevision}`
        : op.op === 'status'
          ? `Estado directo → ${op.status}`
          : `Directo: ${op.op}`
    const { revised } = await applyOps(c, db, brain.id, [{ op }], {
      kind: op.op === 'revert' ? 'revert' : 'direct',
      summary: `${verb}: ${op.address}`,
      reason: op.reason,
    })
    const last = revised.at(-1)
    return { revised, address: last?.address ?? null }
  })
  return { revised: out.revised, page: out.address ? await getPage(ctx, slug, out.address) : null }
}

export type SettingsInput = {
  // What each field was when the person read it (G11, per-field compare-and-set): a save of a field
  // someone changed since is refused with what is there now, so two curators editing at once never
  // overwrite each other unseen; fields not sent are never touched. Left out, a save goes as before.
  base?: Partial<Record<SettingsField, unknown>>
  guide?: string | null
  mapIntro?: string
  usageNote?: string
  meaningExcluded?: boolean
  staleDays?: number
  longChars?: number
  maintenanceEvery?: number
}

// The fields a person edits (not the count of approvals, which moves by itself).
export const SETTINGS_FIELDS = [
  'guide',
  'mapIntro',
  'usageNote',
  'meaningExcluded',
  'staleDays',
  'longChars',
  'maintenanceEvery',
] as const
export type SettingsField = (typeof SETTINGS_FIELDS)[number]

// The settings as the brain's settings screen reads them (G11): the default texts beside the current ones.
export type SettingsView = WikiSettings & { guideDefault: string; usageNoteDefault: string }
export const USAGE_NOTE_DEFAULT = ''

export function settingsView(s: WikiSettings): SettingsView {
  return { ...s, guideDefault: DEFAULT_GUIDE, usageNoteDefault: USAGE_NOTE_DEFAULT }
}

// A field as stored and compared: the guide is null while it is the default.
const stored = (s: WikiSettings, f: SettingsField): unknown =>
  f === 'guide' ? (s.customGuide ? s.guide : null) : s[f]

// Any member reads them: the guide and the note already reach every member's agents.
export async function getWikiSettings(ctx: Ctx, slug: string): Promise<SettingsView> {
  const { brain } = await inBrain(ctx, { slug })
  return settingsView(await settingsOf(ctx.db, brain.id))
}

export async function setWikiSettings(
  ctx: Ctx,
  slug: string,
  s: SettingsInput,
): Promise<SettingsView & { unchanged?: true }> {
  let guide = s.guide === undefined || s.guide === null ? s.guide : redact(s.guide.trim()).text
  // The default text itself is the default: stored as null, so the brain follows it as it improves.
  if (typeof guide === 'string' && guide === DEFAULT_GUIDE.trim()) guide = null
  const mapIntro = s.mapIntro === undefined ? undefined : redact(s.mapIntro.trim()).text
  const usageNote = s.usageNote === undefined ? undefined : redact(s.usageNote.trim()).text
  if (guide !== undefined && guide !== null && (!guide || guide.length > 20_000)) {
    throw invalid(
      'La guía tiene de 1 a 20 000 caracteres.',
      'Acórtala, o envía null para volver a la guía por defecto.',
    )
  }
  if (mapIntro !== undefined && mapIntro.length > 4000)
    throw invalid('La introducción del mapa tiene como máximo 4 000 caracteres.', 'Acórtala.')
  // The note that opens every start-up context of the brain (spec B3).
  if (usageNote !== undefined && usageNote.length > 2000)
    throw invalid('La nota de uso tiene como máximo 2 000 caracteres.', 'Acórtala.')
  const range = (v: number | undefined, name: string, min: number, max: number) => {
    if (v !== undefined && (!Number.isSafeInteger(v) || v < min || v > max)) {
      throw invalid(`"${name}" va de ${min} a ${max}.`, `Corrige "${name}".`)
    }
  }
  range(s.staleDays, 'staleDays', 1, 3650)
  range(s.longChars, 'longChars', 1000, 100_000)
  range(s.maintenanceEvery, 'maintenanceEvery', 1, 1000)
  return ctx.db.tx(async (db) => {
    const c = { ...ctx, db }
    const { brain, role } = await inBrain(c, { slug }, 'share')
    webOnly(c)
    await allow(c, 'wiki.decide', { role, brainStatus: brain.status }, brain.id)
    await db.query('INSERT INTO wiki_settings (brain_id) VALUES ($1) ON CONFLICT (brain_id) DO NOTHING', [
      brain.id,
    ])
    if (s.base) {
      // Saves of this brain's settings take turns from here, so two on the same value cannot both pass.
      await db.query('SELECT 1 FROM wiki_settings WHERE brain_id = $1 FOR UPDATE', [brain.id])
      const now = await settingsOf(db, brain.id)
      const moved = (Object.keys(s.base) as SettingsField[]).filter((f) => stored(now, f) !== s.base?.[f])
      if (moved.length) {
        const e = conflict(
          'settings_changed',
          `Alguien cambió ${moved.join(', ')} de "${slug}" desde que ${moved.length === 1 ? 'lo' : 'los'} leíste.`,
          'Lee los valores actuales en "current" y vuelve a guardar tu cambio sobre ellos.',
        )
        e.current = settingsView(now)
        throw e
      }
    }
    const sets: string[] = []
    const values: unknown[] = [brain.id]
    const set = (col: string, v: unknown) => {
      if (v === undefined) return
      values.push(v)
      sets.push(`${col} = $${values.length}`)
    }
    set('guide', guide)
    set('map_intro', mapIntro)
    set('usage_note', usageNote)
    set('meaning_excluded', s.meaningExcluded)
    set('stale_days', s.staleDays)
    set('long_chars', s.longChars)
    set('maintenance_every', s.maintenanceEvery)
    // Only a base: the person changed nothing, and asks whether what they see is still what is there.
    if (sets.length === 0 && s.base)
      return { ...settingsView(await settingsOf(db, brain.id)), unchanged: true }
    if (sets.length === 0)
      throw invalid(
        'Nada que cambiar.',
        'Envía guide, mapIntro, usageNote, meaningExcluded, staleDays, longChars o maintenanceEvery.',
      )
    // Waits for any vector being stored for this brain, so none lands after the exclusion.
    if (s.meaningExcluded !== undefined) await lockMeaning(db, brain.id)
    await db.query(`UPDATE wiki_settings SET ${sets.join(', ')} WHERE brain_id = $1`, values)
    // Excluding a brain from meaning search deletes its vectors now; nothing more of it is sent (CA8).
    if (s.meaningExcluded === true)
      await db.query('DELETE FROM meaning_vectors WHERE brain_id = $1', [brain.id])
    return settingsView(await settingsOf(db, brain.id))
  })
}

// The curator asked for a maintenance proposal: the count of approvals starts again.
export async function maintenanceAsked(ctx: Ctx, slug: string): Promise<WikiSettings> {
  return ctx.db.tx(async (db) => {
    const c = { ...ctx, db }
    const { brain, role } = await inBrain(c, { slug }, 'share')
    webOnly(c)
    await allow(c, 'wiki.decide', { role, brainStatus: brain.status }, brain.id)
    await db.query(
      `INSERT INTO wiki_settings (brain_id, approvals_since) VALUES ($1, 0)
       ON CONFLICT (brain_id) DO UPDATE SET approvals_since = 0`,
      [brain.id],
    )
    return settingsOf(db, brain.id)
  })
}
