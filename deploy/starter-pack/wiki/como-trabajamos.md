# Cómo trabajamos

La regla número uno: **vos dirigís, la IA ejecuta**. El agente es una herramienta con
superpoderes, no el arquitecto del trabajo. La responsabilidad del resultado es siempre
humana.

## Los tres principios

1. **Contexto antes que código.** Un agente sin contexto produce genérico; un agente
   con el contexto correcto produce trabajo específico y útil. Antes de pedir nada,
   preguntate: ¿el agente sabe quién soy, qué proyecto es y qué convenciones siguen?
   Este brain existe para responder esa pregunta.

2. **Conceptos antes que herramientas.** Entender por qué algo funciona te permite
   cambiar de herramienta sin empezar de cero. Si solo sabés usar la herramienta,
   cada cambio de versión te deja en cero. Priorizá aprender el concepto.

3. **Sin atajos que no entendés.** Todo lo que un agente produce y vos no podés
   explicar, es deuda técnica que no sabés que tenés. Revisá, preguntá, entendé.

## El ciclo de trabajo

- **Definí el objetivo** en una frase concreta: qué se construye, para quién, con qué
  restricción principal.
- **Dame el mapa antes del territorio**: pedile al agente un plan antes que la
  implementación. Un plan de tres líneas que podés evaluar vale más que trescientas
  líneas que no.
- **Trabajá en pasos verificables**: cada paso termina en algo que se puede comprobar
  (un test, una salida, un documento que se lee).
- **Cerrá el ciclo con memoria**: lo aprendido vuelve al brain (ver
  [[wiki/memoria-y-contexto|memoria y contexto]]).

## Qué NO hacemos

- Pegar output de IA sin leerlo.
- Confundir "suena bien" con "está bien".
- Delegar decisiones de producto a un modelo: eso la decide una persona.
