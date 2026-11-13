// Members of a brain (spec B4 «Roles y miembros»): a curator, or the administration, adds people who
// already have an account and service accounts, changes roles and removes members. A brain always keeps
// a curator; a service account is never one. A role change counts from the next request of that
// person and every key of theirs, because roles are looked up on every request.
import { atLeast, ROLES, type Role } from '../auth/can.ts'
import { memberRole } from '../auth/principal.ts'
import { AppError, brainNotFound, conflict, invalid, notFound } from '../core/errors.ts'
import type { Db } from '../db/db.ts'
import { addMember } from './brains.ts'
import { type Ctx, inBrain, ok } from './context.ts'
import { inWeb } from './guards.ts'
import { curatorsOf, notify } from './notices.ts'

export type Member = {
  accountId: string
  kind: 'person' | 'service'
  name: string
  email: string | null
  role: Role
  notifyProposals?: boolean
}
export type Former = { accountId: string; name: string; label: 'ex miembro' }

// Members as the brain's members see them, and the people who wrote here and are no longer members,
// so what they wrote still shows their name with «former member».
export async function listMembers(ctx: Ctx, slug: string) {
  const { brain, role } = await inBrain(ctx, { slug })
  const rows = await ctx.db.query(
    `SELECT m.account_id, m.role, m.notify_proposals, a.kind, a.name, a.email, a.status
       FROM memberships m JOIN accounts a ON a.id = m.account_id
      WHERE m.brain_id = $1 ORDER BY array_position(ARRAY['curator','contributor','reader'], m.role), lower(a.name)`,
    [brain.id],
  )
  const curator = atLeast(role, 'curator')
  const members: Member[] = []
  const former: Former[] = []
  for (const r of rows) {
    if (r.status !== 'active') {
      former.push({ accountId: String(r.account_id), name: String(r.name), label: 'ex miembro' })
      continue
    }
    members.push({
      accountId: String(r.account_id),
      kind: r.kind as Member['kind'],
      name: String(r.name),
      // Emails are for whoever manages the brain.
      email: curator && r.email != null ? String(r.email) : null,
      role: r.role as Role,
      ...(r.account_id === ctx.who.accountId ? { notifyProposals: Boolean(r.notify_proposals) } : {}),
    })
  }
  const authors = await ctx.db.query(
    `SELECT DISTINCT a.id, a.name FROM entries e JOIN accounts a ON a.id = e.author_id
      WHERE e.brain_id = $1 AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.brain_id = $1 AND m.account_id = a.id)`,
    [brain.id],
  )
  for (const a of authors) former.push({ accountId: String(a.id), name: String(a.name), label: 'ex miembro' })
  // Whose email is pending is for curators; the others see only that one is.
  const pending = brain.pendingCuratorEmail
  return { members, former, pendingCurator: curator ? pending : pending !== null }
}

// Who manages the members of this brain: its curators, and the administration (which does not need to
// be a member to manage who is in it; reading it does need that).
async function manager(ctx: Ctx, db: Db, slug: string): Promise<{ brainId: string; asCurator: boolean }> {
  inWeb(ctx, 'Cambiar quién está en un brain')
  const b = await db.one<{ id: string }>('SELECT id FROM brains WHERE slug = $1 FOR UPDATE', [slug])
  if (!b) throw brainNotFound()
  const role = await memberRole(db, b.id, ctx.who.accountId)
  const admin = ctx.who.isAdmin && ctx.who.kind === 'person'
  if (atLeast(role, 'curator')) return { brainId: b.id, asCurator: true }
  if (admin) return { brainId: b.id, asCurator: false }
  if (!role) throw brainNotFound()
  throw new AppError(
    403,
    'forbidden',
    `Solo los curadores de "${slug}" cambian sus miembros; tú eres ${role}.`,
    'Pídeselo a quien cure el brain.',
  )
}

async function lastCuratorCheck(db: Db, brainId: string, accountId: string, slug: string) {
  const r = await db.one<{ n: number }>(
    `SELECT count(*)::int AS n FROM memberships m JOIN accounts a ON a.id = m.account_id
      WHERE m.brain_id = $1 AND m.role = 'curator' AND a.status = 'active' AND m.account_id <> $2`,
    [brainId, accountId],
  )
  if ((r?.n ?? 0) === 0) {
    throw conflict(
      'last_curator',
      `Esta es la última persona curadora de "${slug}"; un brain siempre conserva una.`,
      'Nombra curador primero a otro miembro y luego cambia este.',
    )
  }
}

async function accountOf(db: Db, ref: unknown) {
  const v = typeof ref === 'string' ? ref.trim() : ''
  if (!v || v.length > 320)
    throw invalid('"account" es un id de cuenta o un correo.', 'Indica a quién añadir.')
  const a = await db.one<{ id: string; kind: string; name: string; status: string }>(
    "SELECT id, kind, name, status FROM accounts WHERE kind <> 'author' AND (id = $1 OR (email IS NOT NULL AND email = lower($1)))",
    [v],
  )
  if (!a) {
    throw invalid(
      'No hay ninguna cuenta con ese id o correo.',
      'Solo se puede añadir a quien ya tenga cuenta; las nuevas las invita la administración.',
    )
  }
  if (a.status !== 'active') {
    throw invalid('Esa cuenta está desactivada.', 'La administración puede reactivarla primero.')
  }
  return a
}

// `adding`: the add form (POST): someone already in the brain is refused, so adding never changes a role
// (yours included); roles change through the role route (PUT).
export async function setMember(
  ctx: Ctx,
  slug: string,
  input: { account: unknown; role: unknown },
  adding = false,
) {
  if (!ROLES.includes(input.role as Role)) {
    throw invalid('"role" es curator, contributor o reader.', 'Elige uno de los tres.')
  }
  const role = input.role as Role
  const out = await ctx.db.tx(async (db) => {
    const c = { ...ctx, db }
    const { brainId, asCurator } = await manager(c, db, slug)
    const a = await accountOf(db, input.account)
    if (a.kind === 'service' && role === 'curator') {
      throw invalid('Una cuenta de servicio nunca es curadora.', 'Dale el rol contributor o reader.')
    }
    const before = await db.one<{ role: Role }>(
      'SELECT role FROM memberships WHERE brain_id = $1 AND account_id = $2',
      [brainId, a.id],
    )
    if (adding && before) {
      throw conflict(
        'already_member',
        `${a.name} ya es ${before.role} de "${slug}" — cambia su rol en la lista.`,
        `Cambia el rol con PUT /v1/brains/${slug}/members/${a.id}.`,
      )
    }
    if (before?.role === 'curator' && role !== 'curator') await lastCuratorCheck(db, brainId, a.id, slug)
    await addMember(db, brainId, a.id, role, ctx.clock())
    if (role === 'curator') {
      // Naming a curator ends the wait for a pending one.
      await db.query('UPDATE brains SET pending_curator_email = NULL WHERE id = $1', [brainId])
    }
    await ok(
      c,
      before ? 'member.role' : 'member.add',
      brainId,
      a.id,
      `${before?.role ?? 'none'} -> ${role}${asCurator ? '' : ', by the administration'}`,
    )
    return { brainId, a, asCurator, before: before?.role ?? null }
  })
  // The administration adding a service account to a brain is told to its curators.
  if (out.a.kind === 'service' && !out.asCurator && !out.before) {
    await notify(ctx.db, ctx.clock, ctx.mail, await curatorsOf(ctx.db, out.brainId), {
      kind: 'service.added',
      brainId: out.brainId,
      subject: `Una cuenta de servicio entró en "${slug}"`,
      text: `La administración (${ctx.who.name}) añadió la cuenta de servicio "${out.a.name}" a "${slug}" como ${role}.`,
    })
  }
  // The administration making itself a member is the same as joining: its curators see it.
  if (out.a.id === ctx.who.accountId && !out.asCurator && !out.before) {
    await notify(ctx.db, ctx.clock, ctx.mail, await curatorsOf(ctx.db, out.brainId), {
      kind: 'admin.joined',
      brainId: out.brainId,
      subject: `La administración entró en "${slug}"`,
      text: `${ctx.who.name} (administración) entró en "${slug}" como ${role}.`,
    })
  }
  return { accountId: out.a.id, name: out.a.name, role }
}

export async function removeMember(ctx: Ctx, slug: string, accountId: string) {
  await ctx.db.tx(async (db) => {
    const c = { ...ctx, db }
    const self = accountId === ctx.who.accountId
    let brainId: string
    if (self) {
      // Anyone can leave a brain.
      inWeb(ctx, 'Salir de un brain')
      const b = await db.one<{ id: string }>('SELECT id FROM brains WHERE slug = $1 FOR UPDATE', [slug])
      if (!b) throw brainNotFound()
      brainId = b.id
    } else brainId = (await manager(c, db, slug)).brainId
    const before = await db.one<{ role: Role }>(
      'SELECT role FROM memberships WHERE brain_id = $1 AND account_id = $2',
      [brainId, accountId],
    )
    if (!before) throw notFound('miembro')
    if (before.role === 'curator') await lastCuratorCheck(db, brainId, accountId, slug)
    await db.query('DELETE FROM memberships WHERE brain_id = $1 AND account_id = $2', [brainId, accountId])
    await ok(c, 'member.remove', brainId, accountId, `was ${before.role}`)
  })
}

// A curator chooses whether new proposals in this brain reach them by mail.
export async function setNotify(ctx: Ctx, slug: string, on: boolean) {
  inWeb(ctx, 'Elegir los avisos')
  const { brain, role } = await inBrain(ctx, { slug })
  if (!atLeast(role, 'curator')) {
    throw invalid(
      'Solo quienes curan reciben avisos de propuestas nuevas.',
      'Pídeselo a quien cure el brain.',
    )
  }
  await ctx.db.query('UPDATE memberships SET notify_proposals = $3 WHERE brain_id = $1 AND account_id = $2', [
    brain.id,
    ctx.who.accountId,
    on,
  ])
  return { notifyProposals: on }
}
