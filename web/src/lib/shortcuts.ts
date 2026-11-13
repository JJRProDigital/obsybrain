// The keyboard shortcuts of the web (spec B6 «Accesibilidad, teclado», CA20). Each names the visible
// control that does the same: a shortcut is a faster route, never the only one. The keymap is a small
// state machine, kept free of the DOM so it is tested on its own.
export type Shortcut = {
  id:
    | 'search'
    | 'help'
    | 'go-home'
    | 'go-overview'
    | 'go-wiki'
    | 'go-decisions'
    | 'go-log'
    | 'go-journal'
    | 'go-people'
    | 'go-proposals'
    | 'edit'
    | 'approve'
    | 'return'
  keys: string[]
  label: string
  // The visible control that does the same, as the person sees it.
  control: string
  // Only inside a brain.
  inBrain?: true
  // Only for whoever may invite people.
  invite?: true
}

export const SHORTCUTS: Shortcut[] = [
  {
    id: 'search',
    keys: ['⌘ K', 'Ctrl K'],
    label: 'Buscar en tus brains',
    control: 'El botón «Buscar» de la barra lateral',
  },
  {
    id: 'help',
    keys: ['?'],
    label: 'Mostrar esta lista',
    control: '«Ayuda» en la barra lateral, o «Atajos de teclado» en el menú de la cuenta',
  },
  {
    id: 'go-home',
    keys: ['g', 'h'],
    label: 'Ir al inicio',
    control: 'El logo arriba de la barra lateral, o «Todos los brains»',
  },
  {
    id: 'go-people',
    keys: ['g', 'p'],
    label: 'Ir a Personas',
    control: '«Personas» en la barra lateral o el menú de la cuenta',
    invite: true,
  },
  {
    id: 'go-overview',
    keys: ['g', 'o'],
    label: 'Ir al resumen de este brain',
    control: '«Resumen» en la barra lateral',
    inBrain: true,
  },
  {
    id: 'go-wiki',
    keys: ['g', 'w'],
    label: 'Ir a la wiki de este brain',
    control: '«Wiki» en la barra lateral',
    inBrain: true,
  },
  {
    id: 'go-decisions',
    keys: ['g', 'd'],
    label: 'Ir a las decisiones de este brain',
    control: '«Decisiones» en la barra lateral',
    inBrain: true,
  },
  {
    id: 'go-log',
    keys: ['g', 'l'],
    label: 'Ir al registro de la wiki de este brain',
    control: '«Registro» en la barra lateral',
    inBrain: true,
  },
  {
    id: 'go-journal',
    keys: ['g', 'j'],
    label: 'Ir al diario de este brain',
    control: '«Diario» en la barra lateral',
    inBrain: true,
  },
  {
    id: 'go-proposals',
    keys: ['g', 'r'],
    label: 'Ir a las propuestas por revisar de este brain',
    control: '«Propuestas» en la barra lateral',
    inBrain: true,
  },
  {
    id: 'approve',
    keys: ['a'],
    label: 'Aprobar todo en la propuesta que estás leyendo (curadores)',
    control: 'El botón «Aprobar todo» de la propuesta',
    inBrain: true,
  },
  {
    id: 'return',
    keys: ['r'],
    label: 'Devolver la propuesta que estás leyendo, con tu comentario (curadores)',
    control: 'El botón «Devolver» de la propuesta',
    inBrain: true,
  },
  {
    id: 'edit',
    keys: ['e'],
    label: 'Editar la página de la wiki que estás leyendo (curadores)',
    control: '«Editar» sobre la página',
    inBrain: true,
  },
]

export type KeyLike = { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; typing: boolean }

const SEQUENCE_MS = 1500
const GO: Record<string, Shortcut['id']> = {
  h: 'go-home',
  o: 'go-overview',
  w: 'go-wiki',
  d: 'go-decisions',
  l: 'go-log',
  j: 'go-journal',
  p: 'go-people',
  r: 'go-proposals',
}

export function createKeymap(now: () => number) {
  let leader: number | null = null
  return {
    handle(e: KeyLike): Shortcut['id'] | null {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if ((e.metaKey || e.ctrlKey) && !e.altKey && k === 'k') {
        leader = null
        return 'search'
      }
      if (e.typing || e.metaKey || e.ctrlKey || e.altKey) {
        leader = null
        return null
      }
      if (leader !== null && now() - leader <= SEQUENCE_MS && GO[k]) {
        leader = null
        return GO[k] ?? null
      }
      leader = k === 'g' ? now() : null
      if (e.key === '?') return 'help'
      if (k === 'e' && e.key === 'e') return 'edit'
      if (k === 'a' && e.key === 'a') return 'approve'
      if (k === 'r' && e.key === 'r') return 'return'
      return null
    },
  }
}
