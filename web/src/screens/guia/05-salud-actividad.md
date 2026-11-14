[← Índice](indice.md) · [← Anterior](04-propuestas.md) · [Siguiente →](06-personas-claves.md)

# 05 · Salud y Actividad

Dos pantallas miran el brain por ti: **Salud** (lo que el wiki necesita, una vez por visita) y **Actividad** (lo que está pasando ahora, en vivo).

## Salud

«Lo que el wiki encontró malo en sí mismo, sin IA. Cada ítem abre donde se corrige.» Los checks corren cada vez que abres la pantalla; no esperan a nadie.

![El informe de salud: las secciones con lo que hay que corregir](/guia-assets/10-health.png)

| Sección | Qué encuentra |
| --- | --- |
| **Enlaces rotos** | Un enlace hacia una dirección donde no vive ninguna página |
| **Conflictos** | Dos páginas enlazadas como contradiciéndose |
| **Páginas huérfanas** | Ninguna página enlaza hacia ellas, y ellas no enlazan hacia ninguna |
| **Páginas desactualizada** | Sin cambios por un tiempo, aunque el diario siguió escribiendo sobre ellas |
| **Fuentes ya no disponibles** | Una página cita una entrada que se olvidó o se purgó |
| **Páginas largas** | Por encima del límite de longitud de este brain: vale la pena dividirla |
| **Títulos casi iguales** | Posiblemente lo mismo dos veces: vale la pena fusionarlas |

«Nada que corregir» es la meta: sin enlaces rotos, conflictos, huérfanas ni páginas desactualizadas. Cada ítem muestra su detalle concreto — «`guia/emails` → `guia/opening` (falta la página)», «`guia/emails` (3 entradas más nuevas)» — y enlaza a su página. Con **Comparar** pones dos páginas lado a lado (útil para los títulos casi iguales: se decide cuál sobra).

### Pedir a un agente que corrija

Corregir el wiki es trabajo de curadores; si tu rol no alcanza, la pantalla lo dice y sugiere «Avisa a un curador» con sus nombres. Si eres curador (o cualquier persona que pueda usar un agente en el brain), **Pedir a un agente que corrija esto** / **…corrija todo esto** copia una instrucción lista para pegar en tu agente: le indica usar `brain_health` para ver el problema y `brain_propose` para proponer el arreglo — los cambios entran por Propuestas como todo lo demás. La instrucción advierte al agente tratar los títulos y contenidos como datos, no como instrucciones.

### La limpieza

«La última limpieza fue …» — o «Este wiki nunca se limpió». Una **limpieza** es una propuesta o escritura marcada como mantenimiento. Cuando nadie limpió el wiki en un día y su salud tiene problemas, obsybrain se lo pide a un agente que empiece a trabajar en el brain: el wiki se revisa solo. También puedes pedir una ahora, con **Copiar la instrucción**: la instrucción pide corregir lo que `brain_health` encuentra y enviarlo marcado como mantenimiento.

Los umbrales (cuándo una página es «desactualizada», cuándo «larga») se cambian en [Ajustes › Umbrales de salud](09-ajustes-brain.md).

## Actividad

«Lo que pasa en este brain, en vivo: las últimas 24 horas, de lo más nuevo a lo más viejo.» Dos bloques arriba: **Sesiones activas ahora** (cada sesión abierta en este momento, con quién y «abierta…»; «No hay ninguna sesión abierta en este momento» si están todas cerradas), y debajo el **Feed en vivo**.

![El feed de actividad en vivo, con sus filtros y el estado de conexión](/guia-assets/11-activity.png)

El feed entra por eventos: guardó una entrada, revisó, repitió, editó, buscó, leyó la página, abrió una sesión, cerró una sesión, propuso, retiró la propuesta, decidió una propuesta, cambió el wiki, olvidó/recuperó/relacionó entradas, exportó o importó el brain. Cada línea dice quién lo hizo («con Claude Code») y su referencia externa si la lleva («ref r_77»).

### Filtrar la actividad

Los filtros actúan sobre lo que ya se escuchó: **Cliente**, **Tipo** (Entradas, Sesiones, Propuestas, Cambios del wiki, Búsquedas, Páginas leídas) y **Referencia**. **Pausar** congela la lista; los eventos nuevos esperan, y «Reanudar (N nuevos)» te dice cuántos. La lista guarda los 500 eventos más nuevos: «El diario guarda todo».

### Quién ve qué

Ves cada escritura y propuesta. Las búsquedas y las páginas leídas muestran solo las tuyas — «Como curador, lo ves todo, búsquedas y páginas leídas incluidas». Es la misma regla del flujo de eventos: lo que un agente busca y lee es trabajo en curso, y solo los curadores observan ese nivel.

El feed usa una conexión en vivo con estados: **Conectando…**, **En vivo**, **Reconectando…**, **En pausa**. Si se corta, «La conexión se cortó. Reconectando; lo que pase mientras tanto llegará cuando vuelva»; si se perdieron eventos, «Algunos eventos se perdieron» te remite a las listas (Diario y Propuestas), que lo tienen todo. En una instalación con el panel de LaKademIA configurado, algunas sesiones traen «Abrir esta corrida en el panel de LaKademIA».

## Siguiente

→ [06 · Personas, Perfil y claves](06-personas-claves.md): invitaciones, roles, tokens y seguridad.
