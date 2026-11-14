[← Índice](indice.md) · [← Anterior](05-salud-actividad.md) · [Siguiente →](07-agente.md)

# 06 · Personas, Perfil y claves

## Personas (invitaciones en un brain)

La pantalla **Personas** de un brain — o de la instalación — lleva las invitaciones: «Cada invitación es un enlace que funciona una sola vez, durante 72 horas.»

![La pantalla de invitaciones: el formulario y la lista](/guia-assets/15-people.png)

### El formulario de invitación

- **Emails**: uno o más, separados por comas o líneas nuevas (hasta 50 por vez).
- **Brains a los que se unen**: marca los brains, cada uno con su **Rol en** … — **lector**, **colaborador**, **curador** —, o ninguno: puedes añadirlos a brains más adelante desde los Ajustes. Un curador invita a los brains que cura; si no curas ninguno, obsybrain lo pide («Elige al menos un brain que cures»).
- **Derechos en esta instalación** (solo la administración): **También administrador** y **Puede crear brains**.
- **Enviar invitaciones** — con correo configurado, cada persona recibe su email; sin él, «recibes un enlace para enviarles tú mismo»: aparecen bajo **Enlaces para enviar**, y **Copia cada enlace y envíalo tú mismo a su persona. Nadie puede verlo de nuevo una vez lo cierres.**

### La lista de invitaciones

Cada invitación muestra sus brains con su rol, quién la invitó («Invitado por …»), cuánto le queda («funciona hasta …»; «venció el …») y su estado: **pendiente**, **vencida**, **aceptada** o **retirada**. Acciones:

- **Enlace nuevo** — genera un enlace nuevo para el mismo email (la dirección nunca cambia de dueño).
- **Retirar** — «El enlace enviado a … deja de funcionar. Puedes invitar de nuevo a esa persona más tarde».

## Los tres roles

El rol se pone por brain, y nunca da más de lo que permite:

| Rol | Puede |
| --- | --- |
| **Lector** | Leer todo el brain: wiki, diario, propuestas, salud. |
| **Colaborador** | Todo lo del lector, más guardar y corregir entradas del diario (decisiones sobre conflictos incluidas). Propone su trabajo a través del diario. |
| **Curador** | Todo lo del colaborador, más aprobar o devolver propuestas, editar páginas del wiki, cambiar ajustes del brain, invitar a sus brains y fijar/olvidar/recuperar entradas. |

Un brain siempre conserva un curador: obsybrain impide degradar al último («Primero nombra curador a otro miembro»). Las cuentas de servicio entran como colaborador o lector, nunca como curador.

## Perfil

Tu **Perfil** reúne tus claves y tu seguridad. La administración de la instalación gestiona las personas; aquí gestionas lo que actúa como tú.

![El perfil: tokens, apps conectadas, avisos y seguridad](/guia-assets/16-profile.png)

### Tokens

«Un token permite que un agente o un programa alcance tus brains como tú, sin el inicio de sesión del navegador. Nunca hace más de lo que tu rol permite.» Con **Crear un token** eliges:

- **Nombre**: para qué sirve, como «Claude Code portátil».
- **Brains**: «Todos mis brains, y los que me una más adelante», o «Solo estos brains».
- **Permiso**: **Solo lectura** o **Lectura y escritura** (si eres lector en todos tus brains, solo lectura es lo posible: «un token no puede escribir allí»).
- **Vence en**: 30, 90 o 365 días.

El token se muestra **una sola vez** («Cópialo ahora: obsybrain lo muestra solo esta vez») y después quedan sus últimos 4 caracteres. Con la opción **Escribe en el wiki directamente**, un curador de un brain puede dejar que esa clave escriba en el wiki de ese brain sin propuesta: «Con esto, sus cambios se aplican de inmediato; cada uno queda en el registro y se puede deshacer» (mira también [04 · Propuestas](04-propuestas.md)). **Revocar** detiene a los agentes que lo usan «en su siguiente petición»; «Vence pronto» te avisa antes de que caduque.

### Apps conectadas

«Agentes que conectaste con el inicio de sesión estándar. Actúan como tú, en los brains que elegiste.» Cada una muestra su último uso y cuándo vence si no se usa («Vence el … si no se usa»); se revocan ahí mismo.

### Avisos por email

«Un email cuando una propuesta nueva espera en un brain que curas.» Actívalo por brain («…: activado» / «…: desactivado»); «Solo los curadores reciben estos». Sin correo configurado en la instalación, la web lo dice.

### Seguridad

- **Cambiar tu contraseña**: pide la actual y una nueva (de 12 a 200 caracteres). Al cambiarla, tus otras sesiones cierran sesión — tus tokens y apps conectadas siguen funcionando.
- **Segundo factor**: un código de 6 dígitos de una app de autenticación, pedido al iniciar sesión. **Activar** muestra un **Código QR de la clave** para escanear (o la clave para escribirla); después escribes el código que muestra la app. **Desactivar** pide un código para confirmar.
- **Revocar todo**: «Una contraseña nueva no detiene tus tokens y apps conectadas. Para detenerlos todos de una vez»: **Revocar todos los tokens y apps** — todo agente y programa que los use se detiene en su siguiente petición; las sesiones web siguen.
- **Cerrar sesión en todos lados**: termina cada sesión tuya en la web, en todos los dispositivos, también esta. Los tokens y apps siguen: revócalos arriba.

Si olvidaste tu contraseña, «¿Olvidaste tu contraseña?» en la pantalla de inicio de sesión envía un enlace que funciona una sola vez, durante 1 hora; en instalaciones sin correo, un administrador te crea el enlace y te lo entrega.

## Siguiente

→ [07 · Conecta tu agente](07-agente.md): los cinco agentes y la conexión paso a paso.
