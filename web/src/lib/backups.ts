// The logic of Admin › Backups & system and of the wizard's step «Installation key» (spec B7 «Copias y
// restauración», plan §3.4; PR30), out of the screens so it is tested on its own: a failure and a warning in words,
// the band of the administration until a good copy, why a copy cannot be restored here, the name to type before a
// restore, and the file the installation key is saved in. Who may do what is the server's.

const FAILURES: Record<string, string> = {
  disk_full: 'el disco de las copias está lleno',
  no_permission: 'obsybrain no puede escribir en la carpeta de las copias',
  no_installation_secret: 'la instalación no tiene clave (OBSY_BRAIN_SECRET no está configurada)',
  weak_installation_key: 'la clave de instalación es demasiado corta para proteger una copia',
  database: 'la base de datos no respondió como se esperaba',
  busy: 'había escrituras corriendo después de un minuto',
  failed: 'falló',
}
const HOW: Record<string, string> = {
  disk_full: 'Libera espacio en la carpeta de las copias, o conserva menos, y haz una copia otra vez.',
  no_permission:
    'Permite que el usuario que corre obsybrain escriba en la carpeta de las copias, y haz una copia otra vez.',
  no_installation_secret:
    'Configura OBSY_BRAIN_SECRET para el servicio, reinícialo, y haz una copia otra vez.',
  weak_installation_key: 'Rota a una clave larga y aleatoria en la máquina (obsybrain.sh key rotate).',
  database: 'Haz una copia otra vez; si falla otra vez, mira el log del servicio.',
  busy: 'Haz una copia otra vez en unos minutos.',
  failed: 'Haz una copia otra vez; si falla otra vez, mira el log del servicio.',
}

// Why the last copy failed, in words; an unknown category still says it failed.
export function failureText(category: string): string {
  const why = FAILURES[category] ?? FAILURES.failed
  return `La última copia falló: ${why}. ${HOW[category] ?? HOW.failed}`
}

const WARNINGS: Record<string, string> = {
  fsync_failed: 'no se pudo vaciar la carpeta al disco',
  status_not_saved: 'no se pudo guardar su estado junto a las copias',
  disk_full: 'el disco de las copias se llenó justo después',
  no_permission: 'obsybrain no pudo escribir su estado en la carpeta de las copias',
}

// A copy kept whole, but with something after it not done.
export function warningText(code: string): string {
  return `Una copia se conservó completa, pero ${WARNINGS[code] ?? 'algo posterior no se hizo'}. Revisa el disco de las copias.`
}

const REASONS: Record<string, string> = {
  scheduled: 'Diaria',
  manual: 'A mano',
  'pre-update': 'Antes de una actualización',
  'pre-restore': 'Antes de una restauración',
}
export const reasonLabel = (reason: string) => REASONS[reason] ?? reason

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}

type Ok = { at: string; file: string } | null
type Failure = { at: string; category: string } | null

// The band at the top of the administration: the last failure, until a good copy is made after it.
export function bandOf(s: { lastOk: Ok; lastFailure: Failure } | undefined): Failure {
  if (!s?.lastFailure) return null
  if (s.lastOk && s.lastOk.at > s.lastFailure.at) return null
  return s.lastFailure
}

// Why this copy cannot be restored from here now, or null.
export function restoreBlocked(
  item: { needsOldKey: boolean },
  o: { running: boolean; online: boolean },
): string | null {
  if (!o.online) return 'Estás sin conexión: restaurar necesita el servidor.'
  if (item.needsOldKey)
    return 'Hecha con una clave más vieja: restáurala en la máquina con esa clave (obsybrain restore --key-file).'
  if (o.running) return 'Se está haciendo una copia: restaura cuando termine.'
  return null
}

// What is wrong with the name typed to confirm a restore, or null when it is the installation's, exactly.
export function confirmProblem(typed: string, name: string): string | null {
  if (typed === name) return null
  if (!typed) return `Escribe el nombre de esta instalación: ${name}`
  return `Escribe el nombre exactamente como es: ${name}`
}

// The file the installation key is saved in holds the key alone, so `obsybrain restore --key-file <file>` reads it as
// it is; its name says which installation and which key (its id) it is.
export const keyFile = (key: string) => `${key}\n`

export function keyFileName(name: string, keyId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `obsybrain-key-${slug ? `${slug}-` : ''}${keyId}.txt`
}

// The last update, as the launcher records it (plan §3.9): whether it went well, from and to which version, when, and
// for a failed one the service's last lines. Anything else is no update.
export type LastUpdate = { ok: boolean; from: string; to: string; at: string; log: string | null }
export function lastUpdateOf(x: unknown): LastUpdate | null {
  if (typeof x !== 'object' || x === null) return null
  const u = x as Record<string, unknown>
  if (typeof u.ok !== 'boolean' || typeof u.from !== 'string' || typeof u.to !== 'string') return null
  if (typeof u.at !== 'string' || Number.isNaN(Date.parse(u.at))) return null
  return { ok: u.ok, from: u.from, to: u.to, at: u.at, log: typeof u.log === 'string' ? u.log : null }
}
export function lastUpdateText(u: LastUpdate): string {
  if (u.ok) return `Actualizado de ${u.from} a ${u.to}.`
  return (
    `La actualización de ${u.from} a ${u.to} falló. obsybrain volvió a ${u.from} con los datos tal como estaban justo ` +
    'antes de la actualización: nada de lo escrito se perdió, y las sesiones y claves siguen funcionando.'
  )
}
