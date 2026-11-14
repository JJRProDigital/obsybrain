// «Guía» (the manual): the markdown the manual is written in (web/src/screens/guia/*.md) travels inside
// the bundle and renders here. One page: the index first, then every section in order, each in a block
// with an anchor of its own, so a link inside the manual («04-propuestas.md») jumps in place. The
// screenshots load as pictures on this screen only (markdown.ts keeps every other body's image a link);
// the renderer demotes the manual's own headings beneath this screen's h1.
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

const INDEX = { ariaLabel: firstHeading(indiceBody), html: block(indiceBody) }
const PARTS = SECTIONS.map(([id, body]) => ({ id, title: firstHeading(body), html: block(body) }))

export function Guia() {
  return (
    <div class="guia">
      <div class="title-row">
        <div class="title-group">
          <h1 class="title">{T.guia.title}</h1>
        </div>
      </div>
      <p class="lead">{T.guia.lead}</p>
      <section id="seccion-indice" aria-label={INDEX.ariaLabel}>
        <div class="prose guia-prose" dangerouslySetInnerHTML={INDEX.html} />
      </section>
      {PARTS.map((part) => (
        <section key={part.id} id={`seccion-${part.id}`} aria-label={part.title}>
          <div class="prose guia-prose" dangerouslySetInnerHTML={part.html} />
        </section>
      ))}
    </div>
  )
}
