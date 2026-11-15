## ObsyBrain v0.7.1

El brain de arranque: LaKademIA trae su starter pack y la guía de los primeros 4 pasos.

- **Starter pack importable.** `deploy/starter-pack/` trae el conocimiento base en formato 02-DOCS: cómo se trabaja con IA, la anatomía de un prompt que funciona, cómo organizar el conocimiento, qué guardar en memoria y 4 playbooks de trabajo diario. Se importa con `obsybrain import --brain TU_BRAIN --from deploy/starter-pack --as TU_EMAIL`.
- **Guía de onboarding en 4 pasos.** `deploy/GUIA-ONBOARDING.md`: instalar, crear cuenta y brain, importar el pack y conectar el agente — menos de una hora de cero a un brain con material propio respondiendo.
- **El momento clave validado.** Un brain recién importado responde las preguntas de trabajo con las páginas del pack, no con respuestas genéricas del modelo.

---

**Instalación:**

```sh
curl -fsSLO https://github.com/JJRProDigital/obsybrain/releases/download/v0.7.1/obsybrain.sh
sha256sum obsybrain.sh   # debe coincidir con el hash de abajo
sh obsybrain.sh install --local
```

**SHA-256 de obsybrain.sh:** `b39134827b97559c9abec67cd81110458dd3d0f6ece9614aac615f1c11b9e466`
