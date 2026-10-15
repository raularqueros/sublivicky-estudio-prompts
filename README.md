# SubliVicky · Estudio de prompts

App pública: **[Abrir SubliVicky](https://raularqueros.github.io/sublivicky-estudio-prompts/)**.

Código fuente: [raularqueros/sublivicky-estudio-prompts](https://github.com/raularqueros/sublivicky-estudio-prompts).

Abre `index.html` con un navegador moderno. No requiere instalación, cuentas ni conexión para preparar los prompts. También puedes servir esta carpeta con `python -m http.server 8000 --bind 127.0.0.1` y abrir http://127.0.0.1:8000. Usa siempre la misma dirección y navegador para recuperar el borrador.

La versión pública usa GitHub Pages con HTTPS. La configuración y los borradores siguen guardándose solo en el navegador de cada dispositivo; no se suben a GitHub. Los datos de la versión local no se transfieren al dominio público: configura de nuevo tu enlace de ChatGPT cuando la abras por primera vez.

1. Selecciona plataforma y destino.
2. Elige textos, fotografías y/o flyer.
3. Describe el producto y agrega los datos opcionales que necesites. El prompt se actualiza automáticamente hasta que lo editas manualmente.
4. Elige **Preparar análisis y textos**. Copia el prompt 1, pégalo en ChatGPT y adjunta las fotografías originales. ChatGPT analiza el producto, pregunta lo indispensable y prepara los nombres y textos seleccionados; no genera imágenes todavía. Revisa y aprueba las propuestas allí.
5. Si seleccionaste fotografías o flyer, elige **Preparar fotografías y flyer**. Completa el mensaje aprobado y contacto del flyer si corresponde. Pega el prompt 2 en el **mismo chat** para producir las imágenes usando las referencias y los textos aprobados. La app no verifica ni simula esa aprobación. Si solo necesitas textos, puedes terminar en la etapa 1.

Cada etapa tiene su propio prompt editable y conserva sus ediciones al cambiar de etapa o recargar. Las opciones nuevas no sobrescriben las ediciones manuales de ninguna etapa. El precio sigue siendo opcional. Los datos obligatorios del flyer se exigen para el prompt 2; no impiden preparar el análisis y las propuestas de la etapa 1.

Configura tu enlace de ChatGPT en **Configuración** y usa **Copiar y abrir ChatGPT** para llevar el prompt de la etapa visible. El botón intenta copiar y abrir durante el mismo toque, sin esperar al permiso de copia. Si falla, la apertura continúa y aparece **Seleccionar para copiar manualmente**. Si el navegador bloquea la pestaña, usa el enlace alternativo.

En **iPhone**, también puedes pulsar **Copiar prompt** y luego **Abrir app móvil de ChatGPT**. Este botón es un enlace HTTPS directo al proyecto o conversación configurado; si no hay enlace configurado, usa `https://chatgpt.com/`. No depende de permisos del portapapeles ni de una apertura diferida con JavaScript. iOS decide si lo entrega a la app instalada o abre Safari según los enlaces admitidos y tus preferencias. La web no puede forzar esa elección ni verificar que la app se abrió. Si continúa en Safari, puedes cambiar a la app desde el icono de ChatGPT y pegar allí el prompt.

**Copiar prompt** usa la API moderna cuando está disponible. En HTTP local (por ejemplo desde el móvil en la misma Wi-Fi) se intenta una copia durante el toque del usuario mediante un campo temporal editable que se elimina al terminar. No se cambia ni se selecciona el editor principal para este intento; el texto se escribe como `text/plain` en el evento de copia. Si el navegador lo rechaza, se explica el bloqueo y aparece un botón separado para seleccionar y copiar manualmente. Nunca se confirma una copia rechazada.

La API moderna de Safari requiere un contexto seguro (HTTPS) y una acción del usuario, según [WebKit](https://webkit.org/blog/10855/async-clipboard-api/). La versión de GitHub Pages utiliza HTTPS sin instalar certificados en el iPhone. En HTTP local, el respaldo de compatibilidad no sustituye ese requisito si Safari también bloquea la copia clásica.

Los campos opcionales empiezan ocultos. Usa **¿Qué quieres agregar?** para elegirlos: aparecerán debajo, en el orden seleccionado. Las preferencias opcionales de fotos y flyer funcionan igual. El borrador recuerda los campos agregados y recupera los datos que ya habías guardado.

La casilla **Agregar escena o contexto** está siempre visible debajo del producto y su nombre. Al marcarla se despliega una lista que puedes recorrer con desplazamiento o teclado y un campo para escribir libremente. Incluye 12 ideas (oficina, eventos, cumpleaños, escritorio, home office, desayuno en casa, cafetería, regalo corporativo, feria de emprendedores, graduación, baby shower y reunión familiar). Puedes combinar ideas sin reemplazar lo que ya escribiste. Al desmarcar, el contexto se conserva para recuperarlo, pero deja de incluirse en los prompts. El contexto guía los textos y la ambientación de las fotografías o flyer seleccionados; no convierte los accesorios de la escena en artículos incluidos en la venta. La escena es opcional, se guarda en el borrador y no se incorpora a las plantillas reutilizables.

Los prompts de textos piden un estilo de marca con marketing sólido: gancho concreto, beneficio respaldado por los datos, voz cercana, párrafos cortos, emojis pertinentes y una llamada a la acción. Para Instagram se solicita un copy final en texto plano, listo para copiar y pegar, separado de las propuestas de nombre, sus explicaciones y el guion o los textos por lámina. Historias reciben textos breves para pantalla. No se inventan ofertas, testimonios, urgencia ni supuestas tendencias sin confirmar. La guía también se aplica si ya habías personalizado tus plantillas; tus ediciones manuales del prompt siguen protegidas.

Para el flyer se exigen **mensaje u oferta y contacto** antes de generar o copiar el prompt 2. El **precio es opcional**, se agrega desde **¿Qué quieres agregar?** y se reutiliza el del producto cuando está disponible. Sin precio, el prompt pide omitirlo y permite continuar. Al desactivar el flyer, esos requisitos desaparecen. Vigencia y preferencias visuales siguen siendo opcionales.

Si editas el prompt, los cambios de opciones no lo reemplazan. **Actualizar con las nuevas opciones** vuelve a generarlo y reemplaza tus ediciones; **Conservar mis cambios** mantiene el texto visible.

**Guardar como plantilla** abre un editor separado de instrucciones reutilizables (base, textos, fotografías y flyer). Guarda allí las instrucciones para futuros productos. No se copian automáticamente el producto ni las ediciones de su prompt a la plantilla. Las restricciones esenciales se añaden siempre desde el compositor.

La configuración, las plantillas y el último borrador se guardan en `localStorage` de este navegador. No se comparten entre dispositivos. Borrar los datos del navegador elimina ese guardado. Si el almacenamiento está bloqueado se muestra un aviso; algunos navegadores restringen el almacenamiento al abrir archivos directamente, en cuyo caso utiliza el servidor local indicado arriba. Las fotos se adjuntan solo en ChatGPT. El botón combinado intenta copiar al portapapeles y abre el enlace configurado; debes pegar el texto en ChatGPT. El botón de la app móvil solo abre el enlace. La app no envía el prompt automáticamente ni ejecuta IA.

Archivos:

- `index.html`: interfaz y formularios accesibles en español.
- `styles.css`: diseño adaptable, foco y estilos de diálogos.
- `templates.js`: plantillas originales, destinos, validación del enlace y compositor central de prompts.
- `app.js`: interacciones, protección de ediciones, copia y guardado local.
- `verify.cjs`: comprobaciones dirigidas sin dependencias; ejecutar con `node verify.cjs` si tienes Node.js. Node.js no es necesario para usar la app.

Verificación realizada: sintaxis JavaScript y 80 comprobaciones locales, incluyendo 84 combinaciones de plataforma, destino y tareas para las dos etapas. Se comprobaron los prompts separados, las ediciones y persistencia independientes, la casilla visible de escena y su activación/desactivación sin perder texto, el contexto libre, la guía de marketing y entrega para Instagram, la adaptación a tareas seleccionadas, los requisitos del flyer solo en etapa 2, la copia sin precio, la apertura sin detenerse por fallos de copia, el campo temporal y su limpieza, la selección manual por petición, el enlace móvil, configuración y plantillas. Los eventos del DOM, la copia y la apertura de enlaces se simulan en estas comprobaciones. No se verificaron la copia ni la apertura real de la app en un iPhone; requieren probar en el dispositivo. La herramienta de navegador bloqueó la vista previa; tampoco se verificaron visualmente el diseño móvil ni el recorrido real con teclado. La calidad del copy que produzca ChatGPT se evalúa allí; esta app compone las instrucciones.

No hay backend ni dependencias. GitHub Pages publica los archivos estáticos desde la raíz de la rama `main`; `.nojekyll` evita su procesamiento con Jekyll. Para actualizar la web, sube los cambios a `main`.
