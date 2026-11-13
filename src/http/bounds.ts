// Bounded answers (spec B5 «Respuestas acotadas»): no answer of the API or the MCP endpoint passes
// 256 000 characters. Lists already go by pages; an answer that would still pass the limit is cut, and
// the cut says so and how to ask for the rest.
export const MAX_REPLY_CHARS = 256_000

export const CUT_HOW =
  'Pide menos: un "limit" o "max" más chico, un filtro, o la página siguiente ("cursor", "offset" o "after").'

// The first `max` characters of a text, never half a character (a high surrogate at the cut goes too).
export function head(text: string, max: number): string {
  const cut = text.slice(0, max)
  return /[\ud800-\udbff]$/.test(cut) ? cut.slice(0, -1) : cut
}

// A JSON answer over the limit becomes a JSON answer within it: the notice, and as much of the
// original text as fits (the escaping of that text as a JSON string is counted too).
export function boundJson(text: string): { text: string; cut: boolean } {
  if (text.length <= MAX_REPLY_CHARS) return { text, cut: false }
  const cut = {
    at: MAX_REPLY_CHARS,
    chars: text.length,
    message: `Esta respuesta se cortó en ${MAX_REPLY_CHARS} caracteres; tenía ${text.length}.`,
    howToProceed: CUT_HOW,
  }
  let keep = MAX_REPLY_CHARS - JSON.stringify({ cut, partial: '' }).length
  for (;;) {
    const out = JSON.stringify({ cut, partial: head(text, keep) })
    if (out.length <= MAX_REPLY_CHARS) return { text: out, cut: true }
    keep -= out.length - MAX_REPLY_CHARS
  }
}
