[← Índice](indice.md)

# 00 · Empezar

## Qué es ObsyBrain

Cada agente de IA que usas arranca de cero. No recuerda la decisión que tomaste el martes pasado, el bug que ya arregló dos veces, el cliente al que no hay que llamar antes de las diez ni por qué el servicio de facturación está construido como está. ObsyBrain es donde ese conocimiento se queda: corre en tu propio servidor, y cada agente que se conecta lee lo que el equipo ya sabe antes de trabajar, y anota lo que aprendió después. Las personas deciden qué pasa a ser el registro de la empresa.

Un **brain** guarda lo que tú y tus agentes aprenden sobre un tema: un producto, un canal, un cliente. Dentro de cada brain hay tres lugares: el **Diario** (lo que los agentes hicieron y aprendieron, sesión por sesión), el **Wiki** (lo que el equipo sabe, en páginas con fuentes y enlaces) y las **Propuestas** (lo que los agentes proponen cargar al wiki, esperando a un curador).

Quien manda es siempre una persona: los agentes proponen; un curador, o una clave en la que el curador confía, decide. Y tus datos siguen siendo tuyos: autoalojado, licencia MIT, sobre PostgreSQL; ningún modelo corre en el servidor y ningún dato sale de él a menos que lo actives.

## Los cuatro pasos desde cero

### Paso 1 — Instalación

Necesitas Docker con Compose v2 y git. Descarga el lanzador desde un release publicado y compruébalo contra el SHA-256 de las notas del release:

```sh
curl -fsSLO https://github.com/JJRProDigital/obsybrain/releases/download/vX.Y.Z/obsybrain.sh
sha256sum obsybrain.sh   # debe coincidir con el SHA-256 de las release notes
sh obsybrain.sh install --local
```

`install --local` publica la web en `http://localhost:8090`, solo en esta máquina (con su propio PostgreSQL incluido). Para un servidor con dominio y HTTPS: `sh obsybrain.sh install --domain brain.example.com` — Caddy consigue y renueva el certificado solo. Hay más caminos (un PostgreSQL existente, compartirlo con el panel de LaKademIA, modo sin preguntas): todos están en el README, sección **Instalación**.

La instalación vive en `~/obsybrain` (`--dir` la mueve): su configuración en `.env`, las copias en `backups/`. Abrir `install` otra vez conserva la clave, las contraseñas, los datos y las copias; solo aplica lo que cambies.

### Paso 2 — Cuenta y primer brain

Al abrir la web por primera vez corre la configuración inicial, una sola vez: **Configurar obsybrain** pide tres cosas — un **Nombre para esta instalación** (lo que la gente ve en la cabecera y en los emails), la **Dirección que abre la gente** y **Tu cuenta de administrador** (nombre, email y una contraseña de 12 a 200 caracteres; unas pocas palabras sin relación entre sí hacen una buena).

Justo después llega el paso **Clave de instalación**: obsybrain cifra con esa clave cada copia de la instalación y, sin ella, ninguna copia puede restaurarse. **Guarda la clave de instalación** fuera de esta máquina, en un gestor de contraseñas; se muestra allí una sola vez (puedes copiarla o descargarla como `.txt`, y más tarde volver a descargarla en Administración › Copias y sistema, con tu contraseña).

Después, en **Tus brains**: **Crea un brain para un tema** (nombre, dirección y para qué sirve) y **invita a las personas** que trabajan contigo — cada una recibe un email con un enlace que funciona una sola vez durante 72 horas; sin correo configurado, recibes el enlace para enviarlo tú.

### Paso 3 — Importar el starter pack de LaKademIA

El starter pack trae el conocimiento base ya estructurado: cómo se trabaja con IA, cómo se escriben prompts que funcionan, cómo se organiza el conocimiento, qué guardar y playbooks de trabajo diario. Con la terminal, desde la máquina donde corre ObsyBrain:

```sh
docker cp deploy/starter-pack obsybrain-app-1:/tmp/starter-pack
docker exec obsybrain-app-1 obsybrain import --brain TU_BRAIN --from /tmp/starter-pack --as TU_EMAIL
```

Reemplaza `TU_BRAIN` por la dirección (slug) de tu brain y `TU_EMAIL` por el de tu cuenta. Al terminar verás un resumen del tipo `Imported 6 pages and 9 entries (6 links)`: sus páginas están en el wiki (con sus enlaces) y sus notas en el diario. Las importaciones desde la web (un `.zip` de una carpeta `02-DOCS` o de una vault de Obsidian) entran solo en un brain vacío y se hacen desde **Ajustes › Importar**; las más grandes las importa un administrador desde la línea de comandos, como esta.

### Paso 4 — Conectar tu agente

1. En la web: **Perfil › Tokens** — crea un token con permiso de **Lectura y escritura** si el agente no puede usar el inicio de sesión del navegador; o usa la **Conexión estándar**, sin token: tu agente abre tu navegador una vez y tú apruebas allí.
2. En la web: **Conecta tu agente** — elige tu agente (Claude Code, Codex, OpenCode, Cursor, u otros) y sigue los pasos exactos que muestra la página: el comando listo para copiar, o el bloque de configuración con tu token.
3. La prueba final, en Claude Code:

```sh
claude mcp add --transport http obsybrain http://localhost:8090/mcp --scope user
claude mcp login obsybrain
```

Después pregúntale a tu agente: «¿Qué sabe este brain sobre X?». Si responde con lo que el starter pack trae — no una respuesta genérica del modelo —, tu brain está vivo. La página **Conecta tu agente** lo comprueba en vivo: «Conectado» con la hora exacta en que tu agente alcanzó obsybrain. Todo esto se detalla en [07 · Conecta tu agente](07-agente.md).

## Tu pantalla de inicio: Tus brains

Al iniciar sesión llegas a **Tus brains**. Muestra cada brain al que perteneces, con su **Rol** (como lector, como colaborador, como curador), su tamaño (`páginas · entradas`), su última actividad y cuántas propuestas esperan tu revisión.

![La pantalla de inicio: los brains del usuario con su rol, tamaño y última actividad](/guia-assets/01-home.png)

Fíjate en estos controles:

- **Nuevo brain**: crea uno (solo quien tiene permiso de crear brains; los administradores siempre pueden).
- **Buscar**: abre el diálogo de búsqueda global (también con `⌘ K` o `Ctrl K`); ve [10 · Búsqueda y atajos](10-busqueda-atajos.md).
- **En números** («En tus brains»): la suma de **Brains activos**, **Páginas del wiki**, **Entradas del diario** y **Para que revises** (todas tus propuestas pendientes de decidir, en todos los brains).
- En cada brain: **Abrir** (o su tarjeta entera) lo lleva a su Resumen; «Nada para revisar» o «N propuesta(s) esperando a un curador» te avisa del trabajo pendiente; «Última actividad…» dice cuándo hubo movimiento por última vez.
- **Menú** y **Cuenta**: navegación, tema oscuro/claro, atajos, cerrar sesión.

Si tu cuenta todavía no pertenece a ningún brain, verás «Todavía no estás en ningún brain» y un botón para **Copiar mi email** y pedírselo a quien te invitó.

## Siguiente

→ [01 · Brains](01-brains.md): crear brains, el Resumen y todos sus paneles.
