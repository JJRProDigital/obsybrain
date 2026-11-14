# Prompts

Un prompt es una especificación de trabajo, no una frase mágica. Cuanto más se parece
a una buena especificación técnica, mejor es el resultado.

## Anatomía de un prompt que funciona

- **Rol y objetivo**: quién debe actuar y qué debe producir. "Actuá como revisor de
  seguridad. Objetivo: encontrar vulnerabilidades de autenticación en este módulo."
- **Contexto mínimo indispensable**: proyecto, convenciones, restricciones. Aquí es
  donde el brain hace la diferencia: si las convenciones están documentadas, no tenés
  que repetirlas en cada prompt.
- **Formato de salida esperado**: lista, tabla, código con tests, un párrafo. Sin
  formato esperado, recibís formato aleatorio.
- **Criterio de listo**: cómo sabés que terminó. "Termina cuando el test pasa" es
  mejor que "hacelo bien".

## Patrones útiles

- **Plan primero**: "Antes de escribir código, dáme el plan en 5 pasos y esperá
  confirmación." Evita las trescientas líneas en la dirección equivocada.
- **Un cambio por vez**: "Solo el archivo X, solo el cambio Y." Limita el blast radius.
- **Pedí alternativas con trade-offs**: "Dame dos enfoques con sus costos, no elijas
  vos." Mantiene la decisión humana.
- **Hacé que verifique**: "Corré los tests y pegá la salida completa." El output sin
  evidencia es opinión.

## Antipatrones

- El prompt-novela: tres párrafos de contexto y ninguna instrucción concreta.
- El prompt-vago: "mejoralo" sin decir qué es mejor.
- El prompt-deseo: pedir que el agente "recuerde" algo que nunca está en el brain ni
  en la conversación.
