# Estructura de conocimiento

Un brain útil no es una pila de documentos: es un mapa con direcciones claras. La
búsqueda semántica encuentra contenido parecido; la estructura correcta hace que
encuentre lo correcto.

## Reglas de este brain

- **Una página, un tema.** Si una página necesita dos subtítulos que no tienen relación
  entre sí, son dos páginas. El wiki de este brain está organizado por temas
  ([[wiki/prompts|prompts]], [[wiki/agentes|agentes]], etc.), no por fechas.
- **Direcciones estables.** El nombre de archivo es la dirección de la página: si
  cambiás el nombre, rompés los enlaces que apuntan a ella. Elegí nombres descriptivos
  y en kebab-case (`memoria-y-contexto`, no `Nota 3 - borrador`).
- **Enlaces en vez de repetición.** Si dos páginas necesitan el mismo concepto,
  enlazá a la página canónica con `[[wiki/nombre-de-pagina|texto del enlace]]` en vez
  de copiar el texto. La copia se desactualiza; el enlace no.
- **Las decisiones viven en decisions.md.** Cada decisión es una sección `## ` con qué
  se decidió, cuándo y por qué. La búsqueda las recupera como entradas de decisión.
- **Las notas crudas viven en raw/notas.** Fragmentos de trabajo citables: reuniones,
  transcripciones, fragmentos que aún no son página del wiki.

## Cómo agregar contenido

1. ¿Es una respuesta reutilizable a una pregunta que vas a volver a hacer? → página
   nueva en wiki/ con nombre descriptivo.
2. ¿Es una decisión tomada? → sección nueva en decisions.md.
3. ¿Es material crudo que tal vez sirva después? → archivo en raw/notas/.
4. ¿Es un registro de qué pasó? → sección en log.md.

En la duda: página del wiki, y que el agente la encuentre por su contenido.
