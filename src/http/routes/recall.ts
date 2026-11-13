import { invalid } from '../../core/errors.ts'
import {
  editEntry,
  forgetEntry,
  pinEntry,
  purgeEntry,
  recoverEntry,
  scheduleEntry,
} from '../../domain/curation.ts'
import { around, limitOf, listView, type View } from '../../domain/listing.ts'
import { conflicts, relate } from '../../domain/relations.ts'
import {
  INCLUDES,
  type Include,
  MAX_OFFSET,
  pageNeighbours,
  type SearchRequest,
  search,
} from '../../domain/search.ts'
import { CONTEXT, startContext } from '../../domain/startup.ts'
import { readTrail } from '../../domain/trail.ts'
import { compact, day, flag, int, type Obj, obj, reqStr, str, strList, upTo } from '../input.ts'
import { type Route, route } from '../router.ts'
import { ctxOf } from './brains.ts'

const q = (v: string | null) => (v === null || v === '' ? undefined : v)

// A date field that may be null to clear it.
function nullableDate(b: Obj, key: string): string | null | undefined {
  if (!(key in b)) return undefined
  if (b[key] === null) return null
  return str(b, key, { max: 40 })
}

// A comma-separated list; absent or empty is no list.
function list(v: string | null): string[] | undefined {
  const items = (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (items.length > 50) throw invalid('Una lista tiene como máximo 50 valores.', 'Pide menos.')
  return items.length > 0 ? items : undefined
}

export const recallRoutes: Route[] = [
  route('PATCH /v1/entries/:id', async (r) => {
    const b = obj(r.body)
    const entry = await editEntry(
      ctxOf(r),
      r.params.id as string,
      compact({
        baseRevision: int(b, 'baseRevision', { required: true, min: 1 }) as number,
        type: str(b, 'type', { max: 40 }),
        title: str(b, 'title'),
        content: str(b, 'content'),
        appliesTo: b.appliesTo === null ? null : str(b, 'appliesTo'),
        tags: strList(b, 'tags'),
        refs: strList(b, 'refs'),
      }),
    )
    return { body: { entry } }
  }),
  route('POST /v1/entries/:id/forget', async (r) => ({
    body: { entry: await forgetEntry(ctxOf(r), r.params.id as string, reqStr(obj(r.body), 'reason')) },
  })),
  route('POST /v1/entries/:id/recover', async (r) => ({
    body: { entry: await recoverEntry(ctxOf(r), r.params.id as string) },
  })),
  route('POST /v1/entries/:id/pin', async (r) => ({
    body: { entry: await pinEntry(ctxOf(r), r.params.id as string, true) },
  })),
  route('POST /v1/entries/:id/unpin', async (r) => ({
    body: { entry: await pinEntry(ctxOf(r), r.params.id as string, false) },
  })),
  route('POST /v1/entries/:id/schedule', async (r) => {
    const b = obj(r.body)
    const s = compact({
      reviewAfter: nullableDate(b, 'reviewAfter'),
      expiresAt: nullableDate(b, 'expiresAt'),
    })
    return { body: { entry: await scheduleEntry(ctxOf(r), r.params.id as string, s) } }
  }),
  route('POST /v1/entries/:id/purge', async (r) => ({
    body: await purgeEntry(ctxOf(r), r.params.id as string, reqStr(obj(r.body), 'reason')),
  })),
  route('GET /v1/entries/:id/around', async (r) => {
    const n = r.query.get('n') ? Number(r.query.get('n')) : 5
    if (!Number.isInteger(n) || n < 1 || n > 50) throw invalid('"n" debe estar entre 1 y 50.', 'Pide menos.')
    return { body: await around(ctxOf(r), r.params.id as string, n) }
  }),
  route('POST /v1/brains/:slug/relations', async (r) => {
    const b = obj(r.body)
    const rel = await relate(ctxOf(r), r.params.slug as string, {
      from: reqStr(b, 'from', 40),
      to: reqStr(b, 'to', 40),
      kind: reqStr(b, 'kind', 40),
      ...compact({ reason: str(b, 'reason') }),
    })
    return { status: 201, body: { relation: rel } }
  }),
  // Every open conflict; with "limit" (and "offset", the "next" of the page before), by pages.
  route('GET /v1/brains/:slug/conflicts', async (r) => {
    const limit = r.query.get('limit')
    const offset = r.query.get('offset') ? Number(r.query.get('offset')) : 0
    if (!Number.isInteger(offset) || offset < 0)
      throw invalid('"offset" es el valor "next" de la página anterior.', 'Úsalo sin cambiarlo.')
    return {
      body: await conflicts(
        ctxOf(r),
        r.params.slug as string,
        compact({ limit: limit === null || limit === '' ? undefined : limitOf(limit), offset }),
      ),
    }
  }),
  ...(['forgotten', 'to-review', 'uncompiled'] as View[]).map((view) =>
    route(`GET /v1/brains/:slug/${view}`, async (r) => ({
      body: await listView(
        ctxOf(r),
        r.params.slug as string,
        view,
        compact({ limit: limitOf(r.query.get('limit')), cursor: q(r.query.get('cursor')) }),
      ),
    })),
  ),
  route('GET /v1/search', async (r) => {
    const include = list(r.query.get('include'))
    const bad = include?.find((i) => !(INCLUDES as readonly string[]).includes(i))
    if (bad)
      throw invalid(`Valor "include" desconocido "${bad}".`, `Usa cualquiera de: ${INCLUDES.join(', ')}.`)
    const scope = q(r.query.get('in'))
    if (scope !== undefined && !['entries', 'pages', 'both'].includes(scope))
      throw invalid('"in" debe ser entries, pages o both.', 'Omite para buscar en ambos.')
    const brains = q(r.query.get('brains'))
    const offset = r.query.get('offset') ? Number(r.query.get('offset')) : 0
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET)
      throw invalid('"offset" debe ser de 0 a 10 000.', 'Usa el valor "next", o acota la búsqueda.')
    const limit = r.query.get('limit') ? Number(r.query.get('limit')) : 10
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw invalid('"limit" debe estar entre 1 y 50.', 'Pide menos.')
    // "type" (one) is kept from B1; "types" takes several.
    const types = list(r.query.get('types')) ?? list(r.query.get('type'))
    return {
      body: await search(
        ctxOf(r),
        compact({
          q: r.query.get('q') ?? '',
          in: scope as SearchRequest['in'],
          brains: brains && brains !== 'all' ? (list(brains) as string[]) : undefined,
          include: include as Include[] | undefined,
          types,
          tags: list(r.query.get('tags')),
          prefix: q(r.query.get('prefix')),
          from: day(r.query.get('from'), 'from'),
          ...upTo(day(r.query.get('to'), 'to'), r.query.get('to')),
          author: q(r.query.get('author')),
          client: q(r.query.get('client')),
          session: q(r.query.get('session')),
          ref: q(r.query.get('ref')),
          neighbours: flag(r.query.get('neighbours')),
          limit,
          offset,
        }),
      ),
    }
  }),
  route('GET /v1/brains/:slug/trail', async (r) => {
    const after = r.query.get('after')
    const n = after === null || after === '' ? undefined : Number(after)
    if (n !== undefined && (!Number.isSafeInteger(n) || n < 0))
      throw invalid('"after" es el valor "next" de la página anterior.', 'Úsalo sin cambiarlo.')
    return {
      body: await readTrail(
        ctxOf(r),
        r.params.slug as string,
        compact({
          ref: q(r.query.get('ref')),
          session: q(r.query.get('session')),
          page: q(r.query.get('page')),
          after: n,
          limit: limitOf(r.query.get('limit')),
        }),
      ),
    }
  }),
  route('GET /v1/brains/:slug/neighbours', async (r) => {
    const address = q(r.query.get('address'))
    if (!address) throw invalid('"address" es obligatorio.', 'Nombra la página, como "style/intros".')
    const hops = r.query.get('hops') ? Number(r.query.get('hops')) : 1
    if (hops !== 1 && hops !== 2) throw invalid('"hops" debe ser 1 o 2.', 'Pide 1 o 2.')
    const direction = q(r.query.get('direction')) ?? 'both'
    if (!['out', 'in', 'both'].includes(direction))
      throw invalid('"direction" debe ser out, in o both.', 'Omite para ambos.')
    return {
      body: await pageNeighbours(
        ctxOf(r),
        r.params.slug as string,
        address,
        compact({
          hops: hops as 1 | 2,
          direction: direction as 'out' | 'in' | 'both',
          kinds: list(r.query.get('kinds')),
        }),
      ),
    }
  }),
  route('GET /v1/brains/:slug/context', async (r) => {
    const max = r.query.get('max') ? Number(r.query.get('max')) : CONTEXT.default
    if (!Number.isSafeInteger(max))
      throw invalid(
        '"max" debe ser un número entero de caracteres.',
        `Usa de ${CONTEXT.min} a ${CONTEXT.max}.`,
      )
    return {
      body: await startContext(
        ctxOf(r),
        r.params.slug as string,
        compact({
          task: q(r.query.get('task')),
          agent: q(r.query.get('agent')),
          max,
          ref: q(r.query.get('ref')),
        }),
      ),
    }
  }),
]
