[← Índice](indice.md) · [← Anterior](02-wiki.md) · [Siguiente →](04-propuestas.md)

# 03 · El diario

El diario es la materia prima: lo que agentes y personas escribieron en este brain, sesión por sesión, «de la más nueva a la más vieja. Abre una para leer sus entradas.» Los agentes escriben aquí mientras trabajan: se abre una sesión, llegan entradas, un resumen la cierra.

## Sesiones

La pantalla principal del diario lista las **Sesiones**. Cada una muestra su título o su propósito («Sesión sin propósito dado» si el agente no lo dio), su cliente — Claude Code, Codex, OpenCode, la web («Ediciones web · persona») o «Trabajo sin nombre · cliente» —, cuántas **entradas** tiene y su estado: **Abierta**, **Cerrada** o **Cerrada sin resumen**.

Filtros: **Estado** (Cualquier estado, o uno), **Cliente**, **Autor** (Cualquiera, o uno), **Tiene una entrada de tipo** (Cualquier tipo, o una de la lista abajo), **Referencia externa** (una parte alcanza, como `r_77` o un nombre de rama), **Activa desde** y **Activa hasta**, y «Solo con entradas aún sin pasar al wiki». **Aplicar filtros** / **Quitar los filtros**.

![Las sesiones del diario, con sus filtros](/guia-assets/08-journal-sessions.png)

Dentro de una sesión: **Resumen** (lo que cerró la sesión; «Leer el resumen completo» lo despliega), las **entradas** en orden y los datos de la sesión. Una sesión con mucho trabajo puede tener cientos de entradas: usa «Mostrar más».

## Una entrada

Cada entrada es una pieza de conocimiento que un agente (o una persona) guardó. Su página muestra:

- **Sobre esta entrada**: quién la escribió («Escrita por…»), en qué sesión («En…»), cuándo se guardó, su **revisión** («N, cambiada por última vez …») y cuántas veces se guardó si el agente la repitió («Guardada N veces — las repeticiones se cuentan, no se copian»).
- **Tema** y **Se aplica a**: si es para **Todos los agentes** o solo para uno.
- **Etiquetas** y **Referencias** externas.
- **Sobre**: la página del wiki o la entrada de la que trata.
- **Relaciones** con otras entradas (abajo).
- **Historial**: sus revisiones.

Los **tipos de entrada**, tal como los filtra la web:

| Tipo | Qué guarda |
| --- | --- |
| **Decisión** | Qué se decidió |
| **Aprendizaje** | Qué se aprendió |
| **Intento** | Qué se probó y cómo fue |
| **Corrección** | La corrección de una persona |
| **Preferencia** | Cómo se prefiere trabajar |
| **Dato** | Un hecho concreto |
| **Paso** | Un paso de un proceso |
| **Resumen** | El resumen que cierra una sesión |
| **Nota** | Todo lo demás |

### El ciclo de vida de una entrada

- **Fijada** — «siempre en el contexto inicial de los agentes»: cada agente la recibe al empezar a trabajar. Con **Fijar** se fija; con **Quitar fijado** se devuelve al flujo normal.
- **Revisar después de** — la fecha que le pongas la manda a «Para revisar» cuando pasa.
- **Vence el** — «Sale del contexto de los agentes después de …»: los agentes dejan de recibirla. **Vence el** muestra si ya venció.
- **Reemplazada** — «los agentes ya no la reciben. Lee la entrada que la reemplaza».
- **Con conflicto** — alguien marcó que contradice a otra entrada.
- **Olvidada** — sale de la búsqueda, del contexto y del diario ordinario; solo los curadores la ven, en **Olvidadas**.
- **Purgada** — su texto, sus versiones anteriores y su lugar en la búsqueda se eliminaron para siempre; las citas que otros lados hicieron de ella quedan.

## Qué puedes hacer con una entrada

Las acciones concretas dependen de tu rol: los lectores solo leen («pide el rol de colaborador…»), y una entrada solo la cambia su autor o un curador.

- **Editar esta entrada**: tu cambio se vuelve una revisión nueva; la anterior queda en su historial y «los agentes reciben el texto nuevo de ahora en más». Tienes **Título** y **Texto** («Qué, por qué, dónde, y qué se aprendió»). Si alguien la cambió mientras la corregías, la web te muestra «Su versión» y tu texto, y eliges.
- **Fijar / Quitar fijado**: los agentes la reciben en cada contexto inicial (o dejan de recibirla). Úsalo para lo que todo agente debería saber siempre.
- **Fechas de revisión y vencimiento**: **Revisar después de** y **Vence el** (déjalos vacíos para ninguna). Después de su fecha de revisión aparece en Para revisar; después de su vencimiento sale del contexto.
- **Relacionar con otra entrada…**: di cómo está esta entrada respecto a otra del brain — **contradice a la otra**, **reemplaza a la otra** (la otra sale del contexto de los agentes), **es reemplazada por la otra** (esta sale del contexto) o **no tiene relación con la otra** (y el par deja de marcarse). No es un gesto menor: solo su autor o un curador puede reemplazar una entrada o descartar una corrección como sin relación, y eso se aplica también a la otra entrada; la web lo avisa antes de guardar.
- **Olvidar…**: pide un motivo obligatorio («Los curadores la leen en Olvidadas; de 1 a 500 caracteres»). Sale de la búsqueda, del contexto y del diario ordinario; un curador puede **Recuperar** desde Olvidadas.
- Los curadores además ven **Correcciones vigentes sobre esta página** y el registro de lecturas.

## Añadir una corrección

Las correcciones son la voz de las personas dentro del contexto de los agentes, y van **primero**: «Va primero en el contexto de cada agente al que afecta, antes que cualquier página o entrada.» Se llega con **Añadir una corrección** (desde el diario, o desde «¿Algo está mal aquí?» en una página del wiki).

El formulario pide: **¿Sobre qué es?** (una página del wiki, una entrada del diario, o nada en particular — en los dos primeros casos reciben la corrección los agentes cuyo trabajo trata sobre ella; en el tercero la reciben todos, o solo el agente que nombres), **La corrección** («Qué está mal, y qué hacer en su lugar», p. ej.: «la API devuelve las fechas en UTC; conviértelas antes de mostrarlas») y un **título** de una línea que los agentes leen primero. Opcional: **Solo para un agente** con el nombre que el agente da al pedir contexto (como `reviewer` o `writer`). «Añadir corrección» la deja en el diario como cualquier entrada: los agentes la reciben desde su próximo contexto, y puedes editarla u olvidarla cuando deje de valer.

## Conflictos

«Entradas que dicen cosas opuestas, y lo que un agente preguntó sobre la corrección de una persona. Decide cuál prevalece: la reemplazada sale del contexto de los agentes.»

- **Estas dos se contradicen**: el par lado a lado. Cuando lo decides, la que conservas queda y la otra «queda marcada como reemplazada: sale del contexto de los agentes y de la búsqueda por defecto».
- **Sin relación** conserva ambas y deja de marcar el par como contradicción.
- Un agente también puede preguntar: «Un agente preguntó: …. Una persona decide.»

Deciden los autores de las entradas o un curador. Es irreversible desde la web: léelas antes de decidir.

## Olvidadas

Solo para curadores: «Entradas olvidadas por su autor o por un curador, con quién lo hizo y por qué. Recupera cualquiera de ellas.» Cada una muestra su motivo; **Recuperar** la devuelve a la búsqueda y al contexto de los agentes. Aquí no aparecen las purgadas: esas ya no existen.

## Para revisar

«Entradas cuya fecha de revisión pasó. Lee cada una; corrígela, olvídala, o quítale la fecha.» La web te dice «la revisión venció …». Con **Marcar como revisada** se quita su fecha de revisión: la entrada vuelve a estar en regla sin más cambios. Es tu lista de mantenimiento del conocimiento: entra de vez en cuando y déjala en cero.

## Entradas sobre una página

Desde una página del wiki («las entradas sobre esta página», en Diario) llegas a «Entradas sobre …»: cada entrada que nombra la página o la tiene como tema, escrita desde la última vez que la página cambió. Es la materia de la que la página nació, y lo que el diario siguió diciendo después.

## Siguiente

→ [04 · Propuestas](04-propuestas.md): el flujo de revisión de los cambios.
