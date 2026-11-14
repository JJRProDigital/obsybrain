[← Índice](indice.md) · [← Anterior](07-agente.md) · [Siguiente →](09-ajustes-brain.md)

# 08 · Administración

«Solo la administración de esta instalación abre esto.» Nueve pantallas que gobiernan toda la instalación, no un brain: Personas, Invitaciones, Cuentas de servicio, Correo saliente (Email), Búsqueda por significado, Límites, Auditoría, Copias y sistema, y Marca.

## Personas

«Todos los que tienen cuenta: su rol en cada brain, cuándo se los vio por última vez, y sus derechos.»

![El listado de personas de la administración, con sus derechos](/guia-assets/18-admin-people.png)

- **Buscar por nombre o email** filtra la lista; el buscador muestra el estado de cada cuenta — **activo** / **desactivado** — y su último inicio de sesión.
- Por persona: sus brains y roles, y sus derechos — **Nombrar administrador** / **Quitar administrador** (la instalación siempre conserva un administrador), **Permitir crear brains** / **Dejar de crear brains** (los administradores siempre pueden).
- **Desactivar**: la persona «cierra sesión en todos lados y no puede iniciar sesión. Sus tokens, apps conectadas y claves dejan de funcionar ahora.» Lo que escribió queda bajo su nombre; puedes **Reactivarla** más tarde (sus claves viejas siguen revocadas). Al desactivar, obsybrain avisa si algún brain queda sin curador activo: «… quedan sin curador activo ahora: nombra uno en sus ajustes». Desactivar una cuenta de servicio detiene su clave principal y todas las claves cortas que hizo.
- **Crear un enlace de restablecimiento**: para alguien que no pueda iniciar sesión — «un enlace para elegir una contraseña nueva, que le entregas tú» —, funciona una sola vez, durante 1 hora.
- **Autores importados**: los nombres que trajo una importación y no tienen cuenta aquí. **Anonimizar** borra el nombre y deja todo firmado como «Autor anterior»; el nombre viejo no se puede recuperar.

## Invitaciones

El mismo flujo de [Personas del brain](06-personas-claves.md), al nivel de la instalación: invitar a cualquiera a cualquiera de los brains (o a ninguno), ver **todas** las invitaciones con su estado (pendiente, vencida, aceptada, retirada), generar **enlace nuevo** y **retirar**. Sin correo configurado, los enlaces aparecen para copiar y enviar a mano.

## Cuentas de servicio

«Programas que escriben en brains con sus propias claves, como un runner que acuña una clave corta por trabajo. Nunca son curadores.» Aquí se crea, por ejemplo, la cuenta que usa el panel de LaKademIA.

- **Cuenta de servicio nueva**: un **Nombre** (qué es el programa, como «Importación nocturna») y los **Brains a los que se une** — como colaborador (escribe) o lector. Las cuentas de servicio jamás entran como curador.
- **Clave principal**: se muestra solo ahora («ponla en la configuración de secretos del programa. Nadie puede verla de nuevo»). Cada cuenta maneja hasta **dos claves principales a la vez** para rotar sin corte: «Mueve el programa a esta clave, y después revoca la vieja». Con la clave principal, el programa acuña **claves cortas**, una por tarea.
- **Revocar …xxxx** detiene el programa y también las claves cortas que esa clave hizo.

## Correo saliente

«La cuenta desde la que obsybrain envía invitaciones, enlaces de restablecimiento y avisos.» Sin configurar, la pantalla lo dice grande: «El correo no está configurado…» y nada sale por email — los enlaces se copian a mano y los avisos no se envían.

Campos: **Servidor de correo** (como `smtp.example.com`), **Puerto** («Normalmente 587; 465 con cifrado desde el inicio»), **Cifrado desde el inicio (puerto 465)**, **Nombre de usuario**, la **Contraseña nueva** («Guardada sellada en el servidor; no se vuelve a mostrar ninguna parte»), **Enviar como (nombre)** y **Enviar desde (email)**. **Guardar los ajustes de correo**; si cambias servidor, puerto o usuario, la contraseña configurada ya no vale y hay que escribirla otra vez. **Quitar los ajustes de correo** detiene todo el correo hasta que se guarden de nuevo.

- **Enviar un email de prueba** comprueba la cuenta real — «Revisa esa casilla (y su carpeta de spam)». Usa los ajustes guardados: guarda primero tus cambios.
- **Fallos de envío recientes**: los últimos correos que no salieron, del más nuevo al más viejo, con su tipo (Invitación, Enlace de restablecimiento, Token por vencer, Propuesta nueva, Aviso, Email de prueba). «No se reenvía por su cuenta»: si algo falló, repítelo a mano.

## Búsqueda por significado

«La búsqueda por significado encuentra páginas y entradas sobre lo mismo en otras palabras. Envía su texto a un proveedor.» Es opcional y **apagada por defecto**: la búsqueda por palabras funciona siempre sin ella.

Proveedores configurables en **Proveedores** (una clave o dirección configurada aquí se usa en lugar del entorno del servidor):

- **OpenAI** — con su clave de API; el servidor usa el modelo `text-embedding-3-small`.
- **Ollama** — con su **Dirección** (donde corre, como `http://localhost:11434`); el modelo es `nomic-embed-text`.

Activarla requiere dos pasos: elegir proveedor y aceptar el aviso — «Entiendo que el texto de las entradas y las páginas se enviará a …, y que lo que se envía no se puede recuperar». Las claves se guardan selladas y nunca se muestran de nuevo (solo sus últimos 4 caracteres). Desactivar conserva lo procesado: «reactivarla con el mismo proveedor no lo envía otra vez». Cambiar de proveedor sí lo reprocesa todo — por eso pide aceptar el aviso otra vez. Un curador puede excluir un brain concreto desde sus Ajustes (mira [09 · Ajustes](09-ajustes-brain.md)): se borran sus vectores y no se envía nada más de él.

## Límites

«Cuántas peticiones puede hacer cada clave en un minuto: los tokens de las personas, las apps conectadas, las cuentas de servicio y la propia web.» Por defecto 600. El rango permitido está acotado «por debajo de eso la propia web deja de funcionar» — bajar de ese mínimo corta también a quien usa la web. Bajar el límite se confirma aparte («Cada clave … podrá hacer entonces N peticiones por minuto…; los agentes que trabajen más rápido se rechazan hasta que pase el minuto») y **Usar el por defecto** lo devuelve a 600.

## Auditoría

«Quién hizo qué, cuándo, con qué clave, y cómo terminó. Nadie puede editarla.» Cada inicio de sesión, invitación, cambio de rol, clave, conexión, purga y cambio de configuración queda registrado, y la base de datos se niega a cambiarlo o borrarlo.

Filtra con **Filtrar la auditoría**: **Quién** (Cualquiera, o uno), **Acción** (una acción, o un grupo que termina en punto, como `member.`), **En brain** (Cualquier brain, o uno), **Resultado** (Hecho / Rechazado), **Desde** y **Hasta**. «Días y horas están en tu zona horaria». La tabla (Cuándo, Quién, Acción, En brain, Objetivo, Resultado, Detalle) carga de 100 en 100 («Mostrar 100 más»), y **Descargar estas líneas (CSV)** guarda hasta 100.000 — «La descarga misma queda registrada». Los curadores ven la parte de su brain; la administración lo ve todo.

## Copias y sistema

La sala de máquinas. Aquí viven el estado del servicio, las copias, la clave de instalación y las actualizaciones.

![Copias y sistema: el servicio, la programación de copias y la clave](/guia-assets/20-admin-system.png)

### Servicio

**Versión** (qué corre y si hay una versión nueva publicada; «Comprobado…» dice cuándo se miró), **Corriendo desde** cuándo, la **Base de datos** («Responde · última migración …»), los **Streams de eventos en vivo** abiertos, el estado del correo y de la búsqueda por significado, el **Tamaño de la base de datos** y el **Mantenimiento** (por qué y hasta cuándo: durante una actualización «se rechazan las escrituras»). También la dirección del **panel de LaKademIA**: las sesiones que arrancó una corrida del panel se enlazan desde Actividad.

### Copias

«Una copia guarda todo: brains, cuentas, ajustes, auditoría. Se cifra con la clave de instalación y se guarda en la carpeta de las copias.» La programación por defecto: «Todos los días a las 03:00, conservando las 14 copias diarias más nuevas. Las copias hechas a mano o antes de una actualización o restauración se conservan hasta que las quites en la máquina» (la carpeta la define `OBSY_BRAIN_BACKUPS`; sin ella, la pantalla lo dice y sugiere respaldar la base de datos con tus herramientas).

- **Hacer una copia ahora**: no espera a las 03:00.
- La lista muestra cada copia con su fecha, su clave («clave …»), y las que necesitan una clave más vieja marcadas «Necesita la clave más vieja».
- **Descargar** — «Una copia descargada sigue cifrada: solo se restaura con la clave de instalación con la que se hizo».
- **Restaurar…** — el paso más delicado, con tres avisos: «Todo lo que hay aquí se reemplaza por esta copia», «Lo que se escribió después se pierde» (dice la última escritura), y «Primero, obsybrain hace una copia de lo que hay ahora ("Antes de una restauración")». Después terminan cada sesión, token y conexión, y hay que escribir el nombre de la instalación y tu contraseña (y el código del segundo factor, si lo tienes) para confirmar.
- Si la última copia falló, una banda en toda la instalación lo dice y enlaza aquí («La última copia falló (…). Desde entonces no se hizo ninguna copia buena»).

### Clave de instalación

«Cada copia se cifra con esta clave: sin ella, ninguna copia puede restaurarse. Guárdala fuera de esta máquina, en un gestor de contraseñas.» **Mostrar la clave de instalación…** pide tu contraseña y la muestra hasta que la ocultes o salgas de la página; **Copiar la clave** o **Descargar la clave (.txt)**. El **Id de la clave** es el que cada copia cita; las hechas con otra clave piden «la clave más vieja» (la rotación crea una clave nueva y conserva la anterior junto a la instalación). En la configuración inicial, la clave se mostró una sola vez con este mismo aviso; aquí puedes recuperarla siempre con tu contraseña.

### Actualizar

La web muestra qué versión corres y si hay una más nueva. La actualización normal es en la terminal: `sh obsybrain.sh update` — «primero hace una copia y vuelve atrás si algo falla»; entra en mantenimiento unos minutos (las escrituras se rechazan, las lecturas siguen), migra los datos y arranca la versión nueva. El botón **Actualizar a vX.Y.Z** desde la web solo existe con el actualizador activado en el servidor (`sh obsybrain.sh web-updates enable`):

> **Riesgo a saber**: el actualizador es un contenedor aparte que **tiene control total de Docker en esta máquina: quien lo controle controla el servidor**. `enable` lo dice y pregunta; monta solo el socket de Docker, la carpeta de instalación y su lista de usuarios, y el servicio nunca recibe de él credenciales ni la clave de instalación.

el botón confirma con tu contraseña (y el segundo factor); dos administradores a la vez arrancan una sola actualización. Una versión que falló se intenta una vez desde la web; después **Reintentar** permite como máximo 3 reintentos, con 15 minutos de separación, y solo la terminal puede seguir. En una instalación hecha por el panel de LaKademIA no hay botón — se actualiza desde allí.

## Marca

Lo que la gente ve de tu instalación.

![Marca: el nombre y el logo de la instalación](/guia-assets/19-admin-branding.png)

- **Nombre de esta instalación** (1 a 80 caracteres): «Se muestra en la cabecera, en la página de inicio de sesión y en cada email, en lugar de obsybrain.»
- **Logo**: «Se muestra en la cabecera y arriba de cada email. Un PNG, JPEG o WebP de como máximo 2 MB; no SVG, que puede llevar scripts.» **Elegir un logo**, **Subir este logo**; **Quitar el logo** devuelve la marca de ObsyBrain («La cabecera muestra otra vez la marca de ObsyBrain, y los emails muestran solo el nombre»). Sin logo cargado, la cabecera muestra la marca de ObsyBrain por defecto.

## Siguiente

→ [09 · Ajustes de un brain](09-ajustes-brain.md): miembros, agentes, umbrales, importación y archivo.
