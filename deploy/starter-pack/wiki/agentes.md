# Agentes

Un **agente** es un programa de IA que puede usar herramientas: leer archivos, ejecutar
comandos, consultar APIs. La diferencia entre un chat y un agente es que el agente
actúa sobre tu entorno, no solo conversa.

## Conectar un agente a este brain

Este brain es accesible por MCP (Model Context Protocol). La página "Conectá tu agente"
de la web tiene los pasos exactos para cada cliente (Claude Code, Codex, OpenCode,
Cursor). El flujo general:

1. Creá una clave de acceso para el agente (Perfil › Claves, con permiso de lectura y
   escritura si vas a proponer contenido).
2. Configurá el cliente MCP con la dirección del brain y la clave.
3. Probá con una pregunta real: "¿qué sabés de prompts?" — si responde con el contenido
   de este pack, la conexión funciona.

## Qué puede hacer el agente

Con permiso de **lectura**: buscar en el brain, leer páginas del wiki, consultar notas.
Con permiso de **escritura**: proponer cambios al wiki (que un curador aprueba),
escribir entradas del diario con lo que hizo en cada sesión, registrar decisiones.

## Qué NO debe hacer un agente

- Escribir al wiki sin ser aprobado (por diseño: las propuestas pasan por revisión).
- Guardar secretos o credenciales: el brain las redacta al importarlas, pero no
  guardes nada que no quieras recuperar de una copia de seguridad.
- Decidir por vos: el agente recomienda, vos aprobás.
