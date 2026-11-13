// Who may manage people and keys (spec B4): managing happens in the web, with a person's session; an
// agent's key never invites, changes roles or creates keys.
import { AppError } from '../core/errors.ts'
import type { Ctx } from './context.ts'

export function inWeb(ctx: Ctx, what = 'Esto'): void {
  if (ctx.who.credential.kind !== 'web') {
    throw new AppError(
      403,
      'web_only',
      `${what} se hace en la web de obsybrain, con la sesión de una persona.`,
      'Abre la web de obsybrain. Las claves de agentes y programas no gestionan personas ni claves.',
    )
  }
}

export function adminOnly(ctx: Ctx): void {
  inWeb(ctx)
  if (!(ctx.who.isAdmin && ctx.who.kind === 'person')) {
    throw new AppError(
      403,
      'forbidden',
      'Solo la administración de esta instalación hace esto.',
      'Pídeselo a un administrador.',
    )
  }
}

export const EMAIL = /^[^\s@<>()",;:\\[\]]+@[^\s@<>()",;:\\[\]]+\.[^\s@<>()",;:\\[\]]+$/

// An email as people type it: trimmed, lowercased, and plain (no display name, no comment, no list),
// so nothing in it can turn into another recipient.
export function emailOf(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const e = v.trim().toLowerCase()
  return e.length <= 320 && EMAIL.test(e) ? e : null
}
