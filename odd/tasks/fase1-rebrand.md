# Fase 1 — Fork, renombre total, identidad visual y UI en español

Objetivo: convertir el árbol v0.7.0 importado en el producto **ObsyBrain** (marca Obsessive Solutions): cero referencias a rsc-brain fuera de LICENSE, identidad visual propia y todo el producto en español.
Branch: `main` (baseline 17dc767) → `fase1-rebrand`. Delivery: work-unit commits (~400 líneas c/u) en `fase1-rebrand`; push/PR/remoto = decisión del usuario.
Test runner: `bash scripts/verify.sh` en WSL Ubuntu, Node 25 en `~/tools/node-v25.9.0-linux-x64/bin` (PATH inline por comando).

## Specs

- **S1**: «no quiero ninguna referencia a rsc-brain, ni interfaz, ni colores» — cero ocurrencias de `rsc-brain`/`RSC_BRAIN_`/`rsc_brain` en el repo fuera de `LICENSE` y builds generados. Criterio: grep sobre el repo (excl. LICENSE, node_modules, dist) devuelve 0 matches, y `verify.sh` verde.
- **S2**: env vars `RSC_BRAIN_*` → `OBSY_BRAIN_*` (rename 1:1). Fuente única `src/config.ts` + `deploy/compose*.yaml` + updater + launcher + tests + docs. Compose dice verbatim: «Env vars | `RSC_BRAIN_*` | `OBSY_BRAIN_*` (rename 1:1) | `src/config.ts` (fuente única) + compose + updater + tests».
- **S3**: paquete y CLI: `@ericrisco/rsc-brain`/bin `rsc-brain` → `obsybrain`/`obsybrain` (package.json, package-lock, Dockerfile bin symlink). Servidor MCP: `SERVER_INFO.name: 'rsc-brain'` → `'obsybrain'` (visible en la lista MCP del cliente), `src/mcp/server.ts`.
- **S4**: launcher `deploy/rsc-brain.sh` → `deploy/obsybrain.sh` (contenido y nombre; PROG, mensajes, estado de instalación `.rsc-brain` → `.obsybrain`, imagen, contenedores, volumen, red, rol BD `rsc_brain` → `obsybrain`).
- **S5**: identidad visual en `web/src/styles/tokens.css` (dark+light) con la paleta del manual de Obsessive Solutions (`C:\Users\Juan José\Downloads\Nueva carpeta\brand-manual-obsessive-solutions.html`): Ink `#1E312F`, Oro `#D5B06D`, Paper `#F1EFEA`. Tipografía: **Playfair Display** (display 900), **Inter** (body), **IBM Plex Mono** (mono/tags), en `web/src/styles/fonts/` + `@font-face` (las tres OFL). Criterio: tokens.css solo usa la nueva paleta; build web OK; tests de tokens pasan.
- **S6**: branding default: nombre **ObsyBrain** + logo/wordmark por defecto en el seed de `installation` (`branding.ts` ya lo soporta). Pendiente: asset del logo (no está en la carpeta del manual; se genera wordmark SVG o espera el PNG de la marca).
- **S7**: «Todo en español» — UI íntegra en español: 13 screens + dialogs + mensajes de error + emails + copy de API. Se hace DESPUÉS del rename y la identidad visual «para actualizar los tests de Playwright UNA sola vez». Los tests que matchean texto se actualizan con la traducción.
- **S8**: README de producto y docs reescritos en español con voz propia (instalación, conexión de agentes, starter pack). CHANGELOG renombrado/reemplazado (ahora es el producto propio). No queda copy de rsc-brain.
- **S9**: «El archivo LICENSE con el copyright de Eric Risco (Eric Risco, rsc-brain) permanece dentro del código fuente distribuido. No aparece en UI, docs ni marketing. Borrarlo viola MIT.» — LICENSE queda byte a byte igual al upstream.
- **S10**: tras cada unidad mecánica: `typecheck` + `lint` + suite (verify.sh) en verde en WSL. Los tests del upstream que matchean el nombre (`test/repo/product-name.test.ts`, `test/repo/forbidden-names.test.ts`) se adaptan al producto nuevo.

## Tasks

- [x] T1 (S9) — Importar árbol v0.7.0 sin historial, LICENSE intacto, `.gitattributes` LF. Commit `17dc767` en `main`.
- [x] T2 — Toolchain WSL: Node v25.9.0 instalado en `~/tools/node-v25.9.0-linux-x64`.
- [x] T3 (S2, S10) — Rename env prefix `RSC_BRAIN_*` → `OBSY_BRAIN_*` en todo el repo (excl. LICENSE). 82 archivos, 850+/812-. Commit `aba7128`. Verificación typecheck+suites pendiente (npm ci corriendo); guardia de restore `not_rsc_brain_database` y rol `rsc_brain` quedan para T4 (nombre, no env).
- [ ] T4 (S3, S4, S10) — Rename de nombre: package/bin/MCP/launcher/compose/docker/ruta `~/.config`, rol BD, dir de estado. Route: inline.
- [ ] T5 (S5, S6) — Identidad visual: tokens.css con paleta Obsessive Solutions, fuentes, branding seed. Route: inline.
- [ ] T6 (S7) — Traducción completa de UI a español + tests Playwright. Route: inline (grande, por screens; 1 solo pase al final del resto).
- [ ] T7 (S8, S1) — README/docs/CHANGELOG en español con voz propia + grep final 0 referencias. Route: inline.
- [ ] T8 — Repo GitHub + push + releases. Route: decisión del usuario (pendiente).

## Log

- L1 (2026-11-12): «recuera este plan ~/.opencode/plan/obsybrain-plan.md». Fase 0 completada antes (consultar plan): vanilla corriendo en WSL `~/rsc-brain`, web http://localhost:8090 200 OK.
- L2 (2026-11-12): «empieza la fase 0, pero no instales docker desktop que ya esta instalado» — Docker verificado (server 29.9.2, WSL2).
- L3 (2026-11-12): Fase 1 autorizada. Ambigüedad resuelta por el usuario: «no quiero ninguna referencia a rsc-brain, ni interfaz, ni colores» → rename total + identidad propia (el mensaje previo «sigue los colores, interfaz y nombre de rscbrain» era el pedido de trabajar sobre esos tres frentes del rebrand, no de conservarlos).
- L4 (2026-11-12): «Todo en español» (UI, dialogs, errores, emails, API copy).
- L5 (2026-11-12): Paleta = manual de marca Obsessive Solutions (Ink #1E312F / Oro #D5B06D / Paper #F1EFEA; Playfair Display 900, Inter, IBM Plex Mono). Logo png no disponible en la carpeta — wordmark SVG provisional hasta recibir el asset.
- L6 (2026-11-12): Insumos: upstream v0.7.0 tag bb326a6; import via `git archive` (LF); `.gitattributes` marca LF + binarios para asegurar compatibilidad Windows/WSL.
