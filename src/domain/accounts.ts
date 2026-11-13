// Accounts: people (with an email) and service accounts (programs such as RSC Factory). The full
// lifecycle (invitations, removal from the web) is spec B4; this is what the journal needs.
import type { Clock } from '../core/clock.ts'
import { conflict, invalid } from '../core/errors.ts'
import { newId } from '../core/ids.ts'
import type { Db } from '../db/db.ts'

export type NewAccount = {
  kind: 'person' | 'service'
  name: string
  email?: string
  isAdmin?: boolean
  canCreateBrains?: boolean
  canInvite?: boolean
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function createAccount(db: Db, clock: Clock, a: NewAccount): Promise<string> {
  const name = a.name.trim()
  if (!name || name.length > 80)
    throw invalid('El nombre de una cuenta tiene de 1 a 80 caracteres.', 'Acorta el nombre.')
  const email = a.email?.trim().toLowerCase()
  if (a.kind === 'person' && (!email || !EMAIL.test(email))) {
    throw invalid('Una persona necesita un correo válido.', 'Indica un correo como ana@example.com.')
  }
  if (a.kind === 'service' && email) {
    throw invalid('Una cuenta de servicio no tiene correo.', 'Omite el correo.')
  }
  if (a.kind === 'service' && a.isAdmin) {
    throw invalid('Una cuenta de servicio no puede ser administradora.', 'Crea una cuenta de persona.')
  }
  const id = newId('acc')
  try {
    await db.query(
      `INSERT INTO accounts (id, kind, email, name, is_admin, can_create_brains, can_invite, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        a.kind,
        email ?? null,
        name,
        Boolean(a.isAdmin),
        Boolean(a.canCreateBrains),
        Boolean(a.canInvite),
        clock(),
      ],
    )
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw conflict('email_taken', 'Ya existe una cuenta con ese correo.', 'Usa otro correo.')
    }
    throw err
  }
  return id
}

export async function accountByEmail(
  db: Db,
  email: string,
): Promise<{ id: string; status: string } | undefined> {
  return db.one<{ id: string; status: string }>(
    "SELECT id, status FROM accounts WHERE email = $1 AND kind = 'person'",
    [email.trim().toLowerCase()],
  )
}
