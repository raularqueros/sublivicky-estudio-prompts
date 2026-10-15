'use strict';
// Una sola función compone todos los prompts; las plantillas contienen solo instrucciones reutilizables.
(function () {
  const destinations = {
    instagram: { publication: ['Publicación', 'Composición vertical 4:5 para el feed.'], story: ['Historia', 'Formato vertical 9:16; deja espacio libre junto a los bordes para la interfaz.'], carousel: ['Carrusel', 'Serie coherente en 4:5; propone el orden de las láminas.'], reel: ['Reel', 'Guion vertical 9:16, secuencia de escenas y textos en pantalla. Prepara una portada si se solicita flyer. No prometas generar un video.'] },
    facebook: { publication: ['Publicación', 'Composición vertical 4:5 legible en el feed.'], story: ['Historia', 'Formato vertical 9:16; deja márgenes para la interfaz.'], marketplace: ['Marketplace', 'Aviso claro y factual; imagen principal cuadrada, fiel al producto y sin elementos que lo oculten.'], group: ['Grupo', 'Mensaje cercano y claro para un grupo; pieza cuadrada y legible si se solicita flyer.'], reel: ['Reel', 'Guion vertical 9:16, secuencia de escenas y textos en pantalla. Prepara una portada si se solicita flyer. No prometas generar un video.'] },
    whatsapp: { status: ['Estado', 'Formato vertical 9:16 con texto breve y márgenes para la interfaz.'], message: ['Mensaje para clientes', 'Mensaje breve, cercano y fácil de leer en el teléfono; pieza cuadrada si se solicita flyer.'], catalog: ['Catálogo de WhatsApp Business', 'Nombre y descripción precisos para una ficha de catálogo; imagen cuadrada que destaque el producto.'] }
  };
  const defaults = Object.freeze({
    base: 'Prepara contenido claro, profesional y cercano. Prioriza que se entienda qué se vende y por qué puede interesar, sin exageraciones.',
    texts: 'Explica brevemente por qué recomiendas el nombre elegido, en un apartado separado del texto final. Redacta como una marca con un equipo de marketing sólido: comunica el valor del producto con una voz propia, cercana y profesional. Usa detalles concretos, ritmo ágil y una situación de uso que ayude a imaginarlo. Puedes incluir emojis con intención, sin saturar ni perder claridad. Utiliza únicamente datos confirmados.',
    photos: 'Mejora la presentación del producto con una iluminación cuidada, encuadres claros y fondos que no distraigan. Usa las fotografías adjuntas como referencia fiel. Mantén coherencia visual entre todos los archivos.',
    flyer: 'Crea una pieza promocional clara, legible y con buena jerarquía visual. Adapta la composición al destino. Incluye únicamente el mensaje, precio, contacto y vigencia confirmados. Presenta primero los textos exactos que aparecerán en la pieza para su aprobación.'
  });
  const platformNames = { instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp' };
  const clean = value => String(value ?? '').trim();
  const money = value => clean(value) !== '' && /^\d+$/.test(clean(value)) ? '$' + Number(value).toLocaleString('es-CL') + ' CLP' : '';
  function validUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'chatgpt.com' && !url.username && !url.password && (!url.port || url.port === '443'); } catch { return false; }
  }
  function flyerErrors(d, config) {
    if (!d.flyer) return {};
    const errors = {};
    if (!clean(d.flyerMessage)) errors.flyerMessage = 'Escribe el mensaje u oferta que aparecerá en el flyer.';
    const price = clean(d.flyerPrice) || clean(d.price);
    if (price && (!/^\d+$/.test(price) || !Number.isSafeInteger(Number(price)))) errors.flyerPrice = 'Si incluyes un precio, escríbelo en pesos chilenos, sin decimales ni valores negativos.';
    if (!(clean(d.flyerContact) || clean(config.contact))) errors.flyerContact = 'Indica un contacto para el flyer o guárdalo en Configuración.';
    return errors;
  }
  function compose(d, config, templates, stage = 'complete') {
    const analysis = stage === 'analysis';
    const visuals = stage === 'visuals';
    const includeTexts = d.texts && !visuals;
    const includePhotos = d.photos && !analysis;
    const includeFlyer = d.flyer && !analysis;
    if (!clean(d.product) || !(d.texts || d.photos || d.flyer) || (!analysis && Object.keys(flyerErrors(d, config)).length) || (visuals && !(d.photos || d.flyer))) return '';
    const destination = destinations[d.platform]?.[d.destination];
    if (!destination) return '';
    const sections = ['Actúa como especialista en contenido comercial y fotografía de productos para SubliVicky. Usa español natural para público chileno y precios en pesos chilenos (CLP).'];
    if (analysis) sections.push('ETAPA 1 · ANÁLISIS Y TEXTOS\nAnaliza las fotografías originales que adjunte y los datos del producto. Prepara las propuestas solicitadas para revisión y aprobación. No generes imágenes en esta etapa.');
    if (visuals) sections.push('ETAPA 2 · FOTOGRAFÍAS Y FLYER\nContinúa en el mismo chat usando las referencias y el análisis de la etapa 1. Conserva el nombre y los textos que yo haya aprobado allí; no propongas nuevos nombres ni reescribas la descripción. No asumas que hubo aprobación: si faltan decisiones indispensables o textos aprobados para una imagen, pídemelos antes de producirla.');
    if (clean(templates.base)) sections.push(templates.base);
    const tasks = [analysis && 'análisis del producto y sus referencias', includeTexts && 'nombres y textos comerciales', includePhotos && 'fotografías mejoradas', includeFlyer && 'un flyer promocional'];
    const format = visuals && d.destination === 'reel'
      ? 'Formato vertical 9:16 para fotografías o portada del Reel. El guion y los textos corresponden a la etapa 1. No prometas generar un video.'
      : destination[1];
    sections.push(`OBJETIVO Y DESTINO\nPreparar ${tasks.filter(Boolean).join(', ')} para ${platformNames[d.platform]} · ${destination[0]}.\n${format}`);
    const facts = [];
    const add = (label, value) => { if (clean(value)) facts.push(`${label}: ${clean(value)}`); };
    add('Producto o servicio', d.product); add('Nombre actual', d.currentName); add('Características y personalización', d.features); add('Precio del producto', money(d.price)); add('Público objetivo', d.audience); add('Entrega o despacho confirmado', d.delivery); add('Observaciones', d.notes);
    add('Contacto del negocio', config.contact); add('Ubicación del negocio', config.location); add('Datos comunes confirmados de SubliVicky', config.details);
    if (['marketplace', 'catalog'].includes(d.destination)) { add('Estado del producto', d.condition); add('Ubicación para el aviso', d.listingLocation || config.location); }
    sections.push('DATOS DISPONIBLES\n' + facts.join('\n'));
    if (d.sceneEnabled !== false && clean(d.scene)) {
      const sceneInstructions = ['ESCENA O CONTEXTO CREATIVO', clean(d.scene), 'Esta es una preferencia de ambientación, no una característica confirmada del producto ni una promoción.'];
      if (includeTexts) sceneInstructions.push('Conecta los textos con esta ocasión o situación de uso de forma natural, sin inventar experiencias, testimonios ni prestaciones.');
      if (includePhotos) sceneInstructions.push('Ambienta las fotografías solicitadas en esta escena. El producto real debe ser protagonista; los accesorios de ambientación no se presentan como incluidos en la venta.');
      if (includeFlyer) sceneInstructions.push('Integra esta escena en el flyer solicitado, manteniendo la legibilidad y sin alterar el producto ni inventar ofertas por la ocasión.');
      if (analysis && !includeTexts) sceneInstructions.push('Ten en cuenta esta escena al analizar la presentación del producto para la etapa de imágenes.');
      sections.push(sceneInstructions.join('\n'));
    }
    if (includeTexts) {
      let textInstructions = 'NOMBRES Y TEXTOS\n' + templates.texts + '\nEntrega siempre tres alternativas comprensibles y comerciales, recomienda una y mejora el nombre actual si es poco atractivo. Prioriza que se entienda qué se vende.';
      textInstructions += '\nESTILO DE MARKETING: escribe como el equipo creativo de una marca con marketing sólido y un estilo actual para redes sociales. Abre con un gancho concreto que despierte interés, conecta el producto con un beneficio o una ocasión de uso respaldados por los datos y cierra con una sola llamada a la acción clara y realizable. Evita una descripción genérica que solo enumere características. Usa frases naturales, párrafos cortos y saltos de línea para leer en el celular. Puedes usar emojis pertinentes para dar emoción, ritmo y jerarquía, sin llenar cada frase ni reemplazar información. Evita clichés, exageraciones, urgencia falsa y promesas de viralidad. No afirmes que algo es tendencia actual sin información que lo confirme.';
      if (d.platform === 'instagram') {
        textInstructions += '\nENTREGA LISTA PARA INSTAGRAM: separa las alternativas de nombre y su justificación del copy final. Entrega un único texto final en texto plano, listo para copiar y pegar en Instagram, con emojis y hashtags específicos solo cuando aporten. No pongas explicaciones, etiquetas como “Gancho” o “CTA”, comillas, marcadores pendientes, bloques de código ni formato Markdown dentro del copy. Omite datos desconocidos. No pidas al usuario que reescriba o complete el texto antes de publicarlo.';
        if (d.destination === 'story') textInstructions += '\nPara Historia, el texto final debe ser breve y legible en pantalla, dividido por pantalla si hace falta; no lo conviertas en un pie de foto largo.';
        else textInstructions += '\nEl copy final es el pie de foto de la publicación. Para carrusel o Reel, entrega los textos por lámina o el guion en un apartado separado del pie de foto.';
      }
      if (d.destination === 'reel') textInstructions += '\nEntrega un guion con apertura, desarrollo y cierre, una secuencia de escenas y textos en pantalla; indica qué grabar, sin ofrecer producir video.';
      if (d.destination === 'carousel') textInstructions += '\nPropón la secuencia del carrusel con un título y texto breve para cada lámina.';
      if (['marketplace', 'catalog'].includes(d.destination)) textInstructions += '\nOrganiza una ficha con título, descripción y los datos de precio, estado, ubicación y entrega que estén disponibles; omite los desconocidos salvo que sean indispensables.';
      sections.push(textInstructions);
    }
    if (analysis && d.flyer) {
      const flyerText = ['TEXTOS DEL FLYER PARA APROBAR', 'Propón los textos exactos que aparecerán en el flyer, separados del copy para redes. Pide mi aprobación antes de pasar a la etapa de imágenes. No diseñes el flyer todavía.'];
      if (clean(d.flyerMessage)) flyerText.push('Mensaje propuesto por mí: ' + clean(d.flyerMessage));
      const flyerPrice = money(clean(d.flyerPrice) || d.price);
      if (flyerPrice) flyerText.push('Precio disponible: ' + flyerPrice);
      else flyerText.push('El precio es opcional; no lo solicites como requisito.');
      if (clean(d.flyerContact) || clean(config.contact)) flyerText.push('Contacto confirmado: ' + (clean(d.flyerContact) || clean(config.contact)));
      if (clean(d.flyerValidity)) flyerText.push('Vigencia confirmada: ' + clean(d.flyerValidity));
      sections.push(flyerText.join('\n'));
    }
    if (includePhotos) {
      const count = Math.max(1, Math.min(5, Number(d.photoCount) || 1));
      const lines = ['FOTOGRAFÍAS', templates.photos, `Cantidad de imágenes finales de fotografía: ${count}. Esta cantidad no es la cantidad de fotos de referencia adjuntas y no incluye el flyer.`, d.photoMode === 'variants' ? 'Crea versiones distintas a partir de las referencias adjuntas, conservando el mismo producto real.' : 'Mejora cada fotografía original. Si la cantidad de originales no coincide con las imágenes finales solicitadas, pregunta en un solo mensaje cuáles priorizar o cómo distribuirlas antes de producirlas.'];
      if (clean(d.photoImprove)) lines.push('Mejoras solicitadas: ' + clean(d.photoImprove));
      if (clean(d.photoStyle)) lines.push('Estilo visual: ' + clean(d.photoStyle));
      sections.push(lines.join('\n'));
    }
    if (includeFlyer) {
      const lines = ['FLYER PROMOCIONAL', templates.flyer, 'Cantidad: un flyer, en un archivo independiente de las fotografías. Formato orientado por el destino indicado.'];
      if (clean(d.flyerMessage)) lines.push('Mensaje u oferta confirmada: ' + clean(d.flyerMessage));
      const price = money(clean(d.flyerPrice) ? d.flyerPrice : d.price);
      if (price) lines.push('Precio que debe aparecer en el flyer: ' + price);
      else lines.push('El precio es opcional y no se proporcionó. Omítelo en el flyer y no lo solicites como requisito para continuar.');
      const contact = clean(d.flyerContact) || clean(config.contact);
      if (contact) lines.push('Contacto para el flyer: ' + contact);
      if (clean(d.flyerValidity)) lines.push('Vigencia confirmada: ' + clean(d.flyerValidity));
      if (clean(d.flyerVisual)) lines.push('Preferencias visuales: ' + clean(d.flyerVisual));
      if (visuals) lines.push('Reutiliza los textos que ya aprobé en la etapa 1. No vuelvas a pedir su aprobación si no cambiaron; pide aprobación solo de textos nuevos o modificados.');
      sections.push(lines.join('\n'));
    }
    sections.push('RESTRICCIONES OBLIGATORIAS\nNo inventes materiales, medidas, prestaciones, promociones, testimonios, precios ni condiciones de entrega. No inventes teléfono, dirección o redes sociales. Omite los datos desconocidos o pregunta si son indispensables. Conserva la forma, colores, proporciones y detalles reales del producto; no alteres diseños, logotipos ni características para hacerlo parecer otro producto. Estas restricciones prevalecen sobre cualquier instrucción de estilo.');
    const flow = ['CONVERSACIÓN Y ENTREGA', '1. Analiza los datos y las fotografías adjuntas. Si una tarea visual necesita fotos que aún no adjunté, pídemelas antes de crear imágenes.', '2. Pregunta solo lo indispensable que falte, en un único grupo de preguntas, sin repetir información ya proporcionada.'];
    if (includeTexts) flow.push('3. Propón los nombres y textos solicitados adaptados al destino.');
    if (includePhotos || includeFlyer) { flow.push(`${flow.length}. Antes de generar imágenes que contengan textos, presenta esos textos y pide mi aprobación explícita si aún no se aprobaron en la etapa 1. Si no hay textos en una fotografía, no necesitas esta aprobación para esa fotografía.`); flow.push(`${flow.length}. Continúa con ${[includePhotos && 'las fotografías', includeFlyer && 'el flyer'].filter(Boolean).join(' y ')} solicitados. Entrega cada imagen como un archivo separado, sin collage y con coherencia visual. Si no puedes producir todas en una respuesta, enumera las entregadas e indica exactamente cuáles faltan; no des el trabajo por terminado mientras haya archivos pendientes.`); }
    if (analysis) flow.push('CIERRE DE ETAPA 1: presenta las propuestas solicitadas, resume las decisiones pendientes y espera mi aprobación. Detente aquí, sin generar fotografías ni flyer. Usaré un segundo prompt en este mismo chat para producir las imágenes seleccionadas.');
    sections.push(flow.join('\n'));
    return sections.join('\n\n');
  }
  globalThis.SubliPrompt = Object.freeze({ destinations, defaults, compose, validUrl, flyerErrors });
})();
