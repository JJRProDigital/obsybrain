# Memoria y contexto

El valor de un brain no está en cuánto guarda sino en **qué recupera en el momento
correcto**. Guardar todo es la forma más barata de no encontrar nada.

## Qué vale la pena guardar

- **Decisiones con su porqué.** "Usamos PostgreSQL" no dice nada; "Usamos PostgreSQL
  porque el equipo ya lo opera y las migraciones se revisan en CI" ahorra la próxima
  discusión de dos horas.
- **Convenciones que el agente debe seguir.** Estilo de código, estructura de
  repositorios, qué significa "terminado". Son las que hacen que el output sea
  consistente con tu estándar.
- **Problemas ya resueltos.** El síntoma, la causa y la solución. La próxima vez que
  aparezca el síntoma, el agente encuentra la causa sin repetir la investigación.
- **Fragmentos citables** de reuniones o materiales de estudio (en raw/notas), con
  fecha y origen.

## Qué NO guardar

- Secretos, claves, tokens, contraseñas. El importe los redacta si los detecta, pero
  la regla es no guardarlos nunca.
- Lo que ya está en el código y los tests lo pinnean: el brain complementa el código,
  no lo duplica.
- Opiniones sin contexto ("X es mejor que Y") sin el trade-off que las justifica.

## El ciclo de memoria

1. **Durante el trabajo**: el agente registra en el diario qué hizo en cada sesión.
2. **Al cerrar**: lo aprendido se propone al wiki (una propuesta, que vos aprobás).
3. **En la próxima sesión**: el agente arranca con el contexto del brain, no desde
   cero. Ese es el momento que hace valer todo lo anterior.

Una memoria que nadie revisa se vuelve ruido. El paso 3 existe para que la revisión
del paso 2 tenga sentido: aprobar una propuesta es invertir en tu propio futuro.
