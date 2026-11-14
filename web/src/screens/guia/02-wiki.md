[← Índice](indice.md) · [← Anterior](01-brains.md) · [Siguiente →](03-diario.md)

# 02 · El wiki

El wiki es lo que el equipo sabe: páginas tipadas, con enlaces entre ellas y con las fuentes de donde salió cada cosa. Normalmente lo escriben los agentes — proponen y un curador aprueba —, pero un curador también edita a mano.

## El mapa del wiki

La pantalla **Wiki** agrupa las páginas «por tipo y por la primera parte de su dirección». Filtra con los campos «Filtrar el wiki»: por **palabras** (en el título, la dirección o el resumen), por **Tipo** (Todos los tipos, o uno), por **Etiqueta** y por **Estado**. «Mostrar todos» despliega listas largas; «Mostrar menos» las recoge.

![El mapa del wiki: las páginas agrupadas por tipo, con sus filtros](/guia-assets/03-wiki-map.png)

Cada página se muestra con su título, su resumen («una frase: se muestra en el mapa y en los resultados de búsqueda») y su estado.

### Tipos de página

| Tipo | Para qué sirve |
| --- | --- |
| **Tema** | Un área de conocimiento o un asunto del negocio |
| **Entidad** | Algo del mundo real: una persona, un cliente, un producto, un servicio |
| **Decisión** | Qué se decidió, cuándo y por qué |
| **Guía** | Cómo se hace algo aquí: convenciones, procedimientos |
| **Agente** | Instrucciones y memoria sobre un agente concreto |
| **Fuente** | El apunte de una fuente externa que se consultó |
| **Panorama** | La vista general de un área, que enlaza hacia las demás |

### Estados de una página

- **Vigente** — en regla.
- **Desactualizada** — «esta página puede estar desactualizada; un curador debería revisarla» (la definición exacta depende de los umbrales que curadores ajustan; mira [09 · Ajustes](09-ajustes-brain.md)).
- **Reemplazada** — otra página la reemplaza; el mapa te lleva a la que la sustituye.
- **Retirada** — «se conserva solo por su historial. Los agentes ya no la reciben».

Estos estados nunca van solo por color: siempre hay una palabra junto a la página.

## Una página del wiki

Al abrir una página se lee entera, con todo lo que le da contexto alrededor.

- **Sobre esta página**: su tipo, sus **Etiquetas**, su estado con su explicación en palabras, quién la escribió y cuándo («actualizada…»). Cada página muestra también su numeración de **Revisión**.
- **Dónde está esta página**: las migas de su dirección (`audience/retention`, por ejemplo).
- **Fuentes**: las entradas del diario y los enlaces de los que viene la página. Cada fuente se abre: la entrada del diario se lee aquí mismo («Abrir en el diario» abre su página); un enlace externo se abre aparte («Abrir»). Si una fuente fue olvidada o purgada, se dice así: «olvidada desde entonces; sus palabras ya no se conservan».
- **Enlaces**: «Desde esta página» y «Hacia esta página», cada uno con su **tipo de enlace** — Menciona, Relacionada con, Depende de, Parte de, Ejemplo de, Reemplaza a, Contradice a — y el estado de la otra página («todavía sin página», «desactualizada», «retirada»…).
- **Quién la leyó** (solo para curadores): personas y agentes que la leyeron o la recibieron en un contexto en los últimos 90 días, con el número de veces y la última fecha.
- **Cambios recientes**: las últimas revisiones, con acceso a «Todas las revisiones y sus diferencias» (ver Historial, abajo).
- **¿Algo está mal aquí?**: cualquier colaborador o curador puede **Añadir una corrección** — un aviso que los agentes reciben primero cuando su trabajo trata sobre esta página (ver [03 · El diario](03-diario.md)).

![Una página del wiki leída: el cuerpo, las fuentes, los enlaces y el historial alrededor](/guia-assets/07-wiki-page.png)

### Los enlaces `[[...]]`

En el cuerpo de una página (y en lo que proponen los agentes), `[[nombre-de-pagina]]` crea un enlace hacia otra página del mismo wiki. Al editar, escribe `[[` y obsybrain sugiere páginas: elige con las flechas y Enter. Un enlace `[[...]]` hacia una dirección donde todavía no vive ninguna página se conserva como recordatorio de una página aún por escribir: abre esa dirección y verás «No hay página en … — nada en este wiki tiene todavía esta dirección. Un enlace hacia ella se conserva como recordatorio de una página aún por escribir.»

Ojo: los dobles corchetes son cosa del contenido de los brains. En este manual y en cualquier otro texto normal de la web, los enlaces son los de siempre.

## Editar una página (curadores)

«Solo los curadores de este brain editan sus páginas a mano.» Si tu rol no alcanza, la web te lo dice y te da el camino: pedir el rol de curador, o pedirle a tu agente que proponga el cambio.

El formulario de edición tiene:

- **Título**.
- **Resumen**: una frase, se muestra en el mapa y en la búsqueda.
- **Etiquetas**: separadas por comas.
- **Cuerpo**: markdown. Con **Escribir** y **Vista previa**; el botón guarda con `Ctrl+Enter` (⌘ Enter).
- **Páginas para enlazar**: las sugerencias al escribir `[[`.
- **Fuentes**: la lista de entradas del diario y enlaces de donde viene la página. Puedes quitarlas, añadir una **entrada del diario** (buscándola por su título o texto; «Escribe palabras de su título o texto, y luego elígela con las flechas y Enter») o «un enlace» externo que empiece por `https://`.
- **Por qué (se muestra en el registro)**: opcional, pero recomendado — la línea queda en el Registro del wiki.
- **Enlaces tipados**: enlaces con un significado, de esta página a otra, que se añaden o quitan de inmediato. Eliges el **Tipo** (relacionada con, depende de, parte de, ejemplo de, reemplaza, contradice) y la página destino.
- **Estado y dirección**: cambiar el estado (con «Reemplazada por» apuntando a la página que la sustituye) y mover la página de dirección — «La dirección vieja sigue llevando aquí».

Al guardar, «Guardado como la revisión N». Cada guardado es una revisión nueva; nada se pierde nunca.

### Cuando alguien guarda mientras editas

Si otra persona (o un agente) guardó la misma página mientras la editabas, obsybrain no aplasta a nadie: te muestra «Alguien guardó la revisión N mientras editabas», con «Lo que cambió» y las opciones **Conservar ambos**, **Conservar el mío** o **Conservar el suyo**, parte por parte completa. El resultado se guarda encima de la suya y la suya queda en el historial.

## Historial y revisiones

Cada página conserva todas sus revisiones, con quién hizo cada una y por qué:

- **propuesta aprobada** — llegó de una propuesta aprobada.
- **escrita directamente** — la aplicó una clave con permiso, sin propuesta.
- **edición a mano** — la editó un curador en la web.
- **restaurada** — volvió una revisión anterior.
- **purga** — se purgó texto de la página.

Elige dos revisiones («Desde» / «Hasta», **Mostrar las diferencias**) y obsybrain te muestra lo **añadido** y lo **quitado**, parte por parte: Título, Resumen, Cuerpo, Etiquetas, Estado, Tipo, Dirección, Fuentes y Enlaces tipados. Desde cualquier revisión, **Restaurar la revisión N** crea una revisión nueva con su contenido — «Nada se elimina: las revisiones posteriores siguen en el historial».

## El grafo

La pantalla **Grafo** dibuja «cada página del wiki y cómo se enlazan». Las páginas retiradas no se dibujan; la lista las muestra con su estado. Cambia entre **Grafo** y **Lista** con «Mostrar como», y filtra por **Palabras** (título o dirección), **Etiqueta** y **Tipo de enlace** (menciona, relacionada con, depende de, contradice, reemplaza, parte de, ejemplo de, o «se enlaza con un grupo»).

![El grafo del wiki: las páginas dibujadas según cómo se enlazan](/guia-assets/06-wiki-graph.png)

En el grafo: las flechas mueven de página en página, **Enter** la abre en el **Inspector** (con sus datos, sus enlaces hacia dentro y hacia fuera, y el botón **Abrir página**), **Escape** lo cierra, **Más/Menos** hacen zoom, **0** ajusta todo, y arrastrar mueve una página con sus vecinas o el fondo entero. Con muchos nodos, obsybrain agrupa: «Este wiki tiene N páginas, así que se dibuja por grupos: la primera parte de cada dirección. Abre un grupo para ver sus páginas» — y dentro de un grupo grande lo divide de nuevo. El panel de **Comunidades** elige qué comunidades se dibujan; **Seleccionar todas** las devuelve. El **Foco** aísla una página a 1 o 2 saltos de distancia («Foco: 2 saltos» si lo prefieres más amplio).

En la vista **Lista**, lo mismo como tabla paginada: Título, Dirección, Tipo, Estado, enlaces hacia dentro y hacia fuera, Actualizada y acciones; ordenable por columna.

## Decisiones

La pantalla **Decisiones** junta «las páginas de decisión de este wiki, de la más nueva a la más vieja»: qué se decidió, cuándo («decidida …») y, abriendo cada una, por qué. Es la memoria de los porqués: la decisión que se tomó el martes dejó de discutirse aquí.

![La lista de decisiones del wiki](/guia-assets/04-wiki-decisions.png)

## Registro

El **Registro** es la columna vertebral del wiki: «una línea por cada cambio aplicado a este wiki, de la más nueva a la más vieja». Cada línea dice qué página, quién, cuándo y con qué tipo de cambio:

| Tipo | Qué es |
| --- | --- |
| **Propuestas aprobadas** | Cambios propuestos por un agente que un curador aprobó |
| **Escrito directamente por una clave** | Una clave con permiso escribió sin propuesta («por …, con la clave …») |
| **Ediciones a mano** | Ediciones de curadores en la web |
| **Revisiones restauradas** | Volver a una revisión anterior |
| **Purgas** | Texto eliminado (purgas de datos) |

Filtra por **Tipo de cambio** (Todos los cambios, o uno), por **Página** (su dirección, p. ej. `audience/retention`) y por **autor**; «Mostrar más» trae más líneas. Es la manera más directa de responder «¿quién cambió esto, y cuándo?».

![El registro del wiki: una línea por cada cambio aplicado, con filtros](/guia-assets/05-wiki-log.png)

## Siguiente

→ [03 · El diario](03-diario.md): sesiones, entradas y correcciones.
