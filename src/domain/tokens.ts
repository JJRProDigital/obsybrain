// Personal tokens (spec B4 «Tokens personales»): made in the profile, in the web. A name, brains (a list,
// or all of mine including later ones), read or read + write, and 30, 90 or 365 days. Seen once; after
// that only its last 4 characters, its last use and its client. A token never does more than the
// person's current role, checked on every request.
import { memberRole } from '../auth/principal.ts'
import { brainNotFound, invalid, notFound } from '../core/errors.ts'
import { endGrant } from './connections.ts'
import { type Ctx, ok } from './context.ts'
import { inWeb } from './guards.ts'
import { mintPersonToken } from './keys.ts'
import { EXPIRY_NOTICE_DAYS } from './notices.ts'
import { grantOnCreate, wikiWriteOf } from './wiki/writers.ts'

export const TOKEN_DAYS = [30, 90, 365] as const
export const ALL_BRAINS_NOTE =
  'Este token alcanza todos los brains de los que eres miembro, incluidos los que te sumes después.'

export async function createToken(
  ctx: Ctx,
  input: {
    name: unknown
    perm: unknown
    brains?: unknown
    allBrains?: unknown
    days?: unknown
    // The brains where it may write to the wiki directly (spec v0.6), each one where the person is a curator.
    wikiWrite?: unknown
  },
) {
  inWeb(ctx, 'Crear un token')
  if (ctx.who.kind !== 'person')
    throw invalid('Los tokens son de personas.', 'Usa una clave principal para un servicio.')
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name || name.length > 80) {
    throw invalid('Un token necesita un nombre de 1 a 80 caracteres.', 'Por ejemplo "Claude Code laptop".')
  }
  if (input.perm !== 'read' && input.perm !== 'write') {
    throw invalid('"perm" es "read" o "write" (lectura y escritura).', 'Elige uno.')
  }
  const days = input.days ?? 90
  if (!TOKEN_DAYS.includes(days as (typeof TOKEN_DAYS)[number])) {
    throw invalid('Un token dura 30, 90 o 365 días.', 'Elige uno de los tres (90 por defecto).')
  }
  const all = input.allBrains === true
  const slugs = input.brains
  if (all === (slugs !== undefined && slugs !== null)) {
    throw invalid(
      'Elige los brains del token: "brains" (una lista) o "allBrains": true.',
      'Envía uno de los dos.',
    )
  }
  const brainIds: string[] = []
  if (!all) {
    if (
      !Array.isArray(slugs) ||
      slugs.length === 0 ||
      slugs.length > 100 ||
      slugs.some((s) => typeof s !== 'string')
    ) {
      throw invalid('"brains" es una lista de 1 a 100 nombres de brain.', 'Envía ["slug", …].')
    }
    for (const slug of slugs as string[]) {
      const b = await ctx.db.one<{ id: string }>('SELECT id FROM brains WHERE slug = $1', [slug])
      if (!b || !(await memberRole(ctx.db, b.id, ctx.who.accountId))) throw brainNotFound()
      if (!brainIds.includes(b.id)) brainIds.push(b.id)
    }
  }
  const wikiWrite = input.wikiWrite ?? []
  if (!Array.isArray(wikiWrite) || wikiWrite.length > 100 || wikiWrite.some((s) => typeof s !== 'string')) {
    throw invalid('"wikiWrite" es una lista de nombres de brain.', 'Envía ["slug", …] u omítelo.')
  }
  const perm = input.perm
  const k = await ctx.db.tx(async (db) => {
    const c = { ...ctx, db }
    const k = await mintPersonToken(db, ctx.clock, {
      accountId: ctx.who.accountId,
      name,
      perm,
      ...(all ? { allBrains: true } : { brainIds }),
      days: days as number,
    })
    await ok(
      c,
      'token.create',
      null,
      k.id,
      `${name}, ${perm}, ${all ? 'all brains' : `${brainIds.length} brain(s)`}`,
    )
    await grantOnCreate(c, db, k.id, [...new Set(wikiWrite as string[])], { allBrains: all, brainIds, perm })
    return k
  })
  return {
    token: { id: k.id, secret: k.secret, last4: k.secret.slice(-4), expiresAt: k.expiresAt },
    message: 'Cópialo ahora: obsybrain lo muestra solo esta vez.',
    ...(all ? { note: ALL_BRAINS_NOTE } : {}),
  }
}

export async function listTokens(ctx: Ctx) {
  inWeb(ctx, 'Ver tus tokens')
  const now = ctx.clock()
  const rows = await ctx.db.query(
    `SELECT c.*, (SELECT coalesce(array_agg(b.slug ORDER BY b.slug), '{}') FROM brains b WHERE b.id = ANY(c.brain_ids)) AS slugs
       FROM credentials c
      WHERE c.account_id = $1 AND c.kind = 'token' AND c.revoked_at IS NULL
      ORDER BY (c.expires_at <= $2), c.created_at DESC`,
    [ctx.who.accountId, now],
  )
  const soon = now.getTime() + EXPIRY_NOTICE_DAYS * 86_400_000
  const writes = await wikiWriteOf(
    ctx.db,
    rows.map((k) => String(k.id)),
  )
  // Expired ones are listed too, marked (the profile groups them); revoked ones never.
  return rows.map((k) => ({
    id: String(k.id),
    expired: (k.expires_at as Date).getTime() <= now.getTime(),
    name: String(k.name),
    last4: String(k.last4),
    perm: String(k.perm),
    allBrains: Boolean(k.all_brains),
    brains: k.all_brains ? null : (k.slugs as string[]),
    createdAt: (k.created_at as Date).toISOString(),
    expiresAt: (k.expires_at as Date).toISOString(),
    expiresSoon: (k.expires_at as Date).getTime() <= soon,
    lastUsedAt: k.last_used_at == null ? null : (k.last_used_at as Date).toISOString(),
    lastClient: k.last_client == null ? null : String(k.last_client),
    wikiWrite: writes.get(String(k.id)) ?? [],
  }))
}

export async function revokeToken(ctx: Ctx, id: string) {
  inWeb(ctx, 'Revocar un token')
  const r = await ctx.db.one(
    `UPDATE credentials SET revoked_at = $3 WHERE id = $1 AND account_id = $2 AND kind = 'token'
      AND revoked_at IS NULL RETURNING id`,
    [id, ctx.who.accountId, ctx.clock()],
  )
  if (!r) throw notFound('token')
  await ok(ctx, 'token.revoke', null, id)
}

// «Revoke all tokens and apps» (profile): every personal token and every connected app of the person, in
// one transaction and one line of the audit. Web sessions stay (that is «sign out everywhere»).
export async function revokeAll(ctx: Ctx): Promise<{ tokens: number; apps: number }> {
  inWeb(ctx, 'Revocar tus tokens y apps')
  const now = ctx.clock()
  return ctx.db.tx(async (tx) => {
    const tokens = await tx.query(
      `UPDATE credentials SET revoked_at = $2 WHERE account_id = $1 AND kind = 'token' AND revoked_at IS NULL
        RETURNING id`,
      [ctx.who.accountId, now],
    )
    const grants = await tx.query(
      'SELECT id FROM oauth_grants WHERE account_id = $1 AND revoked_at IS NULL',
      [ctx.who.accountId],
    )
    for (const g of grants) await endGrant(tx, String(g.id), now)
    await ok(
      { ...ctx, db: tx },
      'keys.revoke_all',
      null,
      ctx.who.accountId,
      `${tokens.length} token(s), ${grants.length} app(s)`,
    )
    return { tokens: tokens.length, apps: grants.length }
  })
}
