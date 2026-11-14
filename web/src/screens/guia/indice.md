# Manual de ObsyBrain

Este manual explica, pantalla por pantalla y control por control, cómo usar ObsyBrain: la memoria que le falta a tus agentes de IA, y la que tu empresa puede conservar. Corre en tu propio servidor; cada agente que se conecta lee lo que el equipo ya sabe antes de trabajar y anota lo que aprende después; las personas deciden qué pasa a ser el registro de la empresa.

Todo se explica con las palabras que ves en la pantalla: si aquí se dice «Aprobar todo», ese es el texto exacto del botón. Ante la duda, pulsa `?` en cualquier pantalla: la propia ObsyBrain te muestra sus atajos de teclado.

## Contenido

| Sección | Qué cubre |
| --- | --- |
| [00 · Empezar](00-empezar.md) | Qué es ObsyBrain, los cuatro pasos desde cero y la pantalla de inicio |
| [01 · Brains](01-brains.md) | Crear un brain, el Resumen y todos sus paneles |
| [02 · El wiki](02-wiki.md) | El mapa, las páginas, los enlaces, el historial, el grafo, las Decisiones y el Registro |
| [03 · El diario](03-diario.md) | Sesiones, entradas, correcciones, conflictos, Olvidadas y Para revisar |
| [04 · Propuestas](04-propuestas.md) | El flujo de revisión: qué llega, cómo se lee y cómo se decide |
| [05 · Salud y Actividad](05-salud-actividad.md) | El informe de salud del wiki y el feed en vivo |
| [06 · Personas, Perfil y claves](06-personas-claves.md) | Invitaciones, roles, tokens, apps conectadas, avisos y seguridad |
| [07 · Conecta tu agente](07-agente.md) | Los cinco agentes, los tokens, el puente y los hooks de Claude Code |
| [08 · Administración](08-administracion.md) | Las nueve pantallas de la administración de la instalación |
| [09 · Ajustes de un brain](09-ajustes-brain.md) | Miembros, Agentes, Umbrales de salud, Importar y Archivar |
| [10 · Búsqueda y atajos](10-busqueda-atajos.md) | La búsqueda global, la lista completa de atajos y el tema |

## Las tres piezas de ObsyBrain

1. **El diario.** Mientras trabajan, los agentes guardan decisiones, lecciones, intentos, datos y preferencias, con comprobantes y sin secretos.
2. **El wiki.** Un agente compila el diario en páginas con enlaces y fuentes. Un curador lo aprueba, aprueba parte, corrige o lo devuelve con un comentario del que el agente aprende.
3. **La búsqueda.** Páginas y diario se buscan juntos, sin distinguir acentos, en español y en inglés; la búsqueda por significado es opcional.

El día a día es un ciclo: los agentes escriben en el diario mientras trabajan, un agente compila el diario en propuestas, un curador las aprueba (o las devuelve con un comentario) y el wiki crece como el registro de verdad del equipo. Cada cambio tiene una revisión, un motivo y una vuelta atrás.

También hay cosas que funcionan solas: una copia cifrada de todo cada día a las 03:00 (las últimas 14), una limpieza que se pide a los agentes cuando nadie limpió el wiki en un día, y un sistema de salud que encuentra enlaces rotos, contradicciones y páginas viejas sin inteligencia artificial.

## Cómo leer este manual

- Las palabras entre «comillas» son texto exacto de la interfaz.
- Los bloques de código son comandos para copiar tal cual.
- Los roles aparecen con su palabra humana — **lector**, **colaborador**, **curador** —; en la API se llaman `reader`, `contributor` y `curator`.
- El sustantivo contenedor es siempre «brain» (en minúscula): un brain guarda lo que tú y tus agentes aprenden sobre un tema.
