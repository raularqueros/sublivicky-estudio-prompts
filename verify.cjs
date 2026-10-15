// Comprobaciones sin dependencias. Los eventos usan un DOM simulado, no un navegador.
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const html = source('index.html');
const memory = new Map();
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('✓ ' + name); }
function boot({ storageBlocked = false } = {}) {
  const elements = new Map();
  const state = { copied: null, opened: null, focused: null, confirm: false, confirmations: 0, copyFails: false, legacyCopySucceeds:false, legacyAttempts:0 };
  let focusedElement = null;
  const documentHandlers = new Map();
  class Element {
    constructor(id, attrs = '') { this.id = id; this.type = /type="([^"]*)"/.exec(attrs)?.[1] || ''; this.href = /href="([^"]*)"/.exec(attrs)?.[1] || ''; this.target = /target="([^"]*)"/.exec(attrs)?.[1] || ''; this.rel = /rel="([^"]*)"/.exec(attrs)?.[1] || ''; this.hidden = /\bhidden\b/.test(attrs); this.checked = /\bchecked\b/.test(attrs); this.value = ''; this.textContent = ''; this.attrs = {}; this.handlers = {}; this.open = false; this.readOnly = false; this.style = {}; }
    addEventListener(name, handler) { (this.handlers[name] ||= []).push(handler); }
    async fire(name, target = this) { for (const handler of this.handlers[name] || []) await handler({ target, preventDefault() {} }); }
    replaceChildren(...options) { this.options = options; this.value = options[0]?.value || ''; }
    append(child) { this.children = (this.children || []).filter(item => item !== child); this.children.push(child); child.parent = this; }
    appendChild(child) { this.append(child); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); this.removed = true; }
    setAttribute(name, value) { this.attrs[name] = value; }
    removeAttribute(name) { delete this.attrs[name]; }
    focus() { state.focused = this.id; focusedElement = this; }
    select() { this.selected = true; }
    setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    click() { state.opened = { url: this.href, target: this.target, rel: this.rel, copiedBeforeOpen: state.copied }; }
  }
  for (const match of html.matchAll(/<\w+\b([^>]*\bid="([^"]+)"[^>]*)>/g)) elements.set(match[2], new Element(match[2], match[1]));
  const c = {
    URL, console,
    Option: function (label, value) { this.label = label; this.value = value; },
    document: {
      body: new Element('body'), getElementById: id => elements.get(id), querySelectorAll: () => [], createElement: tag => new Element('temporary-' + tag), get activeElement() { return focusedElement; },
      addEventListener(name, handler) { documentHandlers.set(name, handler); }, removeEventListener(name) { documentHandlers.delete(name); },
      execCommand(command) {
        state.legacyAttempts++; state.lastCopyBuffer = focusedElement;
        if (state.legacyThrows) throw Error('Copy rejected');
        if (command !== 'copy' || !state.legacyCopySucceeds) return false;
        state.copied = focusedElement.value;
        documentHandlers.get('copy')?.({ clipboardData: { setData(type, text) { state.copyMime = type; state.copied = text; } }, preventDefault() {} });
        return true;
      }
    },
    localStorage: { getItem(key) { if (storageBlocked) throw Error('blocked'); return memory.get(key) || null; }, setItem(key, value) { if (storageBlocked) throw Error('blocked'); memory.set(key, value); } },
    navigator: { clipboard: { async writeText(text) { if (state.copyFails) throw Error('denied'); state.copied = text; } } },
    window: { isSecureContext:true, confirm() { state.confirmations++; return state.confirm; } }
  };
  vm.createContext(c); vm.runInContext(source('templates.js'), c); vm.runInContext(source('app.js'), c);
  return { c, state, $: id => elements.get(id), async input(id, value) { const e = elements.get(id); if (e.type === 'checkbox') e.checked = value; else e.value = value; await elements.get('brief-form').fire('input', e); } };
}
(async () => {
  let app = boot(); let { c, $ } = app;
  check('Inicio: textos activos, fotografías y flyer opcionales desactivados', () => { assert.equal($('texts').checked, true); assert.equal($('flyer').checked, false); assert.equal($('photos').checked, false); assert.equal($('flyer-fields').hidden, true); });
  check('Campos opcionales ocultos al inicio', () => { for (const key of ['currentName','scene','features','price','audience','delivery','notes','condition','listingLocation','photoImprove','photoStyle','flyerPrice','flyerValidity','flyerVisual']) assert.equal($('optional-' + key).hidden, true); assert.equal($('product-add-menu').hidden, true); });
  await $('product-add').fire('click');
  check('Botón abre opciones para agregar', () => { assert.equal($('product-add-menu').hidden, false); assert.equal($('product-add').attrs['aria-expanded'], 'true'); });
  await $('product-add-menu').options.find(button => button.textContent === 'Público objetivo').fire('click');
  await $('product-add-menu').options.find(button => button.textContent === 'Características y personalización').fire('click');
  check('Selecciones revelan solo esos campos, abajo y en orden', () => { assert.equal($('optional-audience').hidden, false); assert.equal($('optional-features').hidden, false); assert.equal($('optional-price').hidden, true); assert.deepEqual($('product-extras').children.map(item => item.id), ['optional-audience','optional-features']); assert.equal($('product-add-menu').hidden, true); });
  await app.input('product', 'Tazón de prueba exclusivo');
  const productToken = 'Tazón de prueba exclusivo';
  check('Descripción suficiente; sin flyer ni instrucciones de fotos', () => { const p = $('prompt').value; assert.ok(p.includes(productToken)); assert.ok(p.includes('NOMBRES Y TEXTOS')); assert.ok(!p.includes('FLYER PROMOCIONAL')); assert.ok(!p.includes('FOTOGRAFÍAS\n')); });
  check('Copy comercial con gancho, emojis y entrega lista para Instagram', () => { const p = $('prompt').value; assert.ok(p.includes('marketing sólido')); assert.ok(p.includes('gancho concreto')); assert.ok(p.includes('emojis pertinentes')); assert.ok(p.includes('listo para copiar y pegar en Instagram')); assert.ok(p.includes('Separa') || p.includes('separa las alternativas')); assert.ok(p.includes('sin información que lo confirme')); assert.ok($('prompt-description').textContent.includes('Instagram')); });
  check('Casilla de escena visible junto al producto y desmarcada inicialmente', () => { assert.equal($('sceneEnabled').hidden, false); assert.equal($('sceneEnabled').checked, false); assert.ok(html.indexOf('id="sceneEnabled"') < html.indexOf('id="optional-scene"')); });
  await app.input('sceneEnabled', true);
  check('Escena opcional se revela sin moverse al final de otros datos', () => { assert.equal($('optional-scene').hidden, false); assert.ok(!$('scene').required); assert.ok(!$('product-extras').children.some(item => item.id === 'optional-scene')); assert.ok(html.indexOf('id="optional-currentName"') < html.indexOf('id="optional-scene"')); assert.ok(html.indexOf('id="optional-scene"') < html.indexOf('id="product-add"')); });
  check('Ideas de escena incluyen las solicitadas y otras situaciones', () => { const labels = $('scene-presets').options.map(button => button.textContent); for (const label of ['Oficina','Eventos','Cumpleaños','Escritorio','Home office','Cafetería','Graduación']) assert.ok(labels.includes(label)); assert.equal(labels.length, 12); });
  await $('scene-presets').options.find(button => button.textContent === 'Oficina').fire('click');
  check('La escena orienta el copy sin pedir fotografías desactivadas', () => { assert.ok($('scene').value.includes('Oficina moderna')); const p = $('prompt').value; assert.ok(p.includes('ESCENA O CONTEXTO CREATIVO')); assert.ok(p.includes('Conecta los textos')); assert.ok(!p.includes('Ambienta las fotografías solicitadas')); });
  const freeScene = 'Contexto propio: mesa de madera azul con ventana al jardín.';
  await app.input('scene', freeScene);
  const birthday = $('scene-presets').options.find(button => button.textContent === 'Cumpleaños');
  await birthday.fire('click');
  const combinedScene = $('scene').value;
  check('Las ideas complementan el contexto libre sin sobrescribirlo', () => { assert.ok(combinedScene.startsWith(freeScene)); assert.ok(combinedScene.includes('Cumpleaños')); assert.ok($('prompt').value.includes(freeScene)); });
  await birthday.fire('click');
  check('Repetir la misma idea no duplica el contexto', () => assert.equal($('scene').value, combinedScene));
  const recoveredScene = boot();
  check('Recarga conserva escena y la mantiene opcional', () => { assert.equal(recoveredScene.$('scene').value, combinedScene); assert.equal(recoveredScene.$('optional-scene').hidden, false); });
  await app.input('sceneEnabled', false);
  check('Desmarcar escena la oculta y la excluye sin borrar el contexto', () => { assert.equal($('optional-scene').hidden, true); assert.equal($('scene').value, combinedScene); assert.ok(!$('prompt').value.includes('ESCENA O CONTEXTO CREATIVO')); });
  await app.input('sceneEnabled', true);
  check('Volver a marcar recupera la escena y permite seguir escribiendo', () => { assert.equal($('optional-scene').hidden, false); assert.ok($('prompt').value.includes(freeScene)); });
  const textFixture = { platform:'instagram', destination:'publication', product:'Producto', texts:true };
  const withoutScene = c.SubliPrompt.compose(textFixture, {}, c.SubliPrompt.defaults);
  check('Escena vacía no agrega contexto inventado al prompt', () => assert.ok(!withoutScene.includes('ESCENA O CONTEXTO CREATIVO')));
  const storyCopy = c.SubliPrompt.compose({ ...textFixture, destination:'story' }, {}, c.SubliPrompt.defaults);
  const reelCopy = c.SubliPrompt.compose({ ...textFixture, destination:'reel' }, {}, c.SubliPrompt.defaults);
  const reelVisuals = c.SubliPrompt.compose({ ...textFixture, destination:'reel', photos:true }, {}, c.SubliPrompt.defaults, 'visuals');
  check('Imágenes de Reel mantienen el guion en la etapa 1', () => { assert.ok(reelVisuals.includes('fotografías o portada del Reel')); assert.ok(reelVisuals.includes('El guion y los textos corresponden a la etapa 1')); assert.ok(!reelVisuals.includes('Guion vertical')); });
  const facebookCopy = c.SubliPrompt.compose({ ...textFixture, platform:'facebook' }, {}, c.SubliPrompt.defaults);
  check('Copy listo para publicar respeta historia, Reel y otras plataformas', () => { assert.ok(storyCopy.includes('no lo conviertas en un pie de foto largo')); assert.ok(reelCopy.includes('apartado separado del pie de foto')); assert.ok(reelCopy.includes('No prometas generar un video')); assert.ok(!facebookCopy.includes('ENTREGA LISTA PARA INSTAGRAM')); });
  const visualOnly = c.SubliPrompt.compose({ ...textFixture, texts:false, photos:true, scene:freeScene }, {}, c.SubliPrompt.defaults);
  check('Solo imágenes usa escena y conserva producto sin agregar copy desactivado', () => { assert.ok(visualOnly.includes('Ambienta las fotografías solicitadas')); assert.ok(visualOnly.includes('no se presentan como incluidos en la venta')); assert.ok(!visualOnly.includes('ESTILO DE MARKETING')); });
  for (const [platform, expected] of Object.entries({ instagram:['publication','story','carousel','reel'], facebook:['publication','story','marketplace','group','reel'], whatsapp:['status','message','catalog'] })) {
    await app.input('platform', platform);
    check('Destinos válidos de ' + platform, () => { assert.deepEqual(Array.from($('destination').options, x => x.value), expected); assert.ok(expected.includes($('destination').value)); });
  }
  await app.input('destination', 'catalog');
  check('Catálogo ofrece datos pertinentes sin mostrarlos automáticamente', () => { assert.equal($('optional-condition').hidden, true); assert.ok($('product-add-menu').options.some(button => button.textContent === 'Estado del producto')); });
  await $('product-add-menu').options.find(button => button.textContent === 'Estado del producto').fire('click');
  check('Estado del producto aparece al agregarlo', () => assert.equal($('optional-condition').hidden, false));
  await app.input('destination', 'message');
  check('Datos de catálogo ocultos en mensaje', () => { assert.equal($('optional-condition').hidden, true); assert.ok(!$('product-add-menu').options.some(button => button.textContent === 'Estado del producto')); });
  let combinations = 0;
  for (const [platform, destinations] of Object.entries(c.SubliPrompt.destinations)) for (const destination of Object.keys(destinations)) for (let mask = 1; mask < 8; mask++) {
    const options = { platform, destination, product: productToken, texts:!!(mask&1), photos:!!(mask&2), flyer:!!(mask&4), photoCount:5, photoMode:'variants', price:'5990', flyerMessage:'Mensaje confirmado', flyerContact:'Contacto confirmado' };
    const p = c.SubliPrompt.compose(options, {}, c.SubliPrompt.defaults);
    assert.equal(p.includes('NOMBRES Y TEXTOS'), !!(mask&1)); assert.equal(p.includes('FOTOGRAFÍAS\n'), !!(mask&2)); assert.equal(p.includes('FLYER PROMOCIONAL'), !!(mask&4));
    assert.ok(p.includes('No inventes materiales')); assert.ok(p.includes('SubliVicky')); if (mask&2) assert.ok(p.includes('fotografía: 5')); if (destination === 'reel') assert.ok(p.includes('No prometas generar un video')); combinations++;
    const first = c.SubliPrompt.compose(options, {}, c.SubliPrompt.defaults, 'analysis');
    const second = c.SubliPrompt.compose(options, {}, c.SubliPrompt.defaults, 'visuals');
    assert.ok(first.includes('ETAPA 1')); assert.equal(first.includes('NOMBRES Y TEXTOS'), !!(mask&1)); assert.ok(!first.includes('FOTOGRAFÍAS\n')); assert.ok(!first.includes('FLYER PROMOCIONAL'));
    assert.equal(first.includes('TEXTOS DEL FLYER PARA APROBAR'), !!(mask&4));
    if (mask&6) { assert.ok(second.includes('ETAPA 2')); assert.ok(!second.includes('NOMBRES Y TEXTOS')); assert.equal(second.includes('FOTOGRAFÍAS\n'), !!(mask&2)); assert.equal(second.includes('FLYER PROMOCIONAL'), !!(mask&4)); }
    else assert.equal(second, '');
  }
  check(combinations + ' combinaciones coherentes de plataforma, destino y tareas', () => assert.equal(combinations, 84));
  await app.input('photos', true);
  check('Etapa 1 analiza sin generar fotos ni requerir precio', () => { assert.ok($('prompt').value.includes('ETAPA 1')); assert.ok(!$('prompt').value.includes('FOTOGRAFÍAS\n')); assert.equal($('stage-visuals').disabled, false); });
  await app.input('flyer', true);
  check('Etapa 1 propone textos del flyer sin exigir datos de la etapa 2', () => { assert.ok($('prompt').value.includes('TEXTOS DEL FLYER PARA APROBAR')); assert.ok($('prompt').value.includes('sin generar fotografías ni flyer')); assert.equal($('flyer-pending').hidden, true); assert.equal($('flyerMessage').required, false); });
  await $('stage-visuals').fire('click');
  await app.input('flyer', true);
  check('Flyer requiere mensaje y contacto; precio opcional', () => { assert.equal($('prompt').value, ''); assert.equal($('flyer-pending').hidden, false); assert.equal($('flyerMessage').required, true); assert.equal($('flyerPrice').required, false); assert.equal($('flyerContact').required, true); });
  await $('copy-prompt').fire('click');
  check('No copia flyer incompleto; no exige precio ausente', () => { assert.equal(app.state.copied, null); assert.equal($('flyerMessage-error').hidden, false); assert.equal($('flyerPrice-error').hidden, true); assert.equal($('flyerContact-error').hidden, false); });
  await app.input('flyerMessage', 'Regala un tazón personalizado'); await app.input('flyerContact', 'Contacto confirmado');
  check('Flyer sin precio genera instrucciones para omitirlo', () => { assert.ok($('prompt').value.includes('FLYER PROMOCIONAL')); assert.ok($('prompt').value.includes('Omítelo en el flyer')); assert.equal($('optional-flyerPrice').hidden, true); });
  await $('copy-prompt').fire('click');
  check('Flyer sin precio permite copiar', () => assert.equal(app.state.copied, $('prompt').value));
  await $('flyer-add-menu').options.find(button => button.textContent === 'Precio en el flyer').fire('click');
  check('Precio de flyer se agrega desde el botón sin ser obligatorio', () => { assert.equal($('optional-flyerPrice').hidden, false); assert.equal($('flyerPrice').required, false); });
  await app.input('price', '5990'); await app.input('photoCount', '3');
  check('Campos de fotos y flyer; precio del producto reutilizado', () => { assert.equal($('photo-fields').hidden, false); assert.equal($('flyer-fields').hidden, false); assert.ok($('prompt').value.includes('flyer: $5.990 CLP')); assert.ok($('prompt').value.includes('fotografía: 3')); });
  check('Etapa 2 usa decisiones aprobadas y no vuelve a proponer nombres', () => { assert.ok($('prompt').value.includes('ETAPA 2')); assert.ok($('prompt').value.includes('mismo chat')); assert.ok($('prompt').value.includes('no propongas nuevos nombres')); assert.ok(!$('prompt').value.includes('NOMBRES Y TEXTOS')); });
  check('Escena se aplica a fotografías y flyer seleccionados', () => { assert.ok($('prompt').value.includes('Ambienta las fotografías solicitadas')); assert.ok($('prompt').value.includes('Integra esta escena en el flyer solicitado')); });
  await app.input('flyerPrice', '4990');
  check('Precio propio del flyer', () => assert.ok($('prompt').value.includes('flyer: $4.990 CLP')));
  await app.input('flyerPrice', '-1');
  check('Precio negativo impide generar flyer', () => assert.equal($('prompt').value, ''));
  await app.input('flyerPrice', '0');
  check('Precio cero explícito es válido', () => assert.ok($('prompt').value.includes('flyer: $0 CLP')));
  await app.input('flyerPrice', '4990');
  $('prompt').value = 'Mi edición manual para copiar exactamente.'; await $('prompt').fire('input'); await app.input('features', 'Característica nueva');
  check('Opciones no sobrescriben edición manual; ofrecen decisión', () => { assert.equal($('prompt').value, 'Mi edición manual para copiar exactamente.'); assert.equal($('edit-conflict').hidden, false); });
  await $('keep-prompt').fire('click');
  check('Conservar cambios oculta aviso y mantiene texto', () => { assert.equal($('edit-conflict').hidden, true); assert.equal($('prompt').value, 'Mi edición manual para copiar exactamente.'); });
  app = boot(); c = app.c; $ = app.$;
  check('Recarga conserva producto, opciones y edición manual', () => { assert.equal($('product').value, productToken); assert.equal($('photoCount').value, '3'); assert.equal($('prompt').value, 'Mi edición manual para copiar exactamente.'); });
  check('Recarga recuerda campos agregados aunque estén vacíos', () => { assert.equal($('optional-audience').hidden, false); assert.equal($('audience').value, ''); });
  await app.input('flyerPrice', '-1'); await $('copy-prompt').fire('click');
  check('Edición manual se conserva, pero flyer inválido no se copia', () => { assert.equal($('prompt').value, 'Mi edición manual para copiar exactamente.'); assert.equal(app.state.copied, null); });
  await app.input('flyerPrice', '4990');
  await $('copy-prompt').fire('click');
  check('Copiar usa exactamente el prompt visible y confirma', () => { assert.equal(app.state.copied, $('prompt').value); assert.ok($('status').textContent.includes('copiado')); });
  app.state.copyFails = true; await $('copy-prompt').fire('click');
  check('Fallo de copia no selecciona editor y ofrece acción manual', () => { assert.ok(!$('prompt').selected); assert.equal($('manual-copy').hidden, false); assert.ok($('status').textContent.includes('no permitió copiar')); });
  await $('manual-copy').fire('click');
  check('Selección manual solo ocurre al pulsar su botón', () => { assert.equal($('prompt').selected, true); assert.ok($('status').textContent.includes('Ctrl+C')); });
  await app.input('features', 'Cambio posterior');
  check('Nuevo cambio vuelve a ofrecer actualización', () => assert.equal($('edit-conflict').hidden, false));
  await $('update-prompt').fire('click');
  check('Actualizar explícitamente genera con nuevas opciones', () => { assert.ok($('prompt').value.includes('Cambio posterior')); assert.equal($('edit-conflict').hidden, true); });
  await $('open-chatgpt').fire('click');
  check('Sin enlace abre configuración y explica dónde configurarlo', () => { assert.equal($('settings-dialog').open, true); assert.equal(app.state.opened, null); assert.ok($('url-error').textContent.includes('Configura')); });
  for (const bad of ['http://chatgpt.com/', 'https://chatgpt.com.ejemplo.cl/', 'https://ejemplo.cl/?chatgpt.com', 'javascript:alert(1)', 'https://user:pass@chatgpt.com/']) assert.equal(c.SubliPrompt.validUrl(bad), false);
  check('Validación HTTPS y dominio exacto', () => assert.equal(c.SubliPrompt.validUrl('https://chatgpt.com/g/proyecto'), true));
  $('chatgptUrl').value = 'https://ejemplo.cl/'; await $('settings-form').fire('submit');
  check('Configuración rechaza enlace inválido', () => { assert.equal($('settings-dialog').open, true); assert.equal($('url-error').hidden, false); });
  $('chatgptUrl').value = 'https://chatgpt.com/g/proyecto'; $('businessContact').value = 'Contacto confirmado de prueba'; $('businessLocation').value = 'Ubicación de prueba'; await $('settings-form').fire('submit'); await $('open-chatgpt').fire('click');
  check('Si falla la copia abre ChatGPT y permite copia manual', () => { assert.equal(app.state.opened.url, 'https://chatgpt.com/g/proyecto'); assert.equal($('chatgpt-fallback').hidden, false); assert.equal($('prompt').selected, true); assert.ok($('status').textContent.includes('no se pudo copiar')); });
  app.state.copyFails = false; await $('open-chatgpt').fire('click');
  check('Apertura solicita otra pestaña sin enviar prompt ni fotos', () => { assert.equal(app.state.opened.url, 'https://chatgpt.com/g/proyecto'); assert.equal(app.state.opened.target, '_blank'); assert.equal(app.state.opened.rel, 'noopener noreferrer'); });
  check('Intenta copiar el prompt visible y ofrece enlace alternativo', () => { assert.equal(app.state.copied, $('prompt').value); assert.equal($('chatgpt-fallback').hidden, false); assert.ok($('status').textContent.includes('Prompt copiado')); });
  const modernClipboard = c.navigator.clipboard;
  c.window.isSecureContext = false; delete c.navigator.clipboard; app.state.legacyCopySucceeds = true;
  await $('open-chatgpt').fire('click');
  check('HTTP local sin Clipboard API copia con alternativa y abre', () => { assert.equal(app.state.opened.copiedBeforeOpen, $('prompt').value); assert.ok($('status').textContent.includes('Prompt copiado')); assert.equal($('prompt').readOnly, false); });
  check('Respaldo copia desde campo temporal editable y lo elimina', () => { const buffer = app.state.lastCopyBuffer; assert.notEqual(buffer, $('prompt')); assert.equal(buffer.readOnly, false); assert.equal(buffer.selectionStart, 0); assert.equal(buffer.selectionEnd, $('prompt').value.length); assert.equal(buffer.removed, true); assert.equal(c.document.body.children.length, 0); assert.equal(app.state.copyMime, 'text/plain'); });
  app.state.legacyCopySucceeds = false; app.state.opened = null;
  await $('open-chatgpt').fire('click');
  check('HTTP local con ambas copias bloqueadas sigue abriendo', () => { assert.equal(app.state.opened.url, 'https://chatgpt.com/g/proyecto'); assert.ok($('status').textContent.includes('no se pudo copiar')); });
  app.state.legacyThrows = true; await $('copy-prompt').fire('click');
  check('Error de Safari limpia campo temporal y no confirma copia', () => { assert.equal(c.document.body.children.length, 0); assert.equal($('manual-copy').hidden, false); assert.ok(!$('status').textContent.includes('Prompt copiado')); assert.ok($('status').textContent.includes('HTTP')); });
  app.state.legacyThrows = false;
  app.state.legacyCopySucceeds = true; app.state.opened = null; await $('copy-prompt').fire('click');
  check('Copiar solamente en HTTP usa alternativa sin abrir pestaña', () => { assert.equal(app.state.copied, $('prompt').value); assert.equal(app.state.opened, null); });
  $('prompt').value = 'Diseño único ✨\nTazón: $5.990 CLP\n' + 'Texto extenso con ñ y á. '.repeat(800); await $('prompt').fire('input'); await $('copy-prompt').fire('click');
  check('Copia texto largo, saltos de línea y caracteres especiales exactos', () => { assert.equal(app.state.copied, $('prompt').value); assert.equal($('manual-copy').hidden, true); });
  await $('update-prompt').fire('click');
  c.window.isSecureContext = true; c.navigator.clipboard = modernClipboard; app.state.copyFails = true;
  await $('copy-prompt').fire('click');
  check('Permiso de Clipboard API denegado prueba el segundo método', () => assert.ok($('status').textContent.includes('Prompt copiado')));
  app.state.copyFails = false; app.state.legacyCopySucceeds = false;
  let releaseCopy;
  c.navigator.clipboard = { writeText() { return new Promise(resolve => { releaseCopy = resolve; }); } };
  app.state.opened = null;
  const pendingOpen = $('open-chatgpt').fire('click');
  check('La apertura no espera a resolver permisos de copia', () => assert.equal(app.state.opened.url, 'https://chatgpt.com/g/proyecto'));
  releaseCopy(); await pendingOpen; c.navigator.clipboard = modernClipboard;
  check('Botón app móvil usa enlace HTTPS directo en la misma pestaña', () => { const link = $('open-chatgpt-app'); assert.equal(link.href, 'https://chatgpt.com/g/proyecto'); assert.equal(link.target, '_self'); });
  await $('template-open').fire('click');
  check('Editor de plantilla no incorpora el producto ni la escena particular', () => { for (const key of Object.keys(c.SubliPrompt.defaults)) { assert.ok(!$('template-' + key).value.includes(productToken)); assert.ok(!$('template-' + key).value.includes(freeScene)); } });
  $('template-base').value = 'Instrucción reutilizable de prueba'; await $('template-form').fire('submit');
  check('Plantilla guardada se aplica al compositor', () => assert.ok($('prompt').value.includes('Instrucción reutilizable de prueba')));
  app = boot(); c = app.c; $ = app.$;
  check('Recarga conserva enlace, negocio y plantilla', () => { const p = $('prompt').value; assert.ok(p.includes('Instrucción reutilizable de prueba')); assert.ok(p.includes('Contacto confirmado de prueba')); });
  $('prompt').value = 'Edición propia de imágenes'; await $('prompt').fire('input');
  await $('stage-analysis').fire('click');
  check('Cambiar a etapa 1 recupera su análisis y copy', () => { assert.ok($('prompt').value.includes('ETAPA 1')); assert.ok($('prompt').value.includes('NOMBRES Y TEXTOS')); });
  $('prompt').value = 'Edición propia de análisis'; await $('prompt').fire('input');
  await $('stage-visuals').fire('click');
  check('Cambiar de etapa conserva la edición independiente de imágenes', () => assert.equal($('prompt').value, 'Edición propia de imágenes'));
  await $('stage-analysis').fire('click');
  check('La edición del análisis también se conserva', () => assert.equal($('prompt').value, 'Edición propia de análisis'));
  app = boot(); c = app.c; $ = app.$;
  check('Recarga recuerda etapa activa y su edición', () => { assert.equal($('prompt').value, 'Edición propia de análisis'); assert.equal($('stage-analysis').attrs['aria-pressed'], 'true'); });
  await $('stage-visuals').fire('click');
  check('Recarga conserva también la edición de la otra etapa', () => assert.equal($('prompt').value, 'Edición propia de imágenes'));
  await $('update-prompt').fire('click');
  await $('template-restore').fire('click');
  check('Restauración pide confirmación; cancelar conserva plantilla', () => { assert.equal(app.state.confirmations, 1); assert.ok($('prompt').value.includes('Instrucción reutilizable de prueba')); });
  app.state.confirm = true; await $('template-restore').fire('click');
  check('Restauración confirmada vuelve al original', () => assert.ok(!$('prompt').value.includes('Instrucción reutilizable de prueba')));
  await app.input('product', '');
  check('Descripción obligatoria; no genera con datos insuficientes', () => assert.equal($('prompt').value, ''));
  app.state.opened = null; await $('open-chatgpt').fire('click');
  check('No abre ChatGPT con prompt vacío', () => assert.equal(app.state.opened, null));
  const emptyTemplates = { base:'', texts:'', photos:'', flyer:'' };
  const fixed = c.SubliPrompt.compose({ platform:'instagram', destination:'publication', product:'Producto', texts:true }, {}, emptyTemplates);
  check('Rol, idioma, nombres y restricciones sobreviven a plantillas vacías', () => { assert.ok(fixed.includes('especialista')); assert.ok(fixed.includes('público chileno')); assert.ok(fixed.includes('tres alternativas')); assert.ok(fixed.includes('No inventes materiales')); });
  check('Guía de marketing se aplica también con plantillas ya personalizadas', () => { assert.ok(fixed.includes('ESTILO DE MARKETING')); assert.ok(fixed.includes('listo para copiar y pegar en Instagram')); });
  const blocked = boot({ storageBlocked: true });
  check('Almacenamiento bloqueado muestra aviso sin romper la app', () => assert.equal(blocked.$('storage-warning').hidden, false));
  await blocked.input('product', 'Producto sin precio'); await blocked.input('flyer', true); await blocked.input('flyer', false);
  check('Desactivar flyer elimina sus requisitos y permite generar', () => { assert.ok(blocked.$('prompt').value.includes('Producto sin precio')); assert.equal(blocked.$('flyerMessage').required, false); assert.equal(blocked.$('flyerPrice').required, false); assert.equal(blocked.$('flyer-pending').hidden, true); });
  check('Contacto común satisface requisito sin necesidad de precio', () => { const errors = c.SubliPrompt.flyerErrors({ flyer:true, flyerMessage:'Mensaje' }, { contact:'Contacto configurado' }); assert.deepEqual(Object.keys(errors), []); });
  console.log(`\n${passed} comprobaciones correctas. DOM, portapapeles y apertura simulados; no valida renderizado ni navegador real.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
