[← Índice](indice.md) · [← Anterior](06-personas-claves.md) · [Siguiente →](08-administracion.md)

# 07 · Conecta tu agente

«Tu agente lee y escribe en tus brains por MCP. Conéctalo una vez y observa cómo el check se vuelve verde.» La pantalla **Conecta tu agente** es la receta exacta para tu herramienta: cinco agentes, una pestaña cada uno, con los comandos listos para copiar.

![La pantalla de conexión: los agentes y la comprobación en vivo](/guia-assets/17-connect.png)

## Los cinco agentes

**Claude Code**, **Codex**, **OpenCode**, **Cursor** y **Otros agentes**. Cada pestaña da dos caminos:

### 1. Conexión estándar (Recomendada)

«Sin token que conservar: tu agente abre tu navegador una vez y tú apruebas allí.» Es el inicio de sesión MCP (OAuth 2.1 con PKCE): la **Dirección MCP** es suficiente y Claude Code, Codex y OpenCode la registran con un comando:

```sh
claude mcp add --transport http obsybrain http://localhost:8090/mcp --scope user
claude mcp login obsybrain
```

Al aprobar en el navegador eliges qué brains compartir (lectura, o lectura + escritura) y vuelves al agente, sin copiar ninguna clave. Una conexión termina después de 90 días sin uso, o un año en total; vive en **Perfil › Apps conectadas**, donde se revoca.

### 2. Conexión por token

«La alternativa, para un agente que no puede abrir tu navegador: un token personal, de lectura y escritura, por 90 días. Se muestra una sola vez.» Con **Crear un token**, obsybrain te lo enseña una vez («Cópialo ahora») y genera los bloques de configuración de tu agente ya rellenados.

La regla de seguridad importa: **el token nunca va en una línea de comandos** — «lo pegas en un prompt oculto, dentro de un archivo que solo tú puedes leer, para que quede fuera de tu historial de shell». Cada agente tiene su variable propia, así dos agentes nunca se pisan un token:

| Agente | Variable | Dónde va |
| --- | --- | --- |
| Claude Code | `OBSY_BRAIN_TOKEN_CLAUDE_CODE` | `.mcp.json` |
| Codex | `OBSY_BRAIN_TOKEN_CODEX` | `~/.codex/config.toml` |
| OpenCode | `OBSY_BRAIN_TOKEN_OPENCODE` | `opencode.json` |
| Cursor | `OBSY_BRAIN_TOKEN_CURSOR` | `.cursor/mcp.json` |
| Otros / el puente | `OBSY_BRAIN_TOKEN` | `~/.config/obsybrain/token` (modo 600) |

La página te muestra el bloque exacto de tu agente con **Copiar** (o «Copiar: título») al lado. Puedes limitar el token a un brain concreto: si llegas desde un brain, el lead lo nombra; «Conéctalo mejor a todos tus brains» sugiere lo contrario cuando el token es para uno solo.

### El recordatorio (opcional)

Para Claude Code, el kit propone dos **hooks** que anclan la memoria a la sesión de trabajo; para los demás, un texto para su archivo de instrucciones (`AGENTS.md`) y el prompt `close_session` del servidor. Los hooks, con token:

- `obsybrain hook session-start` — ejecuta `git remote get-url origin` en la carpeta de la sesión, pregunta a obsybrain qué brain está enlazado a ese repositorio y añade el contexto de ese brain a la sesión. Con `--brain <slug>` se fuerza cuando no hay ningún brain enlazado.
- `obsybrain hook stop` — al cerrar, pregunta si el token todavía tiene una sesión de brain abierta (trabajo guardado sin resumen) y, si la tiene, le pide a Claude cerrarla con `mem_session_summary`: el resumen llega al diario y la sesión cierra completa.

Los dos fallan abiertos: sin token, con entrada incorrecta u obsybrain caído, no imprimen nada y dejan que la sesión siga.

### El puente, para agentes que solo arrancan programas MCP locales

Para agentes que no hablan MCP sobre HTTP, el paquete trae `obsybrain bridge`: un servidor MCP local que reenvía cada mensaje a `/mcp` de tu instalación con tu token.

```sh
mkdir -p ~/.config/obsybrain && (umask 077 && printf 'Token: ' && read -rs t && : > ~/.config/obsybrain/token && chmod 600 ~/.config/obsybrain/token && printf '%s\n' "$t" > ~/.config/obsybrain/token && echo saved)
obsybrain bridge --url https://brain.example.com/mcp
```

Como servidor MCP local: `{"command": "obsybrain", "args": ["bridge", "--url", "<dirección>", "--token-file", "~/.config/obsybrain/token"]}`. El token viene de `--token-file`, si no `OBSY_BRAIN_TOKEN`, si no `~/.config/obsybrain/token`. «No hay opción para pasarlo en la línea de comandos, y nunca se imprime.» Cuando obsybrain no responde, la petición recibe un error JSON-RPC que lo dice y cómo seguir; el puente sigue corriendo.

## Comprobación en vivo

La pantalla no te deja a ciegas: al arrancar o reiniciar tu agente, «Esto se vuelve verde en su primera petición a obsybrain». Cuando la petición llega: **Conectado**, con el nombre del cliente y la hora («Claude Code alcanzó obsybrain a las …»). Después: «Ahora pregúntale algo sobre tu brain, como abajo» — la prueba de fuego es preguntarle algo que solo tu brain sabe.

Si sigue esperando, la página arma la lista de pruebas de tu agente:

- «Reinicia tu agente: la mayoría solo lee su configuración de MCP al arrancar.»
- Con un token: `echo ${#OBSY_BRAIN_TOKEN_X}` en la terminal que arranca tu agente debería imprimir un número mayor que 0 — la longitud del token, nunca el token.
- Claude Code: ejecuta `/mcp` — obsybrain debería aparecer como conectado. Codex y OpenCode: `codex mcp list` / `opencode mcp list`. Cursor: la configuración de MCP.

La comprobación se detiene tras 10 minutos («Se dejó de comprobar tras 10 minutos») y **Comprobar de nuevo** la vuelve a arrancar. Un recordatorio opcional recuerda el prompt del servidor para cerrar una sesión.

## El ciclo completo

1. Conecta el agente (arriba).
2. Trabaja: el agente lee el contexto de tu brain antes de decidir y guarda lo que aprende mientras trabaja.
3. Al terminar: «Guarda lo que aprendimos» — guarda el resumen y cierra la sesión.
4. Un agente compila el diario en el wiki: «compila el diario de este brain en el wiki».
5. Tú apruebas las propuestas (mira [04 · Propuestas](04-propuestas.md)); el wiki crece.

Las herramientas MCP (`mem_save`, `mem_search`, `brain_page`, `brain_health`, `brain_propose`…) son las mismas que la API; una clave solo ve las que puede usar. El detalle del servicio MCP está en el README, secciones **Agentes por MCP** y **La API para programas**.

## Siguiente

→ [08 · Administración](08-administracion.md): las nueve pantallas de la instalación.
