[← Índice](indice.md) · [← Anterior](03-diario.md) · [Siguiente →](05-salud-actividad.md)

# 04 · Propuestas

«Lo que los agentes proponen cambiar en el wiki. Un curador lo aprueba, aprueba parte, corrige o lo devuelve con un comentario del que el agente aprende.» Este es el corazón del contrato de ObsyBrain: los agentes proponen; las personas deciden.

## El inbox de propuestas

La pantalla **Propuestas** organiza por estado — «Propuestas por estado» — con una pestaña por cada uno: **Pendiente**, **Aprobada**, **Aprobada en parte**, **Devuelta**, **Retirada** y **Reemplazada**. Cada lista muestra: qué página(s) toca la propuesta, cuántos **cambios** reúne, quién la envió (el agente y su autor: «nombre-agente de persona», o solo la persona) y cuándo («enviada…»). La palabra del estado va siempre junto a la propuesta — pendiente, aprobada, devuelta… — nunca solo con color.

![El inbox de propuestas: la lista de pendientes y el detalle de una](/guia-assets/09-proposals.png)

Una propuesta marcada como «antigua» lleva más de 30 días esperando («Esperando desde hace más de 30 días»): los curadores deberían mirarla. La barra lateral cuenta siempre las pendientes («n para revisar»), y el Resumen del brain también.

Si no hay nada: «Nada espera revisión. Una propuesta llega cuando un agente compila el diario en el wiki. Pídele a tu agente: "compila el diario de este brain en el wiki".»

## Qué contiene una propuesta

Cada propuesta es un paquete coherente de cambios sobre el wiki:

- **Por qué**: lo que el agente escribió al proponerla.
- **Cambios**, numerados: **Página nueva**, **Editar**, **Mover**, **Enlazar**, **Quitar el enlace de**, **Marcar … con un estado**, **Fusionar** o **Restaurar a la revisión N**. Cada uno se muestra como **Antes / Después** del texto (con «Nada visible cambia en la página» cuando el cambio es de metadatos). Varios cambios pueden ir marcados «Estos van juntos»: o todos, o ninguno, porque el uno necesita el otro («el cambio 3 necesita los cambios 1 y 2»).
- **Fuentes**: las entradas del diario de donde salió cada cosa. Ábrelas y comprueba si el agente vio lo mismo que tú.
- **Avisos previos**: «Mira esto primero» — duplicate_title, broken_link, orphan_created, stale_page, open_conflict; lo que el cambio dejaría incoherente. Nunca bloquean, pero se leen antes de aprobar.
- **El estado de la base**: si la página cambió desde que el agente escribió, se dice — «Este cambio se escribió sobre la revisión N; la página está ahora en la revisión M. Aprobarlo reemplaza lo que cambia con su versión.» Antes de aprobar un cambio asentado sobre una versión vieja hay que **editarlo** o confirmar «Lo revisé — reemplazar los cambios más nuevos».

## El flujo de revisión (curadores)

Las opciones de decisión están en «Decidir»:

1. **Aprobar todo** — aplica todos los cambios, todos a la vez o ninguno. Después ves «Aprobada. Estas páginas cambiaron: …» con el enlace «Ver qué cambió en el registro del brain».
2. **Aprobar los elegidos y devolver el resto** — marca casillas y aprueba parte: apruebas cambio por cambio («Aprobar el cambio N»), y «lo que necesita viene con él». El resto vuelve al agente con tu comentario.
3. **Devolver** — nada cambia en el wiki; el agente aprende del comentario.
4. Antes de decidir puedes **Editar** un cambio: «Tu versión reemplaza a la propuesta cuando apruebas. La propuesta en sí no cambia.» Con **Usar mi versión** / **Deshacer mi edición**.

**El comentario («Comentario para el agente») es obligatorio** para devolver la propuesta o los cambios que no elijas: «Se conserva como una corrección que el agente lee la próxima vez.» Ese comentario es la palanca más importante del sistema: si concretas qué fallo viste, el agente no lo repite; si escribes «mal», reaparecerá.

La web te protege de las carreras: si alguien decidió mientras mirabas, te lo dice («decidió recién… Esta propuesta es de solo lectura ahora») y no se aplica nada; si la propuesta cambió en el ínterin, conservas tus elecciones y tu comentario sobre la versión nueva; si retiras tú la propuesta, «Retirada. Nada se aplicó.» Con selección parcial incompleta, la web guia: «Elige primero los cambios a aprobar», «Escribe en el comentario por qué vuelve el resto», «Todos los cambios están elegidos: usa "Aprobar todo"», y ofrece **Aprobar todos los N (ignorar mi selección)** si cambia de idea.

Al terminar, **Siguiente propuesta pendiente →** te lleva a la siguiente sin volver a la lista — en una ronda de revisión de veinte propuestas, media mitad de clics.

## Estados, en una fila

- **Pendiente** — esperando decisión.
- **Aprobada** — aplicada; las páginas cambiaron.
- **Aprobada en parte** — una parte entró; el resto volvió con comentario.
- **Devuelta** — nada se aplicó; el agente recibió el comentario.
- **Retirada** — su autor la retiró antes de la decisión.
- **Reemplazada** — «Su autor la reemplazó con una versión más nueva»: abre **Abrir la versión más nueva**.

## Cuando una clave decide

Por defecto se decide desde la web. Un curador puede dar a una clave el permiso de escribir y decidir directamente (mira [06 · Personas, Perfil y claves](06-personas-claves.md)): entonces un programa lista propuestas, las revisa y las decide él, siempre «sin o aprobar nada dos veces» — cada decisión se comprueba contra la versión que la clave leyó (`fingerprint`) y ninguna propuesta se decide dos veces. La Auditoría registra siempre quién decidió y con qué clave.

## Siguiente

→ [05 · Salud y Actividad](05-salud-actividad.md): lo que el wiki necesita y lo que está pasando ahora.
