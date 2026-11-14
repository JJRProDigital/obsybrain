// «Guía» (the manual): the markdown the manual is written in (web/src/screens/guia/*.md) travels inside
// the bundle and renders here, one section at a time: a list of the manual's parts (the pane on the
// left, a strip of chips on a phone) beside the active section. An entry of the list, a link inside the
// manual («04-propuestas.md», which the renderer rewrites to its section's anchor — «Siguiente →») and
// the address's hash (/guia#seccion-07-agente) all open their section; the hash is written back as the
// source of truth. The screenshots load as pictures on this screen only (markdown.ts keeps every other
// body's image a link); the renderer demotes the manual's own headings beneath this screen's h1.
import { useEffect, useRef, useState } from 'preact/hooks'
import { renderGuide } from '../lib/markdown.ts'
import { T } from '../text.ts'
import body00 from './guia/00-empezar.md?raw'
import body01 from './guia/01-brains.md?raw'
import body02 from './guia/02-wiki.md?raw'
import body03 from './guia/03-diario.md?raw'
import body04 from './guia/04-propuestas.md?raw'
import body05 from './guia/05-salud-actividad.md?raw'
import body06 from './guia/06-personas-claves.md?raw'
import body07 from './guia/07-agente.md?raw'
import body08 from './guia/08-administracion.md?raw'
import body09 from './guia/09-ajustes-brain.md?raw'
import body10 from './guia/10-busqueda-atajos.md?raw'
import indiceBody from './guia/indice.md?raw'

// Each file's first «# heading» names its section; the body is rendered whole, demoted one level.
const SECTIONS: Array<readonly [id: string, body: string]> = [
  ['00-empezar', body00],
  ['01-brains', body01],
  ['02-wiki', body02],
  ['03-diario', body03],
  ['04-propuestas', body04],
  ['05-salud-actividad', body05],
  ['06-personas-claves', body06],
  ['07-agente', body07],
  ['08-administracion', body08],
  ['09-ajustes-brain', body09],
  ['10-busqueda-atajos', body10],
]

const firstHeading = (body: string): string => (/^# (.+)$/m.exec(body)?.[1] ?? '').trim()
const block = (body: string) => ({ __html: renderGuide(body) })

const INDEX_ID = 'indice'
const INDEX = { title: firstHeading(indiceBody), html: block(indiceBody) }
const PARTS = SECTIONS.map(([id, body]) => ({ id, title: firstHeading(body), html: block(body) }))
const ENTRIES = [
  { id: INDEX_ID, label: T.guia.backToIndex },
  ...PARTS.map((p) => ({ id: p.id, label: p.title })),
]

// Where the manual opens: the hash's section («#seccion-07-agente»), or the index for «/guia» bare
// (or any hash that names no part). An anchor link inside the manual has already been rewritten to
// «#seccion-…», so the same name turns the page once it is on the screen.
const fromHash = (): string => {
  const id = /^#seccion-(.+)$/.exec(window.location.hash)?.[1] ?? ''
  if (id === INDEX_ID || PARTS.some((p) => p.id === id)) return id
  return INDEX_ID
}

export function Guia() {
  const [active, setActive] = useState<string>(fromHash)
  // The link that opened the active section dies with the section it sat in («Siguiente →»): the
  // keyboard goes to the section it opened instead of falling to the page.
  const take = useRef(false)
  const pane = useRef<HTMLDivElement>(null)
  const drawn = useRef(false)

  const open = (id: string, fromContent: boolean) => {
    if (id === active) return
    take.current = fromContent
    setActive(id)
    history.replaceState(null, '', `#seccion-${id}`)
  }

  useEffect(() => {
    if (!drawn.current) {
      drawn.current = true
      return
    }
    if (take.current) {
      take.current = false
      document.getElementById(`seccion-${active}`)?.focus()
    }
    // A new section starts at its top, whoever opened it.
    pane.current?.scrollIntoView()
  }, [active])

  // The manual's own anchors already read «#seccion-…» (markdown.ts); one that points at another part
  // of the manual opens it here instead of hunting an anchor that may not be on this screen.
  const turn = (e: MouseEvent) => {
    const a = e.target instanceof Element ? e.target.closest('a') : null
    if (!a) return
    const href = a.getAttribute('href') ?? ''
    if (!href.startsWith('#seccion-')) return
    e.preventDefault()
    open(href.slice('#seccion-'.length), true)
  }

  const part = active === INDEX_ID ? INDEX : (PARTS.find((p) => p.id === active) ?? INDEX)
  return (
    <div class="guia">
      <div class="title-row">
        <div class="title-group">
          <h1 class="title">{T.guia.title}</h1>
        </div>
      </div>
      <p class="lead">{T.guia.lead}</p>
      <div class="guia-layout">
        <nav class="guia-nav" aria-label={T.guia.sections}>
          <ul class="guia-nav-list">
            {ENTRIES.map((e) => (
              <li key={e.id}>
                <a
                  href={`#seccion-${e.id}`}
                  aria-current={e.id === active ? 'page' : undefined}
                  onClick={(ev) => {
                    ev.preventDefault()
                    open(e.id, false)
                  }}
                >
                  {e.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the pane is never a control; it only catches the manual's own section anchors, which are links the keyboard already reaches */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: the anchors carry the keyboard themselves; the click is a delegation so «Siguiente →» turns the page */}
        <div class="guia-pane" ref={pane} onClick={turn}>
          <section id={`seccion-${active}`} tabIndex={-1} aria-label={part.title}>
            <div class="prose guia-prose" dangerouslySetInnerHTML={part.html} />
          </section>
        </div>
      </div>
    </div>
  )
}
