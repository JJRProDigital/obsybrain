# obsybrain

**La memoria que le falta a tus agentes de IA, y la que tu empresa puede conservar.**

Cada agente de IA que usas arranca de cero. No recuerda la decisión que tomaste el martes pasado, el bug que
ya arregló dos veces, el cliente al que no hay que llamar antes de las diez ni por qué el servicio de
facturación está construido como está. Se lo explicas otra vez. Después otro agente, otra herramienta u otro
colega lo necesita, y se lo explicas otra vez. Lo que aprendió se va con la sesión.

obsybrain es donde ese conocimiento se queda. Corre en tu propio servidor. Cada agente que se conecta lee lo
que el equipo ya sabe antes de trabajar, y anota lo que aprendió después. Las personas deciden qué pasa a ser
el registro de la empresa.

## Por qué importa

- **Tus agentes dejan de reaprender tu negocio.** El contexto que te llevó una hora explicar está al inicio de
  la siguiente sesión, en cada herramienta: Claude Code, Codex, Cursor, OpenCode o tu propio programa.
- **El conocimiento sobrevive a las personas y a las herramientas.** Cuando alguien se va, cambia un proveedor
  o se reemplaza un modelo, lo aprendido sigue en el brain, en páginas llanas que cualquiera puede leer.
- **Una verdad, no veinte chats.** Decisiones, lecciones y datos acaban en un wiki con fuentes, en vez de
  dispersos en historiales de chat que nadie va a buscar.
- **Las personas siguen al mando.** Los agentes proponen; un curador, o una clave en la que el curador confía,
  decide. Cada cambio tiene una revisión, un motivo y una vuelta atrás, y lo que escriben los agentes cita sus
  fuentes.
- **Tus datos siguen siendo tuyos.** Autoalojado, licencia MIT, sobre PostgreSQL. Ningún modelo corre en el
  servidor y ningún dato sale de él a menos que lo actives. La única llamada que hace por defecto es una
  comprobación diaria de versión nueva, y un `OBSY_BRAIN_REPO_URL` vacío la detiene.

## Cómo funciona

```
 agents ──write──▶  JOURNAL   ──compile──▶  PROPOSALS  ──decide──▶  WIKI   ◀──search──  every agent
                    what they                 what should            what the
                    did and learned           become knowledge       team knows
```

1. **El diario.** Mientras trabajan, los agentes guardan decisiones, lecciones, intentos, datos y
   preferencias. Escriben libres, con comprobantes, sin duplicados cuando reintentan, y con los secretos
   quitados antes de guardar nada.
2. **El wiki.** Un agente compila el diario en páginas tipadas con enlaces tipados (depende de, es parte de,
   sustituye a, contradice a…), cada una citando las entradas de las que salió. Un curador lo aprueba todo,
   aprueba una parte, corrige o lo devuelve con un comentario del que el agente aprende. Una clave en la que el
   curador confía puede escribir y decidir directamente, por MCP o por la API.
3. **Buscar antes de decidir.** Páginas y diario se buscan juntos, sin distinguir acentos, en español y en
   inglés, ordenados por BM25 con la extensión opcional `pg_search`; búsqueda por significado opcional,
   mezclada por fusión de rangos. El conocimiento sustituido nunca supera al que lo sustituyó.
4. **Un wiki que se revisa solo.** Páginas huérfanas, enlaces rotos, contradicciones abiertas, páginas viejas,
   títulos casi iguales. Quien propone recibe el aviso antes de enviar, y se pide a los agentes que limpien
   cuando nadie lo hizo en un día.
5. **Verlo.** Un grafo a pantalla completa coloreado por comunidad, las páginas sin enlaces alrededor,
   historial de cada página y un feed en vivo de lo que hacen los agentes.

## Para qué lo usan los equipos

- **Equipos de software:** los motivos de la arquitectura, los incidentes y sus arreglos, las convenciones que
  un agente nuevo debe seguir antes de tocar el código.
- **Operaciones:** runbooks que se actualizan solos con lo que pasó de verdad, no con lo que alguien escribió
  hace dos años.
- **Trabajo con clientes:** lo que cada cliente pidió, decidió y rechazó, al alcance de cada agente y persona
  de la cuenta.
- **Investigación:** fuentes leídas una vez y compiladas en páginas que crecen con cada trabajo nuevo, en vez
  de una pila de PDF.

## En un minuto

Instálalo ([Instalación](#instalación) tiene todas las opciones) y conecta tu agente:

```sh
sh obsybrain.sh install --local                      # PostgreSQL included; the web opens on http://localhost:8090
claude mcp add --transport http obsybrain http://localhost:8090/mcp --scope user
claude mcp login obsybrain
```

Después pregúntale a tu agente: *«¿Qué sabe este brain sobre X?»* Al terminar la sesión: *«Guarda lo que
aprendimos»*.

> Estado: desarrollo temprano.

## Licencia

MIT. Mira [LICENSE](LICENSE).

## Instalación

obsybrain corre en contenedores, en macOS o Linux. Necesitas Docker con Compose v2 y git. Un comando lo
instala; primero comprueba lo que necesita y no cambia nada si falta algo.

Descarga el lanzador desde un release publicado (sustituye `vX.Y.Z` por la versión) y compruébalo contra el
SHA-256 que dan las notas del release para `obsybrain.sh` antes de ejecutarlo:

```sh
curl -fsSLO https://github.com/JJRProDigital/obsybrain/releases/download/vX.Y.Z/obsybrain.sh
shasum -a 256 obsybrain.sh      # Linux: sha256sum obsybrain.sh; it must match the release notes
sh obsybrain.sh install --local
```

Mientras el repositorio sea privado, instalar necesita acceso a él: pasa `--repo` con una dirección que git
pueda leer con tu acceso (una SSH, o HTTPS con el credential helper de git; nunca un token en la dirección), o
`--image` con una imagen que ya tengas.

Trae la última versión publicada, construye su imagen, la arranca con su propio PostgreSQL y te dice la
dirección. Solo escribe en su propia carpeta: una vacía, o una que contenga solo tu `compose.override.yaml`;
rechaza cualquier otra (un clon de este repositorio, por ejemplo). Ábrela para terminar la configuración
inicial, donde creas la cuenta de administración. `sh obsybrain.sh help` lista cada comando y opción.

### En esta máquina

`install --local` publica la web en `http://localhost:8090`, solo en esta máquina (`127.0.0.1`).
`--port N` elige otro puerto; cuando el puerto está ocupado, el instalador ofrece el siguiente libre (o, con
`--yes`, se detiene y dice cuál pasar). La instalación vive en `~/obsybrain` (`--dir` la mueve): su
configuración en `.env`, las copias en `backups/`.

### En un servidor con dominio

```sh
sh obsybrain.sh install --domain brain.example.com
```

Apunta el dominio al servidor primero. Caddy corre delante de obsybrain en los puertos 80 y 443 y consigue el
certificado HTTPS solo (Let's Encrypt), y lo renueva; no hay paso de certificados. La instalación vive en
`/opt/obsybrain`. obsybrain cree en las cabeceras reenviadas solo desde la dirección fija de Caddy en la red de
la propia instalación.

### Un PostgreSQL existente

PostgreSQL 17 o más nuevo, con la extensión `unaccent` (viene con PostgreSQL). Dale al instalador, o una base
de datos que sea solo para obsybrain, o un login de administración que use una vez para crearla (un rol que no
sea superusuario y una base de datos a la que solo ese rol pueda conectarse). Cada uno va en un archivo, o por
la entrada estándar con `-`; nunca en la línea de comandos.

```sh
sh obsybrain.sh install --local --db existing --db-url-file db-url.txt         # a database for obsybrain
sh obsybrain.sh install --local --db existing --db-admin-url-file admin-url.txt # let it make one
```

Dentro del contenedor, `localhost` es el propio contenedor: un PostgreSQL en esta máquina es
`host.docker.internal`. El instalador rechaza un PostgreSQL demasiado viejo o sin `unaccent`, antes de crear
nada.

### Compartiendo PostgreSQL con el panel de LaKademIA

```sh
sh obsybrain.sh install --local --db shared --db-admin-url-file admin-url.txt --factory-db rsc_factory
```

obsybrain consigue su propia base de datos y rol en el mismo servidor. Ninguno de los dos programas puede
conectarse a la base de datos del otro. Si el login del panel de LaKademIA es superusuario, igual puede llegar a todo;
el instalador lo dice.

### Instalado por el panel de LaKademIA (modo compañero)

El instalador del panel de LaKademIA puede instalar obsybrain a su lado. Crea una red de Docker que ambos comparten y
llama:

```sh
sh obsybrain.sh install --companion --attach-network rsc-shared --factory-url https://factory.example.com \
  --domain brain.example.com --trusted-proxy 192.168.210.2 \
  --db shared --db-admin-url-file admin-url.txt --factory-db rscf --yes --json
```

- obsybrain entra en la red como `obsybrain` (`http://obsybrain:8090` para el panel de LaKademIA) y no corre Caddy
  propio: el Caddy del panel de LaKademIA sirve su dirección. `--trusted-proxy` es la dirección fija de ese Caddy en la
  red, el único proxy en el que obsybrain cree. Con `--local` en vez de `--domain`, la web queda en
  `http://localhost:8090` en esta máquina y no se cree en ningún proxy.
- obsybrain queda instalado pero sin configurar. Su página de configuración inicial dice «Termina la
  configuración en el panel de LaKademIA» y enlaza allí. La configuración del panel de LaKademIA crea la
  administración de ambos, con el mismo nombre, correo y contraseña, y la cuenta de servicio que el panel usa.
- Lo hace con una clave de un solo uso, `companionToken` en el resumen `--json` (también en `.env`, que solo
  lee su dueño): `POST /v1/setup/companion` con `Authorization: Bearer <companionToken>`. obsybrain responde a
  esa llamada solo mientras no está configurado, solo desde la red compartida (nunca a través de un proxy ni
  desde esta máquina) y solo una vez: dos llamadas a la vez lo configuran una.
- Si el panel de LaKademIA pierde después su clave principal (una respuesta que nunca llegó, un restore), consigue una
  nueva con `POST /v1/setup/companion/reconnect`: la misma clave de un solo uso más el correo y la contraseña
  de un administrador de obsybrain (las contraseñas incorrectas esperan igual que al iniciar sesión). Llega
  solo a la cuenta que creó el primer handshake; la clave principal anterior, y las claves creadas a partir de
  ella, dejan de funcionar. Si un administrador quitó esa cuenta, lo dice (`service_removed`): reactívala
  primero en Administración › Personas.
- La red compartida es solo IPv4: una con IPv6 activado se rechaza (exit 2).
- Necesita un PostgreSQL que no sea el propio de obsybrain (`--db shared` por defecto, o `--db existing`). Con
  `--local`, además Docker Engine 28 y Docker Compose 2.33 o más nuevos.
- Ejecutar `install` otra vez conserva el modo compañero, la red y la clave. Una instalación hecha sin
  `--companion` no se convierte en una.

El día a día lo maneja el panel de LaKademIA (mira su README, «Memory (obsybrain)»):

- **Actualizar:** el `update.sh` del panel de LaKademIA ejecuta primero el `update` de este lanzador, con todo lo de
  [Actualización](#actualización): mantenimiento, una copia, y la versión anterior de vuelta si falla. Entonces
  no se toca el panel de LaKademIA y su `update.sh` sale con 4.
- **Reconectar:** después de un `restore`, las claves del panel de LaKademIA dejan de funcionar. En el panel de
  LaKademIA, Administración › Memoria toma una clave principal nueva para la cuenta de servicio (créala en
  Administración › Cuentas de servicio aquí), o reconecta con la clave de un solo uso y el correo y la
  contraseña de tu administrador.
- **Desinstalar:** `sh <dir>/.obsybrain/src/deploy/obsybrain.sh uninstall --dir <dir>` lo detiene y conserva
  los datos; el `install.sh` del panel de LaKademIA lo vuelve a arrancar. Con `--delete-data --confirm <name>
  --db-admin-url-file F` su base de datos y rol en el PostgreSQL del panel de LaKademIA también se van (F: un login
  superusuario de ese PostgreSQL), y el panel lo olvida en su próximo `update.sh` o `install.sh`.
- El panel de LaKademIA trae la etiqueta `vX.Y.Z` más nueva de este repositorio: una versión es utilizable como compañera
  solo desde la primera etiqueta que tiene `--companion`.

### Sin preguntas

Con cada respuesta como opción y `--yes`, el instalador no pregunta nada; lo que falte es un error que nombra
la opción que lo da. Con `--json`, la salida estándar contiene solo un resumen para programas: `url`, `mode`,
`db`, `installationKey`, `keyId`, `version` y `dir` (y, en modo compañero, `companionToken` e `internalUrl`).
Códigos de salida: 0 hecho, 2 uso incorrecto, 3 falta un requisito (no se cambió nada), 4 falló y dejó lo que
había, 1 cualquier otra cosa.

Ejecutar `install` otra vez sobre una instalación aplica solo lo que cambies (el puerto, el dominio) y conserva
su clave, sus contraseñas, sus datos y sus copias.

### Actualización

```sh
sh obsybrain.sh update                    # the latest published version
sh obsybrain.sh update --version v0.2.0   # or that one (--image I: an image you already have)
sh obsybrain.sh update --check            # only look: what runs, the newest published, what it changes
```

Una versión publicada es una etiqueta `vX.Y.Z` del repositorio. `update --check` (con `--json` para programas:
`installed`, `latest`, `newer`, `notes`) pregunta con el acceso de esta misma máquina, así que también funciona
en un repositorio privado, no detiene nada y no escribe nada en la instalación; sale con 3 cuando no puede
decirlo. La web pregunta una vez al día, sin credenciales: en un repositorio privado, Administración › Copias y
sistema dice «No se pudo comprobar si hay una versión nueva» y da ese comando. Pregunta `OBSY_BRAIN_REPO_URL`
en `.env`, que `install --repo` deja sin credenciales; vacío, la web nunca pregunta.

La versión nueva se trae y se construye mientras la instalada sigue sirviendo. Después obsybrain entra en
mantenimiento: rechaza escrituras con «obsybrain está en mantenimiento, reintenta en N segundos» (la web
muestra una banda en cada página); las lecturas siguen. Se hace una copia de todo (`…-pre-update.rscb`), se
migran los datos y arranca la versión nueva; cuando responde como la versión pedida, las escrituras vuelven.
Si la migración o el arranque falla, se restaura la copia, vuelve a arrancar la versión anterior y el lanzador
sale con 4: nada escrito antes de la actualización se pierde, y sesiones, tokens y conexiones siguen
funcionando. Administración › Copias y sistema muestra cómo fue la última actualización, y `last-failure.log`
guarda las últimas líneas del servicio. Una actualización necesita espacio libre en disco para el doble de la
última copia y 1 GB más, y solo avanza (nunca a una versión más vieja; un release va después de sus release
candidates, y `0.2.0-rc.2` después de `0.2.0-rc.1`). Lo que cambia cada versión está en
[CHANGELOG.md](CHANGELOG.md) y en sus notas de release.

Mientras el servicio está parado (la migración, el arranque y todo el restore de la vuelta atrás), un pequeño
sustituto ocupa su puerto y su nombre: un navegador ve una página con el paso actual, y cualquier otra cosa
recibe 503 con `Retry-After` y la misma respuesta `under_maintenance` que una escritura rechazada. Una
instalación cuyo `compose.yaml` todavía no tiene sustituto (actualizada con `--image` desde antes) lo recibe
con su próxima actualización desde una versión.

Un Ctrl-C durante una actualización vuelve atrás de la misma manera (un segundo Ctrl-C no la detiene). Si
matan al lanzador de golpe una vez la versión nueva tomó el control (un corte de luz), el próximo `status`, o
cualquier comando que cambie algo, encuentra la nota que dejó en `.obsybrain/update.pending` y vuelve atrás
primero. Si la copia se restauró pero la versión anterior no arranca, el lanzador lo dice: los datos están, y
`sh obsybrain.sh install` vuelve a arrancarla. Si la copia no se puede restaurar, todo comando posterior lo
dice (y `status` falla) hasta que un `restore` de esa copia salga bien.

La vuelta atrás corre en una sesión propia, así un Ctrl-C en la terminal no puede cortarla: con `setsid`, o
con `perl` donde no hay `setsid` (macOS). Una máquina que no tiene ninguno la ejecuta como cualquier otro
paso: ahí, no pulses Ctrl-C mientras vuelve atrás.

### Actualizar desde la web (apagado hasta que lo actives)

Por defecto solo la terminal actualiza. Para que un administrador pueda hacerlo desde la web:

```sh
sh obsybrain.sh web-updates enable [--repo-token-file F | --repo-key F]   # then: status, disable
```

Esto arranca un contenedor propio, el actualizador, como proyecto de compose aparte del del servicio
(`<name>-updater`). **Tiene control total de Docker en esta máquina: quien lo controle controla el servidor**,
y `enable` lo dice y pregunta (o exige `--yes`). No publica ningún puerto y no está en ninguna red del
servicio ni del panel de LaKademIA. Monta exactamente tres cosas: el socket de Docker, la carpeta de instalación en su
propia ruta y una lista de usuarios con el suyo dentro, de solo lectura. El servicio nunca recibe de él
Docker, una credencial ni la clave de instalación: solo deja una marca vacía en `update/request`, que el
actualizador mira sin abrirla, y lee `update/report` (solo lectura) para conocer la versión más nueva. Un
repositorio privado necesita acceso de lectura que funcione desde esta máquina: `--repo-token-file` (un
archivo con una línea, para una dirección https) o `--repo-key` (una clave privada SSH, para una SSH). El
archivo se copia a `updater/credentials` (legible solo por su dueño); nada va en una línea de comandos.
`enable` comprueba que el repositorio responde con ella, desde un contenedor como el del actualizador, antes
de arrancar nada.

El actualizador ejecuta el mismo `update` que la terminal, siempre para la versión publicada más nueva que
encontró él mismo, sea lo que sea la marca. Una versión que falló se intenta una vez; **Reintentar** permite
como máximo 3 reintentos, con 15 minutos de separación, y después de eso solo la terminal puede intentar esa
versión (el lanzador lo dejó todo en su sitio cada vez). Si la máquina se para a mitad, el actualizador
termina de deshacer la actualización cuando arranca. Después de una actualización se reinicia desde los
archivos de la versión nueva; si cambió su compose o su imagen, ejecuta `web-updates enable` otra vez.

Con el actualizador activado, Administración › Copias y sistema muestra **Actualizar a vX.Y.Z** cuando hay una
versión más nueva publicada. Un administrador con sesión en la web confirma con su contraseña (y el código de
su app de autenticación, con segundo factor); una incorrecta cuenta como intento fallido y no pide nada. La
petición es un archivo vacío: lo demás que mande el navegador se ignora, el actualizador elige la versión él
mismo. Dos administradores a la vez arrancan una sola actualización; al otro se le dice que ya hay una. La
página la sigue, dice «Actualizado de X a Y.» al final, o cuándo y por qué falló con **Reintentar** (dentro de
los límites de arriba; pasados, da el comando). Mientras el servicio se reinicia, responde la página
sustituta. Una clave, una app, un token o una cuenta de servicio nunca pueden pedirla.

`web-updates disable` quita el contenedor, la imagen y la credencial, y la web vuelve a mostrar el comando. En
una instalación hecha por el panel de LaKademIA no hay botón: `web-updates enable` sale con 2 y te dice que la
actualices desde el panel de LaKademIA.

### La clave de instalación

El instalador crea la clave de instalación y la guarda en `.env`, que solo su dueño puede leer. Abre cada
copia: sin ella una copia no se puede restaurar. Guárdala en un gestor de contraseñas. `sh obsybrain.sh key
show` la imprime otra vez (pregunta primero); la configuración inicial y Administración › Copias y sistema
también te la dan.

```sh
sh obsybrain.sh key rotate
```

crea una clave nueva: obsybrain se para un momento, todo lo sellado (segundos factores, la contraseña del
correo, la clave del proveedor de significado) se sella otra vez con la clave nueva, y vuelve a arrancar.
Sesiones, tokens y conexiones siguen funcionando. Las copias hechas antes necesitan la clave anterior: se
conserva en `installation-key-<id>.txt` junto a `.env` (solo la lee su dueño), y la web marca esas copias
«Necesita la clave anterior». Guarda la clave nueva en lugar de la vieja. Si una rotación se para a mitad, la
clave nueva queda en `.obsybrain/env.rotated` (los datos pueden estar ya sellados con ella): ejecuta
`key rotate` otra vez y termina con esa clave. Hasta entonces `install`, `update`, `backup`, `restore` y
`uninstall` se niegan, y `status` avisa.

### Las copias

obsybrain hace una copia cifrada cada día a las 03:00 y guarda las últimas 14, en `backups/`.

```sh
sh obsybrain.sh backup                    # a copy now
sh obsybrain.sh backups                   # the list
sh obsybrain.sh restore --file obsybrain-20261101T030000Z-manual.rscb --confirm "<installation name>"
```

`--file` toma un nombre como lo imprime `backups` (una copia en `backups/`) o la ruta de una copia traída de
otro lado. Restaurar reemplaza todo con la copia, después de hacer una copia de lo que hay. `--confirm` toma
el nombre de la instalación como lo muestra la web. Para restaurar en otra instalación, pasa la clave de la
instalación de la copia en un archivo con `--key-file`. Después cada clave, sesión y conexión hecha antes
deja de funcionar: todos inician sesión otra vez, y la administración emite claves nuevas para programas.

### Desinstalar

```sh
sh obsybrain.sh uninstall
```

Esto para obsybrain y quita sus contenedores. La base de datos, las copias y la clave se quedan: ejecutar
`install` otra vez lo devuelve todo como estaba. Para borrar también los datos:

```sh
sh obsybrain.sh uninstall --delete-data --confirm obsybrain
```

`--confirm` toma el nombre de la instalación en esta máquina (`--name` al instalar; `obsybrain` por defecto).
Con PostgreSQL propio, la base de datos y las copias también se van. Con un PostgreSQL existente, pasa
`--db-admin-url-file` para quitar también su base de datos y rol; sin él, el desinstalador te dice qué
quitar. La clave de instalación se conserva en `installation-key.txt` para las copias que descargaste. Solo
quita lo que él creó: sus contenedores, red y volúmenes, y sus propios archivos.

Tus añadidos propios a los contenedores van en `compose.override.yaml` junto a `compose.yaml`; el lanzador lo
conserva y lo carga. Cambia la configuración ejecutando `install` otra vez, nunca editando `.env` o
`compose.yaml`: el puerto publicado y `OBSY_BRAIN_PUBLISH` tienen que seguir siendo un solo valor.

## Desarrollo

Requisitos: Node 25 y, para la suite completa de tests, PostgreSQL 17 o más nuevo.

```sh
npm install
npx playwright install chromium   # once, for the browser tests of the web
npm run verify      # lint, types, build, tests, the web in a browser, audit
```

`scripts/verify.sh` corre los tests contra un PostgreSQL real: el servidor en `OBSY_BRAIN_PG_URL`, o, cuando
los binarios de PostgreSQL están instalados, un clúster local desechable en `.pg-test/` (puerto 55432) que
arranca por ti (`npm run pg:stop` lo para). Sin ninguno de los dos, los tests de PostgreSQL se saltan, como en
CI.

`npm run test:install` construye la imagen del contenedor y la corre con Docker (solo local; se salta sin
`OBSY_BRAIN_INSTALL_TESTS=1`, y siempre en CI).

`node scripts/bench-search.ts` (con `OBSY_BRAIN_PG_URL`) carga 10 000 páginas y 100 000 entradas en una base
de datos desechable y mide 100 búsquedas variadas; el 95 % tiene que responder en menos de un segundo.

## La web

`obsybrain serve` también sirve la web de obsybrain, en la misma dirección que la API: ábrela en un navegador
para hacer la configuración inicial, iniciar sesión, aceptar una invitación o restablecer una contraseña.
`npm run build` la construye en `dist/web`; sin esa carpeta el servidor responde la API como siempre y dice
que la web no está construida. La web solo llama a la API en `/v1` (con los mismos permisos que tiene un
programa) y nunca responde en `/v1`, `/mcp`, `/oauth` o `/.well-known`. Pulsa `?` en cualquier pantalla para
ver los atajos de teclado.

Para trabajar en la web: `obsybrain serve` en el puerto 4100, y después `npm run web:dev` (Vite en el puerto
5173, que reenvía la API a 4100).

Los tests de la web corren en Chromium. `npm run test:web` usa un fixture de la API (sin base de datos; cada
una de sus respuestas se comprueba contra la descripción de la API), como hace CI. `npm run test:e2e` corre
contra el servidor real y el PostgreSQL en `OBSY_BRAIN_PG_URL`; `verify.sh` lo corre cuando ese PostgreSQL
responde y dice por qué lo saltó en caso contrario. `node test/web/fixture/main.ts` arranca el fixture en el
puerto 4173 para recorrer la web a mano: abre `/__fixture/use?preset=signed-in` (o `fresh`, `signed-out`,
`insecure`).

Más sobre la web, sus capas de tests y las reglas de su fixture: [web/README.md](web/README.md). Los
navegadores se niegan a algunos puertos sin más (4190, 6000, 6566, 10080 y el resto de los «bad ports» del
estándar Fetch): una instalación en uno de ellos responde `curl` pero no la web, el puente ni los hooks.

## Búsqueda por significado (opcional)

Apagada por defecto; la búsqueda por palabras funciona sin ella. El servidor ofrece un proveedor cuando su
configuración está presente, y la administración la activa en la web, aceptando que el texto se envía al
proveedor:

- `OBSY_BRAIN_OPENAI_KEY` — OpenAI, modelo `text-embedding-3-small`;
- `OBSY_BRAIN_OLLAMA_URL` — un Ollama local, modelo `nomic-embed-text`.

Un curador puede excluir un brain: se borran sus vectores y no se envía nada más de él.

## Mejor orden con extensiones opcionales

La búsqueda funciona en cualquier PostgreSQL 17 o más nuevo con `unaccent`. Dos extensiones opcionales mejoran
el orden de los resultados; obsybrain las usa cuando están instaladas en su base de datos y funciona como
siempre cuando no:

- **`pg_search`**: los resultados se ordenan por BM25, así una palabra rara pesa más que una común repetida, y
  una palabra en el título pesa el doble que la misma palabra en el texto. Las palabras siguen coincidiendo sin
  acentos y en sus formas española e inglesa, y las frases entre comillas y las palabras excluidas filtran como
  siempre.
- **`pgvector`**: con la búsqueda por significado activada, la cercanía se calcula con su operador. Palabras y
  significado se mezclan por fusión de rango recíproco, así un resultado encontrado por las dos vías va antes
  que uno encontrado solo por una.

obsybrain nunca las instala (su rol de base de datos no es superusuario). Un administrador las crea en la base
de datos de obsybrain, como superusuario:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_search;
```

En su próximo arranque obsybrain crea el índice que necesita, con su propio rol (no hace falta ningún otro
grant), y dice en su log qué usa la búsqueda (`"event":"search","code":"bm25"`). Si el índice no se puede
crear, el log dice `"event":"search_index_failed"` con el código de error de la base de datos, obsybrain
arranca igual y la búsqueda conserva su propio orden.

## Personas, claves y correo

- La administración invita a personas por correo a los brains, cada una con un rol: curator, contributor o
  reader. El enlace funciona una vez, durante 72 horas. Sin correo, la administración lo copia desde la web.
- Las personas crean sus propios tokens para agentes en su perfil: lectura, o lectura + escritura, por 30, 90
  o 365 días. Un token se muestra una vez. Nunca hace más de lo que permite el rol actual de su persona.
- Las cuentas de servicio (como el panel de LaKademIA) reciben una clave principal, y pueden tener dos a la vez para
  rotar sin corte. Con ella acuñan claves cortas, una por tarea.
- El correo es opcional. Configura la cuenta de envío en la web. Su contraseña se guarda sellada con
  `OBSY_BRAIN_SECRET`. El log del correo guarda quién, de qué tipo, cuándo y cómo acabó, nunca el contenido.

## Escribir directamente en el wiki

Por defecto un agente propone cambios en el wiki y un curador los aprueba en la web. Un curador puede dejar
que una clave escriba en el wiki de su brain directamente: en el perfil, sobre un token («Puede escribir en el
wiki de …»), al crearlo o después. El permiso es por clave y por brain, solo lo da un curador de ese brain (en
la web, nunca con una clave), y cualquier curador se lo quita; cuenta desde la siguiente petición.

- Una clave con el permiso envía las mismas operaciones que una propuesta (`brain_write`, o
  `POST /v1/brains/:slug/wiki/write`), comprobadas igual. Se aplican en el momento, todas o ninguna, cada
  página con una revisión nueva y el cambio con una línea en el log que dice qué clave lo escribió. Se deshace
  como cualquier otro cambio: vuelve a una revisión. Repetir una escritura con el mismo `requestKey` no
  escribe nada dos veces.
- Una clave sin el permiso recibe `403 wiki_write_not_allowed`, que dice cómo proponer en su lugar.
- Una clave corta de un servicio escribe con el permiso de la clave principal que la creó.

### Decidir propuestas con una clave

El mismo permiso deja que una clave decida las propuestas de ese brain, como hace un curador en la web. Las
lista (`brain_proposals` con `"mine": false`), lee una como la ve un curador, con su `fingerprint`
(`brain_review`, o `GET /v1/proposals/:id/review`), y la decide (`brain_decide`, o
`POST /v1/proposals/:id/approve` y `POST /v1/proposals/:id/return`):

- aprobarla entera; aprobar las operaciones en `approve` y devolver el resto con un `comment`; corregir una
  operación en `corrections` y aprobar; o devolverla entera con un `comment`. Lo aprobado se aplica todo a la
  vez o nada, y una operación necesita aquellas de las que depende.
- Solo se aprueba lo que se leyó: un `fingerprint` que ya no coincida recibe `409 proposal_changed` con la
  revisión actual, y no se aplica nada. Una propuesta ya decidida recibe `409 already_decided`.
- El log y la actividad dicen quién decidió y con qué clave. El agente que propuso recibe el comentario como
  corrección. Repetir una decisión con el mismo `requestKey` decide una vez y devuelve el mismo resultado.
- Una clave sin el permiso recibe `403 web_only`. El permiso se comprueba en cada petición, así que quitárselo
  entre leer y decidir rechaza la decisión.

### Avisos antes y después de un cambio

Una propuesta, una escritura directa y una comprobación que no escribe nada (`brain_check`, o
`POST /v1/brains/:slug/wiki/check`) responden con lo que el cambio dejaría incoherente, calculado sobre el
wiki tal como quedaría después: `duplicate_title`, `broken_link`, `orphan_created`, `stale_page` y
`open_conflict`, cada uno con las páginas sobre las que trata. Vienen con `neighbours`, las páginas enlazadas
a lo que el cambio toca, para que el agente las lea buscando contradicciones. Los avisos nunca bloquean.

### La limpieza diaria

Una limpieza es una propuesta o una escritura directa marcada `"maintenance": true`. Cuando nadie limpió un
wiki en las últimas 24 horas, ninguna espera aprobación y su salud tiene problemas, se pide a un agente que
empiece a trabajar en el brain (`mem_context`) que lo limpie, con el informe de salud. La pantalla Salud dice
cuándo fue la última limpieza.

## Conectar agentes con el inicio de sesión estándar

Los agentes que soportan el inicio de sesión MCP (OAuth 2.1 con PKCE) encuentran obsybrain por
`/.well-known/oauth-protected-resource` y `/.well-known/oauth-authorization-server`. Abren el navegador de la
persona. La persona inicia sesión, elige qué brains compartir (lectura, o lectura + escritura) y vuelve al
agente, sin copiar ninguna clave.

- Una clave de acceso dura una hora. El refresh token cambia en cada uso, y volver a usar uno viejo termina la
  conexión.
- Una conexión termina después de 90 días sin uso, o un año en total. Las conexiones se ven en el perfil, en
  «Apps conectadas», donde se pueden revocar.
- Los clientes pueden presentarse con un documento de metadata (una dirección https que obsybrain trae con
  protecciones contra llegar a redes privadas) o registrarse dinámicamente.

## Agentes por MCP

obsybrain sirve MCP en `/mcp` (Streamable HTTP; protocolo `2026-07-28`, y `2025-11-25` / `2025-06-18` para
clientes más viejos). Un agente se conecta con el inicio de sesión estándar o un token personal, y al
conectarse recibe un protocolo corto: resuelve su brain, lee el contexto, busca antes de decidir, guarda
mientras trabaja, nunca guarda secretos, cierra con un resumen.

- Herramientas: `brain_list`, `brain_resolve`, `mem_context`, `mem_session_start`, `mem_save`, `mem_update`,
  `mem_suggest_topic`, `mem_relate`, `mem_forget`, `mem_session_summary`, `mem_session_end`,
  `mem_search`, `mem_get`, `mem_timeline`, `brain_page`, `brain_neighbors`, `brain_map`,
  `brain_health`, `brain_compile_pack`, `brain_check`, `brain_write`, `brain_propose`, `brain_proposals`,
  `brain_review`, `brain_decide`, `brain_withdraw`, `brain_create`. Una clave solo ve las herramientas que
  puede usar.
- Cada herramienta ejecuta la misma ruta `/v1` que ejecutaría un programa, con la misma clave: las mismas
  comprobaciones, límites y resultados.
- Los curadores enlazan repositorios a su brain, así un agente lo encuentra con `brain_resolve`.

## Conecta tu agente

`GET /v1/connect` (cualquier clave) da, para Claude Code, Codex, OpenCode, Cursor y otros agentes:

- **Inicio de sesión estándar:** solo la dirección MCP (`<tu instalación>/mcp`); el agente abre el navegador.
  Claude Code: `claude mcp add --transport http obsybrain <dirección> --scope user`, y después
  `claude mcp login obsybrain`. Codex: `codex mcp add obsybrain --url <dirección>`, y después
  `codex mcp login obsybrain`. OpenCode: un servidor `remote` en `opencode.json`. Cursor: `{"url": …}` en
  `.cursor/mcp.json`.
- **Con un token:** un bloque de configuración por agente. El token se pega en un prompt oculto dentro de un
  archivo que solo tú puedes leer (`~/.config/obsybrain/<agent>.token`, modo 600), nunca en una línea de
  comandos. Cada agente tiene una variable propia, cargada desde ese archivo, así dos agentes nunca se pisan
  un token, y un `.mcp.json` compartido nunca lo contiene: Claude Code `.mcp.json`
  (`"Authorization": "Bearer ${OBSY_BRAIN_TOKEN_CLAUDE_CODE}"`), Codex `~/.codex/config.toml`
  (`url` + `bearer_token_env_var = "OBSY_BRAIN_TOKEN_CODEX"`), OpenCode `opencode.json`
  (`{env:OBSY_BRAIN_TOKEN_OPENCODE}`), Cursor `.cursor/mcp.json` (`${env:OBSY_BRAIN_TOKEN_CURSOR}`).
  Otros agentes usan `OBSY_BRAIN_TOKEN` y `~/.config/obsybrain/token`, el del puente. El kit solo lleva un
  placeholder (`tokenPlaceholder`); la web lo rellena una vez, cuando creas el token allí.
- **El recordatorio opcional:** para Claude Code, dos hooks (más abajo). Otros agentes reciben un texto para
  su archivo de instrucciones (`AGENTS.md`) y el prompt `close_session` del servidor.
- **La comprobación:** pregúntale a tu agente: *«¿Qué sabe este brain sobre X?»*

`?agent=codex` devuelve un solo agente; `?brain=<slug>` nombra el brain en la comprobación y el hook de
inicio.

### El puente, para agentes que solo arrancan programas MCP locales

```sh
mkdir -p ~/.config/obsybrain && (umask 077 && printf 'Token: ' && read -rs t && : > ~/.config/obsybrain/token && chmod 600 ~/.config/obsybrain/token && printf '%s\n' "$t" > ~/.config/obsybrain/token && echo saved)
obsybrain bridge --url https://brain.example.com/mcp
```

Como servidor MCP local: `{"command": "obsybrain", "args": ["bridge", "--url", "<dirección>", "--token-file",
"~/.config/obsybrain/token"]}`. El puente lee un mensaje JSON-RPC por línea en stdin y manda cada uno a
`/mcp` con el token y las cabeceras que el servidor comprueba; las respuestas van a stdout, las notificaciones
no llevan ninguna. Habla con clientes modernos y con los más viejos que arrancan con `initialize`. El token
viene de `--token-file`, si no `OBSY_BRAIN_TOKEN`, si no `~/.config/obsybrain/token`; no hay opción para
pasarlo en la línea de comandos, y nunca se imprime. Un `http` plano se rechaza salvo a esta máquina. Cuando
obsybrain no responde, la petición recibe un error JSON-RPC que lo dice y cómo seguir; el puente sigue
corriendo.

### El recordatorio de Claude Code

```json
{
  "hooks": {
    "SessionStart": [{ "matcher": "startup|resume|clear|compact",
      "hooks": [{ "type": "command", "command": "obsybrain hook session-start --url <address>", "timeout": 15 }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "obsybrain hook stop --url <address>", "timeout": 15 }] }]
  }
}
```

- `hook session-start` ejecuta `git remote get-url origin` en la carpeta de la sesión, le pregunta a obsybrain
  qué brain está enlazado a ella (`/v1/resolve`) y añade el contexto de ese brain a la sesión.
  `--brain <slug>` se usa cuando no hay ningún brain enlazado al repositorio.
- `hook stop` pregunta a `GET /v1/me/sessions` si el token todavía tiene una sesión de brain abierta (trabajo
  guardado sin resumen). Si la tiene, le pide a Claude, una vez por sesión de brain y sesión de Claude Code,
  cerrarla con `mem_session_summary`. Deja que Claude pare cuando `stop_hook_active` está puesto.
- Los dos necesitan un token (como para el puente) y fallan abiertos: sin token, con una entrada incorrecta u
  obsybrain caído, no imprimen nada y dejan que la sesión siga.

El comando `obsybrain` viene con este paquete: desde un clon, `npm install && npm run build && npm link`.

## La API para programas

Todo lo que hace una herramienta es también una ruta `/v1`, con las mismas claves y permisos. La descripción
de la API está en `GET /v1/openapi.json` (OpenAPI 3.1, sin clave: describe rutas y no contiene datos). La
versión 1 es un contrato: sus rutas y los campos principales de sus respuestas no cambian; un cambio que rompe
va a `/v2`, y `/v1` sigue funcionando a su lado.

- **Los errores** llegan siempre como `{ "error": { "code", "message", "howToProceed" } }`.
- **Límite de peticiones:** cada clave puede hacer 600 peticiones por minuto por defecto. Más allá, la
  respuesta es 429 `rate_limited`, con `Retry-After` y `retryAfter` en segundos; por MCP la misma negativa
  llega como error JSON-RPC. La administración cambia el límite con `PUT /v1/admin/settings`
  (`{ "rateLimit": 1200 }`). El contador vive en la memoria del proceso del servidor.
- **Respuestas acotadas:** ninguna respuesta pasa de 256 000 caracteres. Las listas van por páginas y dicen
  cómo pedir la siguiente. Una respuesta que aun así pasaría el límite se corta: llega como
  `{ "cut": { "message", "howToProceed", … }, "partial": "…" }` con la cabecera `X-Brain-Cut: true`.

## Seguir un brain en vivo

`GET /v1/brains/:slug/events` es un flujo de Server-Sent Events: sesiones abiertas y cerradas, entradas
guardadas y cambiadas, búsquedas, lecturas, propuestas enviadas, retiradas y decididas, y cambios en el wiki.
Cada evento lleva su id, hora, brain, tipo, quién y con qué clave (y la referencia externa de una clave
corta), y el id y título o dirección de lo que toca; una búsqueda lleva el texto buscado, ya depurado. Nunca
lleva el cuerpo de una entrada ni de una página.

- **Quién ve qué:** los curadores lo ven todo. El resto ve cada cambio y propuesta, y solo sus propias
  búsquedas y lecturas (una cuenta de servicio: lo que hicieron cualquiera de sus claves; una clave corta de
  agente: lo que hizo ella misma).
- **Ids y orden:** el id de un evento es su lugar en el orden de entrega, que es el orden en que los eventos
  se hicieron visibles; los ids crecen a lo largo de un flujo. Una escritura cuya transacción tarda recibe un
  id posterior, nunca ninguno. Una sesión sin actividad durante 24 horas se cierra sola, con un evento
  `session.closed` sin `who`.
- **Retomar:** reconecta con `Last-Event-ID` (o `?lastEventId=`) para recibir lo que te perdiste, en orden, de
  las últimas 24 horas. Si te perdiste eventos más viejos, un evento `gap` lo dice primero: ponte al día con
  las listas (propuestas pendientes, sesiones recientes). Un id por delante del evento más nuevo (una
  instalación restaurada desde una copia) también recibe un evento `gap`, y el flujo sigue desde ahora.
- **Vitalidad:** los eventos llegan en menos de 2 segundos; una línea de comentario cada 15 segundos evita que
  los proxies corten la conexión. La clave y el rol se comprueban cada 2 segundos: una clave revocada o un rol
  cambiado termina el flujo con un evento `closed` que dice por qué.
- Un poller lee los eventos nuevos de cada flujo abierto y les da sus ids. Una instalación corre como un solo
  proceso de servidor.

## Auditoría

Cada inicio de sesión, invitación, cambio de rol, clave, conexión, purga y cambio de configuración queda
registrado. La administración lo lee con filtros y lo descarga como CSV. Los curadores ven la parte de su
brain. La base de datos se niega a cambiarlo o borrarlo.

## Detrás de un proxy inverso

obsybrain acepta una contraseña solo por una conexión cifrada, o desde la misma máquina. Un proxy inverso en
la misma máquina tiene que enviar por eso `X-Forwarded-For` y `X-Forwarded-Proto` (nginx:
`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` y
`proxy_set_header X-Forwarded-Proto $scheme;`). Lista la dirección propia del proxy en
`OBSY_BRAIN_TRUSTED_PROXIES`. Sin esas cabeceras, todo lo que reenvía el proxy parece local.

## En un contenedor

`docker build -t obsybrain .` construye la imagen: el servidor, la web y las migraciones en Node 25, corridas
por un usuario sin privilegios, sana cuando `GET /v1/health` responde. `obsybrain serve` es su comando;
`docker run --rm obsybrain obsybrain version` imprime la versión. Las copias van a `/backups`.

En un contenedor, un navegador en la misma máquina llega por la gateway del contenedor, no desde
`127.0.0.1`, así que la regla de arriba rechazaría su contraseña. Cuando el puerto se publica solo en
`127.0.0.1`, pon `OBSY_BRAIN_PUBLISH=127.0.0.1:<puerto>` y `OBSY_BRAIN_LOCAL_ONLY=1`: una petición directa
de la gateway, sin cabeceras reenviadas y dirigida a `localhost`, `127.0.0.1` o `[::1]`, cuenta entonces como
esta máquina. El servicio se niega a arrancar con `OBSY_BRAIN_LOCAL_ONLY=1` y cualquier otro
`OBSY_BRAIN_PUBLISH`: publicado a la red, cada visitante llegaría desde la gateway y una contraseña la
cruzaría en claro. Nunca publiques el puerto en otro sitio a mano con la opción puesta; para acceder desde
otras máquinas usa un dominio con HTTPS.

`obsybrain db check | provision | drop` prepara un PostgreSQL existente (17 o más nuevo, con `unaccent`):
`provision` toma un login de administración (de un archivo o de la entrada estándar, nunca se conserva) y crea
un rol que no es superusuario y no puede crear bases de datos ni roles, y una base de datos a la que solo él
puede conectarse. `--isolate-from <base de datos>` también cierra la base de datos de otro programa, y la de
obsybrain a ese programa: cada otro login que pudiera conectarse allí recibe primero ese derecho por su
nombre (el comando los lista), y después la base de datos se cierra a todos los demás. `db drop` quita solo
una base de datos y un rol que `provision` creó. La nueva URL de conexión va a un archivo nuevo `0600`
(`--url-file`) o se imprime una vez.
