// Keys: a person's token, a service account's main key, and the short keys a service account mints
// for one job (spec B4, minimum for B1). The secret is returned once and stored only as its hash.
import { atLeast, type Role } from '../auth/can.ts'
import { memberRole } from '../auth/principal.ts'
import { hashSecret, newSecret } from '../auth/secrets.ts'
import type { Clock } from '../core/clock.ts'
import { brainNotFound, denied, invalid, notFound } from '../core/errors.ts'
import { newId } from '../core/ids.ts'
import type { Db } from '../db/db.ts'
import { redact } from '../privacy/redact.ts'
import { allow, type Ctx, ok } from './context.ts'

export type Minted = { id: string; secret: string; expiresAt: string | null }

export const MAX_TOKEN_DAYS = 365
export const MAX_SHORT_MINUTES = 24 * 60

async function insert(
  db: Db,
  at: Date,
  k: {
    accountId: string
    kind: 'token' | 'main' | 'short' | 'web'
    name: string
    perm: 'read' | 'write'
    allBrains?: boolean
    brainIds?: string[]
    writeBrainId?: string
    readBrainIds?: string[]
    ref?: string | null
    agent?: string | null
    onBehalfId?: string | null
    parentId?: string
    expiresAt: Date | null
  },
): Promise<Minted> {
  const id = newId('crd')
  const secret = newSecret()
  await db.query(
    `INSERT INTO credentials (id, account_id, kind, name, secret_hash, last4, perm, all_brains, brain_ids,
       write_brain_id, read_brain_ids, ref, agent, on_behalf_id, parent_id, created_at, expires_at, epoch)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
             (SELECT key_epoch FROM installation WHERE id = 1))`,
    [
      id,
      k.accountId,
      k.kind,
      // A name or an agent may carry a pasted secret: stored redacted, so no reader of the key ever shows it.
      redact(k.name).text.slice(0, 80) || 'key',
      hashSecret(secret),
      secret.slice(-4),
      k.perm,
      Boolean(k.allBrains),
      k.brainIds ?? [],
      k.writeBrainId ?? null,
      k.readBrainIds ?? [],
      k.ref ?? null,
      k.agent == null ? null : redact(k.agent).text.slice(0, 80),
      k.onBehalfId ?? null,
      k.parentId ?? null,
      at,
      k.expiresAt,
    ],
  )
  return { id, secret, expiresAt: k.expiresAt?.toISOString() ?? null }
}

export async function mintPersonToken(
  db: Db,
  clock: Clock,
  o: {
    accountId: string
    name: string
    perm: 'read' | 'write'
    allBrains?: boolean
    brainIds?: string[]
    days: number
  },
): Promise<Minted> {
  if (!Number.isInteger(o.days) || o.days < 1 || o.days > MAX_TOKEN_DAYS) {
    throw invalid(`Un token dura de 1 a ${MAX_TOKEN_DAYS} días.`, 'Elige 30, 90 o 365 días.')
  }
  if (!o.allBrains && !(o.brainIds && o.brainIds.length > 0)) {
    throw invalid('Un token necesita sus brains: todos los tuyos o una lista.', 'Pasa allBrains o brainIds.')
  }
  const now = clock()
  return insert(db, now, {
    accountId: o.accountId,
    kind: 'token',
    name: o.name,
    perm: o.perm,
    allBrains: Boolean(o.allBrains),
    brainIds: o.allBrains ? [] : (o.brainIds ?? []),
    expiresAt: new Date(now.getTime() + o.days * 86_400_000),
  })
}

export const WEB_SESSION_HOURS = { default: 14 * 24, max: 24 * 30 }

// A person's session in the web (spec B2 clarifications): the only credential that approves wiki
// proposals, edits pages by hand or purges. Presented as a cookie, never as a bearer key. Signing in
// (spec B4) issues it; it lasts 14 days from its last use.
export async function mintWebSession(
  db: Db,
  clock: Clock,
  o: { accountId: string; hours?: number },
): Promise<Minted> {
  const hours = o.hours ?? WEB_SESSION_HOURS.default
  if (!Number.isInteger(hours) || hours < 1 || hours > WEB_SESSION_HOURS.max) {
    throw invalid(`Una sesión web dura de 1 a ${WEB_SESSION_HOURS.max} horas.`, 'Inicia sesión de nuevo.')
  }
  const acc = await db.one<{ kind: string }>('SELECT kind FROM accounts WHERE id = $1', [o.accountId])
  if (acc?.kind !== 'person')
    throw invalid('Solo las personas inician sesión en la web.', 'Nombra una cuenta de persona.')
  const now = clock()
  return insert(db, now, {
    accountId: o.accountId,
    kind: 'web',
    name: 'web session',
    perm: 'write',
    allBrains: true,
    expiresAt: new Date(now.getTime() + hours * 3_600_000),
  })
}

export async function mintMainKey(
  db: Db,
  clock: Clock,
  o: { accountId: string; name: string },
): Promise<Minted> {
  const acc = await db.one<{ kind: string }>('SELECT kind FROM accounts WHERE id = $1', [o.accountId])
  if (acc?.kind !== 'service')
    throw invalid('Las claves principales son de cuentas de servicio.', 'Nombra una cuenta de servicio.')
  return insert(db, clock(), {
    accountId: o.accountId,
    kind: 'main',
    name: o.name,
    perm: 'write',
    expiresAt: null,
  })
}

export type ShortKeyRequest = {
  writeBrain: string // slug
  readBrains?: string[] // slugs
  perm?: 'read' | 'write'
  ref: string
  agent?: string
  onBehalf?: string // account id or email of a person
  ttlMinutes: number
  name?: string
}

const need = (perm: 'read' | 'write'): Role => (perm === 'write' ? 'contributor' : 'reader')

export async function mintShortKey(ctx: Ctx, r: ShortKeyRequest): Promise<Minted & { writeBrainId: string }> {
  await allow(ctx, 'key.short', {})
  const perm = r.perm ?? 'write'
  const ref = redact((r.ref ?? '').trim()).text
  if (!ref || ref.length > 200) {
    throw invalid(
      'Una clave corta necesita una referencia de 1 a 200 caracteres.',
      'Pasa "ref", como "run r_x, paso 3".',
    )
  }
  if (!Number.isInteger(r.ttlMinutes) || r.ttlMinutes < 1 || r.ttlMinutes > MAX_SHORT_MINUTES) {
    throw invalid(
      `Una clave corta dura de 1 a ${MAX_SHORT_MINUTES} minutos.`,
      'Renuévala antes de que venza si el trabajo es más largo.',
    )
  }
  const agent = r.agent?.trim() || null
  if (agent && agent.length > 80)
    throw invalid('El nombre del agente tiene más de 80 caracteres.', 'Acórtalo.')
  const brainId = async (slug: string, min: Role): Promise<string> => {
    const b = await ctx.db.one<{ id: string }>('SELECT id FROM brains WHERE slug = $1', [slug])
    if (!b) throw brainNotFound()
    const role = await memberRole(ctx.db, b.id, ctx.who.accountId)
    if (!role) throw brainNotFound()
    if (!atLeast(role, min)) {
      throw denied(
        `Esta cuenta de servicio es ${role} en "${slug}"; la clave necesita ${min}.`,
        'Pídele ese rol a quien cure el brain, o acuña una clave más limitada.',
      )
    }
    return b.id
  }
  const writeBrainId = await brainId(r.writeBrain, need(perm))
  const readBrainIds: string[] = []
  for (const slug of r.readBrains ?? []) {
    const id = await brainId(slug, 'reader')
    if (id !== writeBrainId && !readBrainIds.includes(id)) readBrainIds.push(id)
  }
  let onBehalfId: string | null = null
  if (r.onBehalf) {
    const who = await ctx.db.one<{ id: string }>(
      `SELECT id FROM accounts WHERE (id = $1 OR email = lower($1)) AND kind = 'person' AND status = 'active'`,
      [r.onBehalf.trim()],
    )
    if (!who) {
      throw invalid(
        '"onBehalf" debe ser una cuenta de persona activa de esta instalación.',
        'Pasa el id o el correo de una cuenta real, u omítelo.',
      )
    }
    onBehalfId = who.id
  }
  if (readBrainIds.length > 0 && !onBehalfId) {
    throw invalid(
      'Una clave corta con brains de solo lectura debe decir en nombre de quién los lee.',
      'Pasa "onBehalf": la persona que lanzó el trabajo.',
    )
  }
  const now = ctx.clock()
  const minted = await insert(ctx.db, now, {
    accountId: ctx.who.accountId,
    kind: 'short',
    name: r.name?.trim().slice(0, 80) || ref.slice(0, 80),
    perm,
    writeBrainId,
    readBrainIds,
    ref,
    agent,
    onBehalfId,
    parentId: ctx.who.credential.id,
    expiresAt: new Date(now.getTime() + r.ttlMinutes * 60_000),
  })
  await ok(ctx, 'key.short.mint', writeBrainId, minted.id, ref)
  return { ...minted, writeBrainId }
}

// The owner of a key, or the administration, revokes it. Revoking a main key revokes every short key
// it minted, at once.
export async function revokeKey(ctx: Ctx, id: string): Promise<void> {
  const k = await ctx.db.one<{ account_id: string; parent_id: string | null; parent_account: string | null }>(
    `SELECT c.account_id, c.parent_id, p.account_id AS parent_account
       FROM credentials c LEFT JOIN credentials p ON p.id = c.parent_id WHERE c.id = $1`,
    [id],
  )
  // A short key only revokes itself; other keys of its service are out of its reach.
  const self = id === ctx.who.credential.id
  // An app's connection key and a narrowed token, too: they reach only their own brains, not the
  // person's other keys and sessions.
  const c = ctx.who.credential
  const whole =
    c.kind === 'web' || c.kind === 'main' || (c.kind === 'token' && c.allBrains && c.perm === 'write')
  const mine = k && whole && (k.account_id === ctx.who.accountId || k.parent_account === ctx.who.accountId)
  if (!k || !(self || mine || (ctx.who.isAdmin && ctx.who.kind === 'person'))) throw notFound('clave')
  if (ctx.who.credential.perm === 'read') {
    throw denied('Esta clave es de solo lectura.', 'Usa una clave con permiso de lectura y escritura.')
  }
  const now = ctx.clock()
  await ctx.db.query(
    'UPDATE credentials SET revoked_at = $2 WHERE (id = $1 OR parent_id = $1) AND revoked_at IS NULL',
    [id, now],
  )
  await ok(ctx, 'key.revoke', null, id)
}
