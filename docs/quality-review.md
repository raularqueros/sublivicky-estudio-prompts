# Revisión de diseño y calidad de SubliVicky

Habilidades aplicadas: `frontend-design` y `webapp-testing` de Anthropic; `web-design-guidelines` de Vercel. Instaladas en el perfil de Codex, sin dependencias añadidas a la app.

## Dirección visual, antes de implementar

La app es una herramienta de trabajo para un negocio de productos personalizados. Su tarea principal es completar un producto y llevar dos prompts a ChatGPT. La interfaz debe sentirse como una mesa de taller organizada.

- Tinta: `#163744`; papel: `#F2F7F9`; blanco: `#FFFFFF`; turquesa: `#006B68`; frambuesa: `#A92763`; línea: `#D2DFE5`.
- Tipografía local: Avenir Next en dispositivos Apple, Trebuchet MS como alternativa, sans serif. Controles de al menos 16 px para evitar el aumento automático al escribir en iPhone.
- Alineación a la izquierda, cabecera compacta y dos áreas de trabajo. En móvil, una columna con enlaces para ir al formulario o al prompt.

```text
Marca                                         Configuración
Del producto a tu próxima publicación         Flujo en ChatGPT
Completar producto | Ver prompts
Formulario                                  Prompts
  1 Destino                                   1 Análisis | 2 Imágenes
  2 Contenido                                 Instrucciones editables
  3 Producto y escena                         Copiar / Abrir
```

Revisión del plan: se conserva el orden real de trabajo y la escena visible. Se descarta una portada grande y las tarjetas repetidas: el formulario se agrupa en una superficie de trabajo, y el acento gráfico se concentra en la marca y las selecciones. No se introducen imágenes decorativas, fuentes remotas, cuentas ni servicios nuevos.

## Hallazgos iniciales

- `styles.css:2` - textos secundarios y controles demasiado pequeños en móvil; campos por debajo de 16 px.
- `styles.css:2` - cabecera y espacios de presentación retrasan el acceso a la tarea.
- `index.html` - falta acceso directo al prompt en una columna larga.
- `index.html:99` - configuración sin nombres de campos ni indicaciones de autocompletado.
- `app.js` - cerrar diálogos descarta instrucciones o configuración sin guardar.
- `templates.js` - el destino Reel puede mezclar tareas de guion de la etapa 1 con producción visual de la etapa 2.

## Correcciones verificadas

- `styles.css:26` - foco visible; campos de 16 px o más y controles táctiles amplios. Se ajustaron colores con contraste insuficiente detectados en la versión anterior.
- `index.html:14` - enlace para saltar al contenido y navegación directa al formulario y a los prompts.
- `index.html:27` - nombres de campos, indicaciones de autocompletado y errores asociados a los controles. La etapa de imágenes explica cómo habilitarla.
- `styles.css:142` - escenas desplazables con teclado y tacto, con espacio para contexto libre.
- `app.js:183` - etapa activa recuperable desde la URL, sin incluir datos del producto.
- `app.js:376` - confirmación al cerrar configuración o plantillas con cambios sin guardar, incluido Escape.
- `templates.js:44` - la etapa visual de un Reel pide fotografías o portada y mantiene el guion en la etapa de textos.

## Pruebas y resultados · 15 de octubre de 2026

- `node verify.cjs`: 81 comprobaciones correctas, incluyendo 84 combinaciones de plataforma, destino y tareas. Este conjunto utiliza DOM y portapapeles simulados.
- `qa/browser_check.py --full`: 34 comprobaciones de flujo correctas en Edge/Chromium sin interfaz gráfica, 17 en escritorio (1366 × 1000) y 17 en móvil emulado con controles táctiles (390 × 844). Cada recorrido usa un contexto limpio.
- Recorridos de teclado: salto al contenido, enlaces internos con foco, activación de escena con Espacio, desplazamiento de ideas con Fin y cierre protegido de diálogos con Escape.
- Portapapeles real: el texto leído coincide exactamente con el prompt editable. Se comprobaron también denegación de copia, selección manual explícita y apertura del enlace configurado. Los enlaces a ChatGPT se interceptaron para comprobar la navegación sin enviar mensajes.
- Persistencia: borradores independientes por etapa, recarga, plantillas y protección de ediciones manuales.
- axe-core 4.14.0: cero infracciones detectadas en cinco estados por recorrido completo (inicio, configuración, escena/flyer, conflicto de edición y plantillas). También se examinó el inicio en 320 × 740 y en horizontal 844 × 390.
- Sin errores JavaScript, campos sin etiqueta, campos de escritura menores de 16 px ni desbordamiento horizontal en los cuatro tamaños. Capturas inspeccionadas visualmente y guardadas localmente en `artifacts/qa/final/`; esa carpeta no se publica.

La auditoría automática no certifica conformidad completa con WCAG. No se probó en un iPhone físico ni se verificó que iOS entregue el enlace a la app nativa de ChatGPT. Las pruebas móviles se ejecutaron con emulación en Chromium; la copia específica de Safari debe comprobarse en el dispositivo.

## Referencias de las habilidades

- [frontend-design de Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- [web-design-guidelines de Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines), con las [directrices vigentes](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).
- [webapp-testing de Anthropic](https://github.com/anthropics/skills/tree/main/skills/webapp-testing)
