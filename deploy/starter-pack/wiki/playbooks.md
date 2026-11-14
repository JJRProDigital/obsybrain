# Playbooks

Recetas paso a paso para las tareas más comunes. Cada playbook asume que tu agente
está conectado a este brain con permiso de lectura; donde dice "escritura", necesita
permiso de escritura (las propuestas pasan por aprobación).

## Playbook: arrancar un proyecto nuevo

1. Le pedís al agente: "Leé [[wiki/como-trabajamos|cómo trabajamos]] y
   [[wiki/estructura-de-conocimiento|estructura de conocimiento]]."
2. Definís el objetivo en una frase y la restricción principal.
3. Pedís el plan antes del código (patrón "plan primero" de
   [[wiki/prompts|prompts]]).
4. Ejecutás paso a paso, verificando cada paso.
5. Al cerrar: la decisión de arquitectura va a decisions.md, las convenciones nuevas
   se proponen al wiki.

## Playbook: debuggear con memoria

1. Describí el síntoma exacto (qué esperabas, qué pasó, cómo reproducirlo).
2. Preguntale al agente: "¿Hay algo en el brain sobre este síntoma o este módulo?"
3. Si no hay nada: investigá con el agente (hipótesis → prueba → conclusión).
4. Cerrá el ciclo: la causa raíz y la solución se guardan como entrada del diario
   (y propuesta al wiki si es reutilizable). El próximo incidente arranca con esa
   memoria.

## Playbook: aprender algo nuevo

1. Material crudo (transcripción, artículo, notas de un curso) → raw/notas/ con fecha
   y origen.
2. Le pedís al agente: "Resumí [nota] en una página del wiki con enlaces a las páginas
   relacionadas." Te propone; vos aprobás.
3. A la semana, preguntale al agente por el tema: si la respuesta es coherente con el
   material, la memoria funciona. Si no, revisá la página propuesta.

## Playbook: revisar el trabajo de un agente

1. Nunca revises output sin los tests (o la evidencia) al lado.
2. Preguntale al agente "¿por qué lo hiciste así?" — la explicación revela si entendió
   el problema o solo cumplió la letra.
3. Si no podés explicar el cambio vos, no se mergea: volvé a
   [[wiki/como-trabajamos|cómo trabajamos]], regla 3.
