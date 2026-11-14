# La web de obsybrain

La web es como las personas usan obsybrain: leen el wiki y su grafo, siguen lo que hacen los agentes,
aprueban o devuelven propuestas, corrigen el diario, conectan sus agentes y administran la instalación. Los
agentes usan el mismo servidor por MCP y HTTP; la web es para las personas que los rodean.

Es una aplicación de una sola página (Preact, Vite) que el proceso de obsybrain sirve en la misma dirección
que la API. Solo llama a la API pública en `/v1` y a los eventos en vivo, con los mismos permisos que tiene
un programa: no hay rutas privadas. Todo lo que la web puede hacer, un programa con el mismo rol puede
hacerlo.

El texto de la web está en español y vive en `src/text.ts`.

## Córralo en desarrollo

```sh
npm install
npm run build                       # once: the server and dist/web
OBSY_BRAIN_PORT=4100 node dist/cli/main.js serve   # with OBSY_BRAIN_PG_URL set
npm run web:dev                     # Vite on port 5173; it forwards /v1, /mcp, /oauth and /.well-known to 4100
```

Abre <http://localhost:5173>. La primera visita hace la configuración inicial.

Sin base de datos, recorre la web contra el fixture de la API:

```sh
npm run build
node test/web/fixture/main.ts       # the fixture and the built web on port 4173
```

Abre <http://127.0.0.1:4173/__fixture/use?preset=signed-in> (o `fresh`, `signed-out`, `member`,
`alone`, `insecure`). Cada preset es un escenario propio: inicios de sesión, datos y estados forzados.

### Elige un puerto que los navegadores acepten

Los navegadores y `fetch` se niegan a algunos puertos sin más (los «bad ports» del estándar Fetch), diga lo
que diga el servidor. Entre ellos: 4190, 5060, 5061, 6000, 6566, 6665–6669, 6697 y 10080. Una instalación en
uno de esos puertos responde `curl` pero no la web, el puente ni los hooks de Claude Code. Usa otro puerto,
como el 8090 por defecto, o pon obsybrain detrás de un proxy inverso en el 443.

## Cómo está organizado el código

- `src/screens/` pinta las pantallas. Una pantalla no guarda la lógica que puede evitar: lo que decide va en
  `src/lib/`.
- `src/lib/` guarda la lógica de las pantallas (filtros, la comprobación en vivo, configuración, atajos), sin
  el DOM, para que los tests de node la alcancen.
- `src/api/` es el cliente de la API: una llamada por operación, una caché con `useFresh` y borradores.
- `src/live/` sigue los eventos de un brain (reconexiones, puesta al día desde el último id, suelta cuando la
  pestaña se esconde).
- `src/graph/` distribuye el grafo en un worker y lo pinta en un canvas, así ninguna tarea bloquea la página.
- `src/ui/` guarda las piezas compartidas: botones que dicen por qué están desactivados, campos, diálogos y
  los estados de una pantalla (`states.tsx`: cargando, vacío, vacío por filtro, error, sin conexión, sin
  acceso).

Reglas que sigue cada pantalla:

- Cada pantalla tiene todos sus estados (spec B6 «Estados en todas las pantallas»).
  `test/browser/matrix.spec.ts` guarda la lista de pantallas y estados; una ruta nueva sin su fila la hace
  fallar.
- Las escrituras están desactivadas sin conexión o mientras se envían, y dicen por qué junto al botón
  (`Button` con `blocked`).
- El teclado nunca cae en el body de la página después de una acción: `src/lib/landing.ts` decide dónde
  aterriza.
- Ninguna caja editable vacía mientras un valor guardado todavía carga.
- Los borradores se quedan en memoria, o se indexan por cuenta; contraseñas, códigos, tokens y claves nunca
  se guardan.
- El servidor decide quién puede hacer qué. La web esconde lo que un rol no puede hacer, pero nunca confía en
  eso.

## Cómo se testa

Tres capas, de la más rápida a la más real:

1. **Tests de node** (`test/web/*.test.ts`, corridos por `npm test`): la lógica en `src/lib/`, la
   distribución y el modelo del grafo, el cliente de la API y la conformidad del fixture.
2. **Tests de navegador contra el fixture** (`test/browser/*.spec.ts`, `npm run test:web`): la web
   construida en Chromium contra un fixture de la API (`test/web/fixture/`), sin base de datos. CI los corre.
   Cubren cada pantalla y estado a 320 px (`matrix.spec.ts`), la auditoría de accesibilidad con axe en los
   temas claro y oscuro (`axe.spec.ts` y las auditorías en el spec de cada pantalla), el teclado y el timing
   del grafo (CA5, CA6; CI es el juez del timing).
3. **Tests de extremo a extremo** (`test/e2e/*.spec.ts`, `npm run test:e2e`): la web construida contra el
   servidor real y PostgreSQL (`OBSY_BRAIN_PG_URL`), un worker, correo capturado. Corren localmente en
   `scripts/verify.sh` cuando PostgreSQL responde; CI no tiene PostgreSQL y lo dice. CA1 (de la invitación a
   un agente conectado) se cuenta aquí y la imprime `verify.sh`.

`npm run verify` los corre todos, con lint, tipos, build y auditoría de dependencias.

### El fixture y el contrato

El fixture deja a CI testear la web sin base de datos, así que no puede separarse del servidor:

- Cada respuesta que da el fixture se comprueba contra la descripción de `/v1` que el servidor genera de su
  propia tabla de rutas (`test/web/fixture.test.ts`). Un campo que el servidor no describe hace fallar el
  test.
- Las respuestas principales de `/v1` están fijadas en `test/api/contract.test.ts`, que también llama al
  servidor real. Un campo nuevo se agrega al servidor, a su descripción y al pin, y después al fixture.
- Un estado de pantalla se fuerza por escenario (`scenario(context, url, preset, { screen: state })`):
  `loading`, `empty`, `filtered-empty`, `error`, `forbidden` y `much-data`. Las operaciones de una pantalla
  nombran su pantalla en la tabla del fixture, así el estado llega a cada respuesta que la pantalla lee.
- Los datos del grafo vienen de un generador con semilla (`web/test/data/generate.ts`): la misma semilla da
  las mismas 300 o 5 000 páginas al fixture y al servidor real.
- Los tests esperan las peticiones en vuelo antes de asertar, y nunca dependen del tiempo que tarda una
  petición. Las fuentes de Linux son más anchas que las de macOS: un test de encaje mide, no supone anchos.
