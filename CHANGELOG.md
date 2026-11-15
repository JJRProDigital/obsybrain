# Changelog

Lo que cambia cada versión publicada de obsybrain. Cada release lleva las mismas notas, el lanzador
`obsybrain.sh` como archivo del release y su SHA-256. Las versiones siguen `vX.Y.Z`; las actualizaciones solo
avanzan.

## v0.7.3

La Guía se lee por secciones.

- **Sección por sección, sin scroll eterno.** La Guía se lee con una lista de secciones a la izquierda y una
  a la vez a la derecha; los enlaces «Siguiente →» cambian de sección y un enlace profundo
  (`/guia#seccion-07-agente`) abre la sección exacta. En pantallas angostas, la lista se pliega en una tira
  de secciones arriba.
- **El taller PRO.** `deploy/taller-pro.html`: el deck interactivo del taller de 90 minutos — instalar,
  conectar el agente, el ciclo diario y soberanía, con los comandos listos para copiar.

## v0.7.2

La guía del producto, dentro del producto.

- **Sección Guía en la web.** El manual completo — las 9 pantallas de administración, los ajustes, el flujo
  de propuestas, los agentes — con capturas de las pantallas reales, navegable desde la barra lateral
  (ícono libro). Nada de ir a GitHub a leer cómo se usa lo que ya tenés abierto.
- **La barra lateral respeta su ancho.** Con nombres de sección en español, los ítems del rail se
  desbordaban y pintaban sobre el contenido; ahora encogen con puntos suspensivos.
- **Botones y casillas al mínimo accesible.** Los radios y checkboxes de 18px quedaban bajo el mínimo de
  24px que exige la auditoría automática de accesibilidad; ahora miden 26px con el espaciado correcto.

## v0.7.1

El brain de arranque: LaKademIA trae su starter pack y la guía de los primeros 4 pasos.

- **Starter pack importable.** `deploy/starter-pack/` trae el conocimiento base en formato 02-DOCS: cómo se
  trabaja con IA, la anatomía de un prompt que funciona, cómo organizar el conocimiento, qué guardar en
  memoria y 4 playbooks de trabajo diario. Se importa con `obsybrain import --brain TU_BRAIN --from
  deploy/starter-pack --as TU_EMAIL`.
- **Guía de onboarding en 4 pasos.** `deploy/GUIA-ONBOARDING.md`: instalar, crear cuenta y brain, importar el
  pack y conectar el agente — menos de una hora de cero a un brain con material propio respondiendo.
- **El momento clave validado.** Un brain recién importado responde las preguntas de trabajo con las páginas
  del pack, no con respuestas genéricas del modelo.

## v0.7.0

Primera versión de ObsyBrain: el brain de memoria y conocimiento para tus agentes de IA, en tu propio
servidor, con la identidad de Obsessive Solutions y el producto entero en español.

- **Todo el producto en español.** Interfaz web, correos, mensajes de error de la API y documentación, en
  español neutral con tuteo. El sustantivo contenedor queda «brain» en minúscula.
- **Identidad propia.** Paleta Ink/Oro/Paper y tipografías Playfair Display, Inter e IBM Plex Mono
  autoalojadas (OFL-1.1), marca propia y branding por defecto editable desde Administración.
- **Instalación en un comando.** El lanzador `obsybrain.sh` instala en esta máquina (`install --local`, web en
  http://localhost:8090) o en un servidor con dominio y HTTPS por sí solo (`install --domain`, con Caddy),
  con su propio PostgreSQL, con uno existente o compartido con otro programa. Sin preguntas con todas las
  opciones y `--yes`; resumen `--json` para programas; reinstalar aplica solo los cambios y conserva clave,
  contraseñas y datos.
- **Distribución por Docker.** Imagen propia (servidor, web y migraciones en Node 25, usuario sin
  privilegios, healthcheck en `GET /v1/health`) y lanzador descargable por release con su SHA-256.
- **Para los agentes.** Servidor MCP en `/mcp` (Streamable HTTP; inicio de sesión estándar OAuth 2.1 con
  PKCE) con las herramientas `mem_*` y `brain_*`; API v1 en `/v1` (OpenAPI 3.1 en `GET /v1/openapi.json`; es
  un contrato, los cambios que rompen van a `/v2`); tokens personales con caducidad, claves cortas por
  sesión, cuentas de servicio con rotación de clave, un puente (`obsybrain bridge`) para clientes que solo
  arrancan programas MCP locales, y el recordatorio con hooks de Claude Code.
- **Diario y wiki.** Los agentes guardan entradas con comprobantes, sin duplicados al reintentar y con los
  secretos quitados antes de guardar; el wiki se compila en páginas tipadas con enlaces tipados que citan
  sus fuentes; propuestas que un curador aprueba, corrige o devuelve; escritura directa con permiso por
  clave y por brain; avisos de salud (títulos casi iguales, enlaces rotos, huérfanos, páginas viejas,
  contradicciones abiertas) y limpieza diaria cuando nadie limpió en un día.
- **Búsqueda.** Por palabras, sin distinguir acentos, en español e inglés, ordenada por BM25 con la extensión
  opcional `pg_search`; búsqueda por significado opcional (OpenAI u Ollama local), mezclada con las palabras
  por fusión de rango recíproco con la extensión opcional `pgvector`.
- **Copias y restauración.** Copia cifrada cada día a las 03:00 (guarda las últimas 14) y copias a demanda,
  restaurables aquí o en otra instalación con la clave de instalación, que se puede rotar (`key rotate`) sin
  perder sesiones ni tokens.
- **Actualizaciones con vuelta atrás.** `update` trae y construye la versión nueva mientras la instalada
  sigue sirviendo, migra en mantenimiento y revierte solo si algo falla (Ctrl-C incluido); `update --check`
  consulta sin tocar nada; `web-updates enable` arranca un actualizador en su contenedor para actualizar
  desde la web, con confirmación por contraseña y segundo factor.
- **Modo compañero.** Otro producto puede instalarlo y configurarlo en una red compartida
  (`install --companion`): la configuración llega por `POST /v1/setup/companion` con una clave de un solo
  uso, y una clave principal perdida se reemplaza con `POST /v1/setup/companion/reconnect`.
- **Gobierno y auditoría.** Roles curator, contributor y reader con invitaciones por correo de 72 horas;
  conexiones de apps revocables; eventos en vivo por SSE con `Last-Event-ID`; registro de auditoría que la
  base de datos no deja cambiar; límite de peticiones configurable; exportación de un brain como vault de
  Obsidian o copia fiel, e importación de una carpeta de documentación en un brain vacío.
