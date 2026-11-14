// The body of a wiki page, from markdown to HTML (spec B6 «Wiki › Page»; plan §2 and risk 5). Bodies are
// written by agents, and the web session can approve proposals, so nothing in a body may run: raw HTML is
// off (it shows as text), links go only to http, https, mailto or an address inside the web, a link that
// leaves the web opens in a new tab without telling the other site where it came from, and an image is a
// link to it (never loaded into the page) — except the manual (/guia, renderGuide), whose screenshots
// load themselves from /guia-assets/. A [[mention]] links to the page it names; one that names no
// page, or a retired or superseded one, looks different and says so in words, not only in colour.
import MarkdownIt from 'markdown-it'

// The same rule as the server's (src/domain/wiki/model.ts): lowercase words, hyphens, levels split by "/".
export const ADDRESS = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/
export const isAddress = (a: string) => a.length <= 200 && ADDRESS.test(a)

export type MentionState = 'ok' | 'broken' | 'stale' | 'retired' | 'superseded'
export type LinkLike = { kind: string; address: string; state: MentionState; title?: string | null }

// Where a link may lead. Anything else (javascript:, data:, a protocol-relative "//host", a bare word)
// is dropped and its text stays.
export function safeHref(href: string): boolean {
  if (/^https?:\/\/[^\s/]/i.test(href)) return true
  if (/^mailto:[^\s]/i.test(href)) return true
  if (href.startsWith('#')) return true
  // Inside the web: a path, never "//host" or "/\host" (some browsers read either as another site).
  return /^\/(?![/\\]|%5c)/i.test(href)
}
const leaves = (href: string) => /^(https?:|mailto:)/i.test(href)

export const pageHref = (slug: string, address: string) =>
  `/b/${encodeURIComponent(slug)}/pages/${address.split('/').map(encodeURIComponent).join('/')}`

const NOTE: Record<Exclude<MentionState, 'ok'>, string> = {
  broken: 'todavía sin página',
  stale: 'desactualizada',
  retired: 'retirada',
  superseded: 'reemplazada',
}

type Env = { slug: string; states: Map<string, MentionState>; titles: Map<string, string> }
type Parser = InstanceType<typeof MarkdownIt>

function build(o: { guide?: boolean }): Parser {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false })
  // The manual's own links go by file name («03-diario.md»): the guide's link check takes those names
  // (the guia_links rule then rewrites them to their section's anchor), every other address as ever.
  md.validateLink = o.guide ? (href) => /^(\d\d-[a-z-]+|indice)\.md$/.test(href) || safeHref(href) : safeHref
  const esc = md.utils.escapeHtml

  // [[address]] and [[address|text]], as the server reads mentions. The manual's body documents the
  // syntax instead of using it (its own links go by file name), so its parser carries no mention rule:
  // a `[[x]]` quoted in its code spans must stay words, never a link into a wiki.
  if (!o.guide) {
    md.inline.ruler.before('link', 'wikilink', (state, silent) => {
      const { src, pos } = state
      if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false
      const end = src.indexOf(']]', pos + 2)
      if (end < 0) return false
      const inner = src.slice(pos + 2, end)
      if (inner.length > 501 || /[\n\]]/.test(inner)) return false
      const bar = inner.indexOf('|')
      const address = (bar < 0 ? inner : inner.slice(0, bar)).trim()
      if (!isAddress(address)) return false
      if (!silent) {
        const t = state.push('wikilink', 'a', 0)
        t.meta = { address, text: bar < 0 ? '' : inner.slice(bar + 1).trim() }
      }
      state.pos = end + 2
      return true
    })
    md.renderer.rules.wikilink = (tokens, idx, _o, e) => {
      const env = e as Env
      const meta = (tokens[idx]?.meta ?? {}) as { address: string; text: string }
      const { address, text } = meta
      // An address the page does not list resolved to a page under its current address: it works.
      const state = env.states.get(address) ?? 'ok'
      const cls = state === 'ok' ? 'wikilink' : `wikilink ${state}`
      const note = state === 'ok' ? '' : `<span class="link-note"> (${NOTE[state]})</span>`
      // The page's title reads better than its address; the address shows on hover.
      const shown = text || env.titles.get(address) || address
      return `<a href="${esc(pageHref(env.slug, address))}" class="${cls}" title="${esc(address)}">${esc(shown)}${note}</a>`
    }
  }

  // A link whose address was refused keeps its words and loses its link.
  md.core.ruler.push('drop_unsafe_links', (state) => {
    for (const block of state.tokens) {
      if (!block.children) continue
      const out: typeof block.children = []
      const dropped: boolean[] = []
      for (const t of block.children) {
        if (t.type === 'link_open') {
          const bad = !safeHref(String(t.attrGet('href') ?? ''))
          dropped.push(bad)
          if (bad) continue
        } else if (t.type === 'link_close') {
          if (dropped.pop()) continue
        }
        out.push(t)
      }
      block.children = out
    }
  })
  md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
    const t = tokens[idx]
    if (t && leaves(String(t.attrGet('href') ?? ''))) {
      t.attrSet('target', '_blank')
      t.attrSet('rel', 'noopener noreferrer')
    }
    return self.renderToken(tokens, idx, options)
  }
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const t = tokens[idx]
    const alt = esc(self.renderInlineAsText(t?.children ?? [], options, env))
    const src = String(t?.attrGet('src') ?? '')
    if (!safeHref(src)) return alt
    const out = leaves(src) ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${esc(src)}"${out}>Image: ${alt}</a>`
  }
  if (o.guide) {
    // A link to another part of the manual («03-diario.md») anchors to that section's block on this
    // one page; «indice.md» anchors to the index. Run before the link drop, or these would be lost.
    md.core.ruler.before('drop_unsafe_links', 'guia_links', (state) => {
      for (const block of state.tokens) {
        if (!block.children) continue
        for (const t of block.children) {
          if (t.type !== 'link_open') continue
          const m = /^(\d\d-[a-z-]+|indice)\.md$/.exec(String(t.attrGet('href') ?? ''))
          if (m?.[1]) t.attrSet('href', `#seccion-${m[1]}`)
        }
      }
    })
    // The page already has its own h1 (the screen's «Guía»); the manual's sections open one level down.
    md.core.ruler.push('guia_headings', (state) => {
      for (const t of state.tokens) {
        if (t.type !== 'heading_open') continue
        const h = /^h([1-5])$/.exec(t.tag)
        if (h) t.tag = `h${Number(h[1]) + 1}`
      }
    })
    // Its images load themselves: the manual's screenshots live beside it at /guia-assets/, and never
    // anywhere else. A source the manual should not load stays a link, as on a wiki page.
    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const t = tokens[idx]
      const alt = esc(self.renderInlineAsText(t?.children ?? [], options, env))
      const src = String(t?.attrGet('src') ?? '')
      if (!safeHref(src)) return alt
      if (/^\/guia-assets\//.test(src)) return `<img src="${esc(src)}" alt="${alt}" loading="lazy">`
      return `<a href="${esc(src)}">Image: ${alt}</a>`
    }
    // A block of code wider than the column scrolls; a keyboard user must be able to reach it (the axe
    // audit's scrollable-region-focusable, axe.spec).
    md.renderer.rules.fence = (tokens, idx) => {
      const t = tokens[idx]
      const info = t?.info ? md.utils.unescapeAll(t.info).trim() : ''
      const lang = info.split(/\s+/g)[0] ?? ''
      const cls = lang ? ` class="language-${esc(lang)}"` : ''
      return `<pre tabindex="0"><code${cls}>${esc(t?.content ?? '')}</code></pre>\n`
    }
  }
  return md
}

let parser: Parser | null = null

// The manual's parser: same safety, no mentions, its own links and images (see the rules above).
let guideParser: Parser | null = null
export function renderGuide(body: string): string {
  guideParser ??= build({ guide: true })
  return guideParser.render(body, { slug: 'guia', states: new Map(), titles: new Map() } satisfies Env)
}

export function renderMarkdown(body: string, o: { slug: string; links: readonly LinkLike[] }): string {
  parser ??= build({})
  const states = new Map<string, MentionState>()
  const titles = new Map<string, string>()
  for (const l of o.links) {
    if (l.kind !== 'mentions') continue
    states.set(l.address, l.state)
    if (l.title) titles.set(l.address, l.title)
  }
  return parser.render(body, { slug: o.slug, states, titles } satisfies Env)
}

// Markdown as plain words (a search snippet): no marks, links as their text, one line. An underscore is
// a mark only at the edge of a word, as markdown reads it: past_due and stripe_invoice_id keep theirs. The
// text of a code span is kept as written (`_id`, `__init__`), without its backticks.
export function plainText(md: string): string {
  const code: string[] = []
  // Code spans are set aside first (a run of backticks closed by the same run), then put back verbatim.
  const marked = md.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_m, _ticks, inner: string) => {
    code.push(inner.replace(/\n/g, ' ').replace(/^ (.*[^ ].*) $/, '$1'))
    return `\uE000${code.length - 1}\uE000`
  })
  return marked
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|\n]+)\|([^\]\n]*)\]\]/g, '$2')
    .replace(/\[\[([^\]\n]+)\]\]/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/gm, '')
    .replace(/(\*\*|\*|`+|~~)/g, '')
    .replace(/(^|[^\p{L}\p{N}_])_{1,2}|_{1,2}(?![\p{L}\p{N}_])/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\uE000(\d+)\uE000/g, (_m, n: string) => code[Number(n)] ?? '')
}
