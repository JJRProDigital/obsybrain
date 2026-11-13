// The last step of the first-time setup (B7 PR30): the installation key shown once, ticked as saved, then in.
import type { Page } from '@playwright/test'

export async function keepTheKey(page: Page): Promise<void> {
  await page.getByRole('heading', { level: 1, name: 'Guarda la clave de instalación' }).waitFor()
  await page.getByLabel('Guardé la clave de instalación en un lugar seguro, fuera de esta máquina').check()
  await page.getByRole('button', { name: 'Continuar a obsybrain' }).click()
}
