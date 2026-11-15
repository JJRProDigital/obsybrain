## ObsyBrain v0.7.2

La guía del producto, dentro del producto.

- **Sección Guía en la web.** El manual completo — las 9 pantallas de administración, los ajustes, el flujo de propuestas, los agentes — con capturas de las pantallas reales, navegable desde la barra lateral (ícono libro). Nada de ir a GitHub a leer cómo se usa lo que ya tenés abierto.
- **La barra lateral respeta su ancho.** Con nombres de sección en español, los ítems del rail se desbordaban y pintaban sobre el contenido; ahora encogen con puntos suspensivos.
- **Botones y casillas al mínimo accesible.** Los radios y checkboxes de 18px quedaban bajo el mínimo de 24px que exige la auditoría automática de accesibilidad; ahora miden 26px con el espaciado correcto.

---

**Instalación:**

```sh
curl -fsSLO https://github.com/JJRProDigital/obsybrain/releases/download/v0.7.2/obsybrain.sh
sha256sum obsybrain.sh   # debe coincidir con el hash de abajo
sh obsybrain.sh install --local
```

**SHA-256 de obsybrain.sh:** `b39134827b97559c9abec67cd81110458dd3d0f6ece9614aac615f1c11b9e466`
