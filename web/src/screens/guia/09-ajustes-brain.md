[← Índice](indice.md) · [← Anterior](08-administracion.md) · [Siguiente →](10-busqueda-atajos.md)

# 09 · Ajustes de un brain

«Cómo funciona este brain: quién está en él, por qué lo encuentran los agentes y qué leen primero.» Solo los curadores del brain cambian sus ajustes; la web lo dice y nombra a los curadores cuando no puedes. Cinco pestañas, reunidas bajo «Partes de los ajustes».

> Un brain **archivado** tiene sus ajustes de solo lectura: desarchívalo para cambiarlos.

## Miembros

«Personas y cuentas de servicio en este brain. Los lectores leen; los colaboradores también escriben y proponen; los curadores también aprueban y gestionan.»

![Ajustes: la pestaña Miembros, con los roles y las acciones](/guia-assets/12-settings-members.png)

- **Cambiar el rol** de un miembro (**Guardar rol**), o **Eliminar** a alguien del brain: «ya no podrá abrir …; sus claves dejan de alcanzarlo. Lo que escribió queda, bajo su nombre.» Dos protecciones: un brain siempre conserva un curador (para degradar al último, «Primero nombra curador a otro miembro») y tú mismo recibes confirmaciones distintas («Renunciar al rol de curador?» si te bajas, «Salir de … ahora» si te vas del brain).
- **Añadir un miembro**: alguien que ya tiene cuenta en esta instalación — «Email o id de cuenta» y el rol del nuevo miembro. Para invitar a alguien nuevo, la administración lo hace desde Personas.
- Las cuentas de servicio figuran como «cuenta de servicio» y no pueden ser curadoras.

## Agentes

Qué leen y cómo trabajan los agentes en este brain. Tres bloques:

- **Nota de uso**: «Una nota breve que todo agente lee primero cuando empieza a trabajar en este brain. Como máximo 2.000 caracteres.» Vacía por defecto («los agentes no reciben nota»). Úsala para lo que todo agente debe saber antes de tocar nada: qué se guarda aquí y qué no, las convenciones del repositorio, lo prohibido. **Guardar la nota** la aplica.

![Ajustes: la pestaña Agentes, con la nota de uso y la guía de compilación](/guia-assets/13-settings-agents.png)

- **Guía de compilación**: «Lo que los agentes siguen cuando convierten el diario en propuestas de wiki.» Llega **Por defecto** o **Personalizada**; **Volver a la de por defecto** la restaura, «Mostrar la guía por defecto» la muestra. **Guardar la guía** aplica la tuya. Define qué páginas propone el agente, en qué formato, con qué etiquetas.
- **Repositorios**: los remotes de git vinculados a este brain — «Los agentes que trabajan en un repositorio vinculado encuentran este brain por su remote (brain_resolve), sin que se les diga su nombre.» **Dirección del repositorio** («Su remote, como la salida de `git remote get-url origin`»; no una carpeta de tu máquina) y **Vincular repositorio**; **Desvincular** detiene el enlace («Los agentes de este repositorio dejan de encontrar este brain por él»). Tras vincular, el `hook session-start` de Claude Code encuentra solo el brain de la carpeta de trabajo.
- **Búsqueda por significado**: si la instalación la tiene activada, este brain participa — «Envía su texto al proveedor que la administración eligió». **Dejar este brain fuera de la búsqueda por significado** borra sus significados guardados y no envía nada más de él; «La búsqueda por palabras sigue funcionando». Útil para lo confidencial.

## Umbrales de salud

«Cuándo una página aparece en Salud como desactualizada o larga. Se pide a los agentes una limpieza cuando nadie limpió el wiki en un día.»

- **Desactualizada tras (días)**: «Una página con entradas nuevas sobre ella y sin cambios durante esta cantidad de días.»
- **Larga tras (caracteres)**: «Una página más larga que esto se sugiere para dividir.»

**Guardar** aplica. Súbelos si el equipo es lento para editar páginas; bájalos si prefieres un wiki que se limpie a sí mismo a menudo. Mira la pantalla en [05 · Salud y Actividad](05-salud-actividad.md).

## Importar

«Llena este brain desde una carpeta: una carpeta 02-DOCS (wiki/ y raw/) o una vault de Obsidian, como .zip, o una exportación fiel de otra instalación de obsybrain.»

![Ajustes: la pestaña Importar, con su informe](/guia-assets/14-settings-import.png)

Es **solo en un brain vacío**: «uno sin páginas, entradas ni propuestas todavía». La web lo dice en cuanto el brain tiene contenido y sugiere un brain nuevo.

Qué entra y qué no, tal como lo enumera la pantalla:

- «Cada archivo markdown de wiki/ (de la vault) se vuelve una página; los enlaces entre archivos se vuelven enlaces entre páginas.»
- «Cada archivo de texto de raw/ se vuelve una nota del diario; el índice, las decisiones y el registro también se leen.»
- «Las imágenes, los archivos de más de 1 MB, las carpetas ocultas y los archivos con nombre de clave quedan fuera, y el informe lo dice.»
- «Las partes privadas y todo lo que parezca un secreto se elimina, como en todos lados en obsybrain.»

**Zip a importar**: hasta 50 MB (más grande: la importa un administrador desde la línea de comandos; mira [00 · Empezar](00-empezar.md) para el comando `docker exec … obsybrain import`). **Importar la carpeta** sube, lee y escribe el brain («puede tomar un minuto») y termina con el informe **Qué entró**: cuántas personas se encontraron por email y cuántas entraron como autor, lo que **Quedó fuera** con su motivo (no es texto, más de 1 MB, texto que no es markdown, oculto, con nombre de clave o secreto, fuera de `wiki/` y `raw/`), los **Enlaces que no llevan a ninguna parte**, los nombres convertidos en direcciones y los archivos leídos como Windows-1252 («Revisa sus acentos»). Con **Abrir el wiki** / **Ver el grafo** miras el resultado.

## Archivar (y exportar)

- **Exportar**: «Guarda este brain como un archivo zip. Cada exportación queda registrada en la auditoría.» Formato **Legible** («Archivos markdown para leer o abrir como vault de Obsidian») o **Fiel** («Todo, con su historial, para importar en otra instalación de obsybrain. Las personas se nombran por email»), con la casilla **Incluir las entradas olvidadas** («Quedan marcadas como olvidadas. Las entradas purgadas nunca se exportan»). **Descargar la exportación**.
- **Archivar este brain**: «Un brain archivado es de solo lectura: no se escribe, propone ni aprueba nada nuevo.» La pantalla enumera qué se detiene (guardar entradas, proponer, aprobar, editar, relacionar, correcciones, ajustes, repositorios) y qué sigue funcionando («leer, buscar y el contexto que los agentes piden; quién es miembro y con qué rol; desvincular un repositorio»). «Un curador puede desarchivarlo en cualquier momento» con **Desarchivar este brain**. Úsalo para cerrar un proyecto terminado sin perder su memoria.
- **Eliminar este brain**: «Solo la administración elimina un brain. Todo lo que hay dentro se va: diario, wiki, propuestas e historial.» «Esto no se puede deshacer. Los agentes que escriben en él pierden acceso de inmediato.» La confirmación exige escribir la dirección (slug) del brain tal cual.

## Siguiente

→ [10 · Búsqueda y atajos](10-busqueda-atajos.md): la búsqueda global, los atajos y el tema.
