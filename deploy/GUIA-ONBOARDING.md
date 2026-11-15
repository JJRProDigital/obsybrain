# ObsyBrain en 4 pasos

De cero a tu brain funcionando con un agente conectado. Todo el proceso lleva menos
de una hora.

---

## Paso 1 — Instalá ObsyBrain

Necesitás Docker con Compose v2 y git. Después, una terminal:

```sh
curl -fsSLO https://github.com/JJRProDigital/obsybrain/releases/download/vX.Y.Z/obsybrain.sh
sha256sum obsybrain.sh   # debe coincidir con el SHA-256 de las release notes
sh obsybrain.sh install --local
```

Esto levanta ObsyBrain en contenedores con su PostgreSQL incluido y abre la web en
`http://localhost:8090`. Para un servidor con dominio y HTTPS:
`sh obsybrain.sh install --domain brain.tudominio.com`.

> ¿No querés instalarlo en tu máquina? El camino recomendado es un VPS Linux pequeño:
> los pasos son los mismos y tu brain queda disponible desde cualquier lado.

## Paso 2 — Creá tu cuenta y tu brain

1. Abrí `http://localhost:8090` (o tu dominio). La primera pantalla te pide crear la
   cuenta administradora: nombre, email y contraseña.
2. Creá tu primer brain (nombre y para qué lo vas a usar). Vos quedás como su curador:
   aprobás propuestas y decidís qué entra.

## Paso 3 — Importá el starter pack de LaKademIA

El starter pack trae el conocimiento base ya estructurado: cómo trabajamos con IA,
cómo se escriben prompts que funcionan, cómo se organiza el conocimiento, qué guardar
y 4 playbooks de trabajo diario.

Con la terminal, desde la máquina donde corre ObsyBrain:

```sh
docker cp deploy/starter-pack obsybrain-app-1:/tmp/starter-pack
docker exec obsybrain-app-1 obsybrain import --brain TU_BRAIN --from /tmp/starter-pack --as TU_EMAIL
```

(Reemplazá `TU_BRAIN` por el slug de tu brain y `TU_EMAIL` por el de tu cuenta.)

Después de unos segundos vas a ver: `Imported 6 pages and 9 entries (6 links)`.
El overview de tu brain ya tiene el mapa de todo el material.

## Paso 4 — Conectá tu agente

1. En la web: **Perfil › Claves** — creá una clave con permiso de lectura y escritura.
2. En la web: **Conectá tu agente** — elegí tu agente (Claude Code, Codex, OpenCode,
   Cursor) y seguí los pasos exactos que te muestra la página (comando listo para
   copiar, o el bloque de configuración con tu token).
3. La prueba final, preguntale a tu agente:

   > **¿Qué sabés sobre cómo armar un prompt?**

   Si responde con la anatomía de un prompt del starter pack (no una respuesta
   genérica del modelo), tu brain está vivo. Esa es la diferencia: tu agente ahora
   contesta con tu conocimiento, no solo con el suyo.

---

## Ya tenés un brain. Ahora crece con vos.

- **Lo que el agente hace queda en el diario**: cada sesión registra qué se hizo, y
  vos lo revisás cuando quieras.
- **Lo que vale pasa al wiki**: el agente propone (una propuesta que aprobás desde el
  inbox); con el tiempo, el wiki se convierte en la memoria de verdad de tu trabajo.
- **Las decisiones tienen porqué**: las guardás en decisions con el contexto que las
  justifica, y la próxima discusión se evita sola.
- **Copias automáticas todos los días a las 03:00**: las últimas 14 copias, cifradas
  con tu clave de instalación (el launcher te la muestra y te la guarda en
  `~/obsybrain/installation-key.txt`). Guardala: es la única forma de abrir tus copias.

## Actualizar ObsyBrain

Las versiones nuevas salen como releases en GitHub; actualizar es un comando y es
seguro:

```sh
sh obsybrain.sh update
```

Hace todo solo: revisa si hay versión nueva, **hace una copia cifrada de todo antes
de tocar nada**, descarga y construye la versión nueva mientras la tuya sigue
funcionando, pasa los datos y reinicia. Si algo falla, **vuelve a la versión
anterior solo** — tus datos y tu clave quedan como estaban. Mientras actualiza, la
web muestra una página de mantenimiento y vuelve sola al terminar.

Comandos relacionados:

```sh
sh obsybrain.sh update --check   # solo mirar: qué versión corre, cuál es la nueva, qué cambia
sh obsybrain.sh backups          # la lista de tus copias
```

## Preguntas rápidas

- **¿Puedo usar otro idioma?** El producto está en español; los términos técnicos
  (prompt, agente, MCP) quedan en inglés porque así los encuentra en la documentación
  de las herramientas.
- **¿Qué pasa si se corta mi conexión?** El brain es local o en tu VPS: no depende de
  ningún servicio externo para funcionar.
- **¿Cómo lo apago y lo enciendo?** `sh obsybrain.sh uninstall` para los contenedores
  (los datos quedan); `sh obsybrain.sh install --local` para volver a levantarlos con
  los mismos datos.
