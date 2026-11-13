// The one place that decides who may do what in a brain. Every route asks here; nothing else grants
// access. Pure: it receives the facts (role already narrowed by the key, ownership, brain status).
export const ROLES = ['reader', 'contributor', 'curator'] as const
export type Role = (typeof ROLES)[number]
export type CredentialKind = 'token' | 'main' | 'short' | 'web' | 'app'

export const rank = (r: Role | null): number => (r === null ? 0 : ROLES.indexOf(r) + 1)
export const atLeast = (r: Role | null, min: Role): boolean => rank(r) >= rank(min)
export const minRole = (a: Role | null, b: Role | null): Role | null => (rank(a) <= rank(b) ? a : b)

export type Actor = {
  kind: 'person' | 'service'
  isAdmin: boolean
  canCreateBrains: boolean
  credential: { kind: CredentialKind; perm: 'read' | 'write' }
}

export type Action =
  | 'brain.create'
  | 'brain.read'
  | 'brain.export'
  | 'brain.import'
  | 'brain.archive'
  | 'brain.delete'
  | 'journal.write'
  | 'entry.edit'
  | 'entry.forget'
  | 'entry.pin'
  | 'entry.purge'
  | 'relation.write'
  | 'relation.decide'
  | 'correction.relay'
  | 'correction.write'
  | 'key.short'
  | 'wiki.propose'
  | 'wiki.decide'

export type Facts = {
  role?: Role | null // the actor's role in the brain, already narrowed by its key
  brainStatus?: 'active' | 'archived'
  isOwner?: boolean // the actor wrote the entry (for relation.decide: the one superseded or dismissed)
  onBehalfRole?: Role | null // correction.relay: the role of the person the service speaks for
}

export type Decision = { ok: true } | { ok: false; reason: string; howToProceed: string }

const OK: Decision = { ok: true }
const no = (reason: string, howToProceed: string): Decision => ({ ok: false, reason, howToProceed })

const READ_ONLY = no(
  'Esta clave es de solo lectura.',
  'Usa una clave con permiso de lectura y escritura, o crea una en tu perfil.',
)
const ARCHIVED = no(
  'Este brain está archivado, así que es de solo lectura.',
  'Quien cure el brain puede desarchivarlo (POST /v1/brains/:slug/unarchive).',
)

function needRole(role: Role | null | undefined, min: Role): Decision {
  if (atLeast(role ?? null, min)) return OK
  return no(
    `Esto necesita el rol ${min} en el brain; ${role ? `tú eres ${role}` : 'tú no eres miembro'}.`,
    `Pide el rol ${min} a quien cure el brain.`,
  )
}

export function can(actor: Actor, action: Action, f: Facts = {}): Decision {
  const writes = action !== 'brain.read'
  if (writes && actor.credential.perm === 'read') return READ_ONLY
  switch (action) {
    case 'brain.read':
      return needRole(f.role, 'reader')
    case 'brain.create':
      if (actor.credential.kind === 'short') {
        return no(
          'Una clave corta no puede crear brains.',
          'Usa la clave principal de la cuenta de servicio.',
        )
      }
      if (actor.isAdmin || actor.canCreateBrains) return OK
      return no(
        'No tienes permiso para crear brains.',
        'Pide a la administración de esta instalación el permiso "can create brains".',
      )
    case 'brain.archive':
    case 'brain.export':
      return needRole(f.role, 'curator')
    // Filling an empty brain from a folder or an export (spec B7): its curators, while it is not archived.
    case 'brain.import': {
      const r = needRole(f.role, 'curator')
      if (!r.ok) return r
      return f.brainStatus === 'archived' ? ARCHIVED : OK
    }
    case 'brain.delete':
      if (actor.isAdmin && actor.kind === 'person') return OK
      return no(
        'Solo la administración puede eliminar un brain.',
        'Pídeselo a la administración de esta instalación.',
      )
    case 'journal.write':
    case 'relation.write':
    case 'wiki.propose': {
      const r = needRole(f.role, 'contributor')
      if (!r.ok) return r
      return f.brainStatus === 'archived' ? ARCHIVED : OK
    }
    case 'entry.edit':
    case 'entry.forget': {
      if (f.brainStatus === 'archived') return ARCHIVED
      if (atLeast(f.role ?? null, 'curator')) return OK
      if (f.isOwner && atLeast(f.role ?? null, 'contributor')) return OK
      return no(
        'Solo el autor de una entrada o quien cure el brain puede cambiarla.',
        'Pídeselo a quien cure el brain, o escribe una entrada nueva.',
      )
    }
    // A person, in the web, superseding an entry or dismissing a correction decides about someone's word:
    // the rule of forgetting — its author or a curator (spec B1; review of PR20). Saying two entries
    // contradict each other stays open to every contributor.
    case 'relation.decide': {
      if (f.brainStatus === 'archived') return ARCHIVED
      if (atLeast(f.role ?? null, 'curator')) return OK
      if (f.isOwner && atLeast(f.role ?? null, 'contributor')) return OK
      return no(
        'Solo el autor de una entrada o quien cure el brain puede reemplazarla, o descartarla cuando es una corrección.',
        'Pídeselo a quien cure el brain, o marca que las dos entradas se contradicen.',
      )
    }
    case 'wiki.decide':
    case 'entry.pin': {
      const r = needRole(f.role, 'curator')
      if (!r.ok) return r
      return f.brainStatus === 'archived' ? ARCHIVED : OK
    }
    case 'entry.purge':
      if (actor.isAdmin && actor.kind === 'person') return OK
      return no(
        'Solo la administración puede purgar.',
        'Pídeselo a la administración, u olvida la entrada en su lugar.',
      )
    case 'correction.relay': {
      if (actor.kind !== 'service' || actor.credential.kind !== 'main') {
        return no(
          'Los agentes no pueden escribir correcciones; solo las personas.',
          'Guárdala como entrada de tipo "learning" o "preference".',
        )
      }
      const r = needRole(f.role, 'contributor')
      if (!r.ok) return r
      if (f.brainStatus === 'archived') return ARCHIVED
      if (!atLeast(f.onBehalfRole ?? null, 'contributor')) {
        return no(
          'Una corrección debe hablar por una persona que sea contributor o curadora del brain.',
          'Retransmítela en nombre de un miembro con ese rol, o pide a un curador que añada a esa persona.',
        )
      }
      return OK
    }
    // A person's correction, written by that person in the web (spec B1: every key is an agent's).
    case 'correction.write': {
      if (actor.kind !== 'person' || actor.credential.kind !== 'web') {
        return no(
          'Las correcciones son la palabra de una persona, escrita por ella en la web; los agentes no pueden escribirlas.',
          'Guárdala como entrada de tipo "learning" o "preference", o pide a una persona que añada la corrección en la web de obsybrain.',
        )
      }
      const r = needRole(f.role, 'contributor')
      if (!r.ok) return r
      return f.brainStatus === 'archived' ? ARCHIVED : OK
    }
    case 'key.short':
      if (actor.kind === 'service' && actor.credential.kind === 'main') return OK
      return no(
        'Solo una cuenta de servicio puede acuñar claves cortas, con su clave principal.',
        'Usa la clave principal.',
      )
  }
}
