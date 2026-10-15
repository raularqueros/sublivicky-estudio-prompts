'use strict';
(function () {
  const { destinations, defaults, compose, validUrl, flyerErrors } = SubliPrompt;
  const $ = id => document.getElementById(id);
  const storageKey = 'sublivicky.studio.v1';
  const fields = ['platform','destination','product','currentName','sceneEnabled','scene','features','price','audience','delivery','notes','condition','listingLocation','texts','photos','flyer','photoImprove','photoStyle','photoCount','photoMode','flyerMessage','flyerPrice','flyerContact','flyerValidity','flyerVisual'];
  const blankDraft = { platform:'instagram', destination:'publication', product:'', currentName:'', sceneEnabled:false, scene:'', features:'', price:'', audience:'', delivery:'', notes:'', condition:'', listingLocation:'', texts:true, photos:false, flyer:false, photoImprove:'', photoStyle:'', photoCount:'1', photoMode:'originals', flyerMessage:'', flyerPrice:'', flyerContact:'', flyerValidity:'', flyerVisual:'' };
  const optionalGroups = {
    product: { currentName:'Nombre actual', features:'Características y personalización', price:'Precio del producto', audience:'Público objetivo', delivery:'Entrega o despacho', notes:'Observaciones', condition:'Estado del producto', listingLocation:'Ubicación del aviso' },
    photo: { photoImprove:'Qué deseas mejorar', photoStyle:'Estilo visual' },
    flyer: { flyerPrice:'Precio en el flyer', flyerValidity:'Vigencia', flyerVisual:'Preferencias visuales' }
  };
  const optionalKeys = Object.values(optionalGroups).flatMap(group => Object.keys(group));
  const sceneIdeas = {
    'Oficina':'Oficina moderna, con el producto integrado en un espacio de trabajo ordenado.',
    'Eventos':'Evento especial, con una presentación cuidada y el producto como protagonista.',
    'Cumpleaños':'Cumpleaños, con el producto presentado como un detalle personalizado para celebrar.',
    'Escritorio':'Escritorio creativo, con una composición cercana y elementos de trabajo como ambientación.',
    'Home office':'Rincón de home office, acogedor y con luz natural.',
    'Desayuno en casa':'Desayuno en casa, con una mesa acogedora y luz suave de mañana.',
    'Cafetería':'Cafetería acogedora, con el producto destacado en primer plano.',
    'Regalo corporativo':'Presentación como regalo corporativo, en un entorno profesional.',
    'Feria de emprendedores':'Feria de emprendedores, con el producto en un puesto cuidado y atractivo.',
    'Graduación':'Celebración de graduación, con una ambientación alegre y elegante.',
    'Baby shower':'Baby shower, con una ambientación delicada de celebración.',
    'Reunión familiar':'Reunión familiar, con el producto integrado en un momento cercano y cotidiano.'
  };
  let optionalSelection = new Set();
  let config = { url:'', contact:'', location:'', details:'' };
  let templates = { ...defaults };
  let draft = { ...blankDraft };
  let manual = false;
  let lastGenerated = '';
  let dismissedCandidate = null;
  let storedPrompt = '';
  let activeStage = 'analysis';
  const stageStates = {};
  let hasSavedSceneToggle = false;
  function notify(message) { $('status').textContent = message; }
  function storageWarning() { $('storage-warning').hidden = false; $('storage-warning').textContent = 'El navegador no permite guardar los datos locales. Puedes usar la app y copiar el prompt, pero tus cambios no se conservarán al cerrar o recargar.'; }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && saved.version === 1) {
      for (const key of Object.keys(config)) if (typeof saved.config?.[key] === 'string') config[key] = saved.config[key];
      for (const key of Object.keys(templates)) if (typeof saved.templates?.[key] === 'string') templates[key] = saved.templates[key];
      for (const key of fields) if (typeof saved.draft?.[key] === typeof blankDraft[key]) draft[key] = saved.draft[key];
      manual = saved.manual === true;
      storedPrompt = typeof saved.prompt === 'string' ? saved.prompt : '';
      lastGenerated = typeof saved.lastGenerated === 'string' ? saved.lastGenerated : '';
      dismissedCandidate = typeof saved.dismissedCandidate === 'string' ? saved.dismissedCandidate : null;
      optionalSelection = new Set((Array.isArray(saved.optionalFields) ? saved.optionalFields : []).filter(key => optionalKeys.includes(key)));
      hasSavedSceneToggle = typeof saved.draft?.sceneEnabled === 'boolean';
      activeStage = saved.activeStage === 'visuals' ? 'visuals' : 'analysis';
      for (const stage of ['analysis','visuals']) {
        const entry = saved.stagePrompts?.[stage];
        if (entry && typeof entry.prompt === 'string') stageStates[stage] = {
          prompt:entry.prompt, manual:entry.manual === true,
          lastGenerated:typeof entry.lastGenerated === 'string' ? entry.lastGenerated : '',
          dismissedCandidate:typeof entry.dismissedCandidate === 'string' ? entry.dismissedCandidate : null
        };
      }
    }
  } catch { storageWarning(); }
  // Solo la etapa se comparte en la URL; los datos del producto permanecen en el navegador.
  if (window.location?.href) {
    const requestedStage = new URL(window.location.href).searchParams.get('stage');
    if (['analysis','visuals'].includes(requestedStage) && requestedStage !== activeStage && (requestedStage !== 'visuals' || draft.photos || draft.flyer)) {
      stageStates[activeStage] = { prompt:storedPrompt, manual, lastGenerated, dismissedCandidate };
      activeStage = requestedStage;
      const entry = stageStates[activeStage];
      storedPrompt = entry?.prompt || '';
      manual = entry?.manual === true;
      lastGenerated = entry?.lastGenerated || '';
      dismissedCandidate = entry?.dismissedCandidate ?? null;
    }
  }
  // Recupera también campos con datos de borradores anteriores a este selector.
  for (const key of optionalKeys) if (draft[key].trim()) optionalSelection.add(key);
  if (!hasSavedSceneToggle) draft.sceneEnabled = !!draft.scene.trim();
  if (!destinations[draft.platform]) draft.platform = 'instagram';
  if (!destinations[draft.platform][draft.destination]) draft.destination = Object.keys(destinations[draft.platform])[0];
  if (!['1','2','3','4','5'].includes(draft.photoCount)) draft.photoCount = '1';
  if (!['originals','variants'].includes(draft.photoMode)) draft.photoMode = 'originals';
  function persist() {
    stageStates[activeStage] = { prompt:$('prompt').value, manual, lastGenerated, dismissedCandidate };
    try { localStorage.setItem(storageKey, JSON.stringify({ version:1, config, templates, draft, prompt:$('prompt').value, manual, lastGenerated, dismissedCandidate, optionalFields:[...optionalSelection], activeStage, stagePrompts:stageStates })); }
    catch { storageWarning(); }
  }
  function renderDestinations() {
    $('destination').replaceChildren(...Object.entries(destinations[draft.platform]).map(([value, [label]]) => new Option(label, value)));
    if (!destinations[draft.platform][draft.destination]) draft.destination = Object.keys(destinations[draft.platform])[0];
    $('destination').value = draft.destination;
  }
  function updateVisibility() {
    $('photo-fields').hidden = !draft.photos;
    $('flyer-fields').hidden = !draft.flyer;
    $('format-hint').textContent = destinations[draft.platform][draft.destination][1];
    $('flyerPrice').placeholder = draft.price ? `Usa $${Number(draft.price).toLocaleString('es-CL')} CLP del producto` : 'Usa el precio del producto';
    $('flyerMessage').required = draft.flyer && activeStage === 'visuals';
    $('flyerPrice').required = false;
    $('flyerContact').required = draft.flyer && activeStage === 'visuals' && !config.contact.trim();
    $('flyerContact').placeholder = config.contact || 'Usa el contacto configurado';
    $('listingLocation').placeholder = config.location || 'Comuna o ciudad';
    const platformLabel = { instagram:'Instagram', facebook:'Facebook', whatsapp:'WhatsApp' }[draft.platform];
    $('prompt-description').textContent = activeStage === 'visuals'
      ? 'En el mismo chat, produce las fotografías y el flyer seleccionados usando el análisis, la escena y los textos aprobados en la etapa 1.'
      : draft.texts
      ? `Pedirá textos de marca listos para ${platformLabel}: un inicio atractivo, beneficios claros, emojis cuando aporten y una invitación a comprar. Puedes editar las instrucciones aquí.`
      : 'Analiza el producto y las fotografías originales antes de crear imágenes. En esta etapa no se generan imágenes.';
    $('prompt-title').textContent = activeStage === 'analysis' ? 'Prompt 1 · Análisis y textos' : 'Prompt 2 · Fotografías y flyer';
    $('stage-analysis').setAttribute('aria-pressed', String(activeStage === 'analysis'));
    $('stage-visuals').setAttribute('aria-pressed', String(activeStage === 'visuals'));
    $('stage-visuals').disabled = !(draft.photos || draft.flyer);
    $('visuals-help').hidden = draft.photos || draft.flyer;
    $('stage-help').textContent = activeStage === 'analysis'
      ? 'Pega este primer prompt en ChatGPT y adjunta las fotos originales. Revisa y aprueba las propuestas allí. Después prepara el prompt 2 en este mismo chat. Si solo necesitas textos, termina en esta etapa.'
      : 'Usa este segundo prompt después de aprobar los textos en ChatGPT. Se conserva el nombre elegido; no se vuelve a redactar la descripción. Completa aquí los datos confirmados del flyer si lo seleccionaste.';
    $('optional-scene').hidden = !draft.sceneEnabled;
    $('sceneEnabled').setAttribute('aria-expanded', String(draft.sceneEnabled));
    // Enlace HTTPS directo: iOS puede entregarlo a la app instalada sin navegación diferida.
    $('open-chatgpt-app').href = validUrl(config.url) ? config.url : 'https://chatgpt.com/';
    renderOptionalFields();
    const missingFlyer = activeStage === 'visuals' ? Object.keys(flyerErrors(draft, config)) : [];
    $('flyer-pending').hidden = missingFlyer.length === 0;
    $('flyer-pending').textContent = missingFlyer.length ? 'Revisa estos datos del flyer para preparar y copiar el prompt: ' + missingFlyer.map(key => ({ flyerMessage:'mensaje u oferta obligatorio', flyerPrice:'precio en CLP válido si lo incluyes', flyerContact:'contacto obligatorio' })[key]).join(', ') + '.' : '';
  }
  function optionalAllowed(key) { return !['condition','listingLocation'].includes(key) || ['marketplace','catalog'].includes(draft.destination); }
  function renderOptionalFields() {
    for (const [group, options] of Object.entries(optionalGroups)) {
      const menu = $(group + '-add-menu');
      const available = [];
      for (const [key, label] of Object.entries(options)) {
        $('optional-' + key).hidden = !optionalSelection.has(key) || !optionalAllowed(key);
        if (optionalSelection.has(key) || !optionalAllowed(key)) continue;
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'button quiet'; button.textContent = label;
        button.addEventListener('click', () => {
          optionalSelection.add(key);
          if (!['currentName','scene'].includes(key)) $(group + '-extras').append($('optional-' + key));
          menu.hidden = true; $(group + '-add').setAttribute('aria-expanded', 'false');
          refresh(); $(key).focus();
        });
        available.push(button);
      }
      menu.replaceChildren(...available);
      $(group + '-add').hidden = available.length === 0;
      if (!available.length) { menu.hidden = true; $(group + '-add').setAttribute('aria-expanded', 'false'); }
    }
  }
  for (const group of Object.keys(optionalGroups)) {
    $(group + '-add').addEventListener('click', () => {
      const menu = $(group + '-add-menu'); menu.hidden = !menu.hidden;
      $(group + '-add').setAttribute('aria-expanded', String(!menu.hidden));
    });
  }
  $('scene-presets').replaceChildren(...Object.entries(sceneIdeas).map(([label, context]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'scene-chip'; button.textContent = label;
    button.addEventListener('click', () => {
      const existing = $('scene').value.trim();
      if (!existing.includes(context)) {
        draft.scene = existing ? existing + '\n' + context : context;
        $('scene').value = draft.scene;
        refresh();
      }
      $('scene').focus();
    });
    return button;
  }));
  function updateMeta() {
    $('character-count').textContent = `${$('prompt').value.length.toLocaleString('es-CL')} caracteres`;
    $('prompt-state').textContent = manual ? 'Edición propia · guardada en el borrador' : $('prompt').value ? 'Generado con tus opciones · borrador local' : 'Completa tu producto para empezar';
    if (!$('storage-warning').hidden && manual) $('prompt-state').textContent = 'Edición propia · guardado local no disponible';
  }
  function refresh() {
    $('chatgpt-fallback').hidden = true;
    $('manual-copy').hidden = true;
    updateVisibility();
    const candidate = compose(draft, config, templates, activeStage);
    if (!manual) { $('prompt').value = candidate; lastGenerated = candidate; dismissedCandidate = null; }
    $('edit-conflict').hidden = !(manual && candidate !== lastGenerated && candidate !== dismissedCandidate);
    updateMeta();
    if (window.location?.href && window.history?.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.set('stage', activeStage);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    persist();
  }
  renderDestinations();
  for (const key of fields) {
    if ($(key).type === 'checkbox') $(key).checked = draft[key];
    else $(key).value = draft[key];
  }
  $('prompt').value = storedPrompt;
  // Ordena solo al recuperar el borrador; mover controles al escribir les quitaría el foco.
  for (const [group, options] of Object.entries(optionalGroups)) {
    for (const key of optionalSelection) if (Object.hasOwn(options, key) && !['currentName','scene'].includes(key)) $(group + '-extras').append($('optional-' + key));
  }
  refresh();
  function switchStage(stage) {
    if (stage === activeStage || (stage === 'visuals' && !(draft.photos || draft.flyer))) return;
    persist();
    activeStage = stage;
    const saved = stageStates[stage];
    manual = saved?.manual === true;
    lastGenerated = saved?.lastGenerated || '';
    dismissedCandidate = saved?.dismissedCandidate ?? null;
    $('prompt').value = saved?.prompt || '';
    clearFlyerErrors(); refresh(); notify('');
  }
  $('stage-analysis').addEventListener('click', () => switchStage('analysis'));
  $('stage-visuals').addEventListener('click', () => switchStage('visuals'));
  $('brief-form').addEventListener('submit', event => event.preventDefault());
  $('brief-form').addEventListener('input', event => {
    const field = event.target;
    if (!fields.includes(field.id)) return;
    draft[field.id] = field.type === 'checkbox' ? field.checked : field.value;
    if (field.id === 'platform') renderDestinations();
    $('product-error').hidden = true;
    $('product').removeAttribute('aria-invalid');
    $('tasks-error').hidden = true;
    $('texts').removeAttribute('aria-invalid');
    clearFlyerErrors();
    $('chatgpt-fallback').hidden = true;
    notify('');
    refresh();
  });
  $('prompt').addEventListener('input', () => { manual = true; dismissedCandidate = null; $('chatgpt-fallback').hidden = true; $('manual-copy').hidden = true; updateMeta(); persist(); });
  function clearFlyerErrors() {
    for (const key of ['flyerMessage','flyerPrice','flyerContact']) { $(key + '-error').hidden = true; $(key).removeAttribute('aria-invalid'); }
  }
  function validateFlyer() {
    clearFlyerErrors();
    if (activeStage !== 'visuals') return true;
    const errors = flyerErrors(draft, config);
    if (errors.flyerPrice && !optionalSelection.has('flyerPrice')) {
      optionalSelection.add('flyerPrice'); $('flyer-extras').append($('optional-flyerPrice')); renderOptionalFields(); persist();
    }
    for (const [key, message] of Object.entries(errors)) { $(key + '-error').textContent = message; $(key + '-error').hidden = false; $(key).setAttribute('aria-invalid','true'); }
    const first = Object.keys(errors)[0];
    if (first) { $(first).focus(); notify(errors[first]); return false; }
    return true;
  }
  function validateDraft() {
    if (!draft.product.trim()) {
      $('product-error').hidden = false;
      $('product').setAttribute('aria-invalid','true');
      $('product').setAttribute('aria-describedby','product-error');
      $('product').focus();
      notify('Falta la descripción básica del producto. Tu edición del prompt se conserva.');
      return false;
    }
    if (!(draft.texts || draft.photos || draft.flyer)) { $('tasks-error').hidden = false; $('texts').setAttribute('aria-invalid','true'); $('texts').focus(); notify('Elige el contenido que necesitas.'); return false; }
    return validateFlyer();
  }
  $('update-prompt').addEventListener('click', () => {
    if (!validateDraft()) return;
    manual = false; refresh(); notify('Prompt actualizado con las opciones actuales.');
  });
  $('keep-prompt').addEventListener('click', () => { dismissedCandidate = compose(draft, config, templates, activeStage); $('edit-conflict').hidden = true; persist(); notify('Tus ediciones se conservaron. Se copiará exactamente el texto visible.'); });
  function promptToCopy() {
    if (activeStage === 'visuals' && !(draft.photos || draft.flyer)) {
      notify('Selecciona fotografías o flyer en el paso 2 para preparar esta etapa.'); $('photos').focus(); return null;
    }
    if (!validateFlyer()) return null;
    const text = $('prompt').value;
    if (!text.trim()) { if (validateDraft()) notify('Escribe o genera un prompt antes de copiar.'); return null; }
    return text;
  }
  function selectPrompt() {
    $('prompt').focus({ preventScroll:true }); $('prompt').select();
    $('prompt').setSelectionRange(0, $('prompt').value.length);
  }
  function legacyCopy(text) {
    // WebKit: copia desde un control editable temporal, durante el toque del usuario.
    // No cambia el editor ni depende de su selección o de su estado readonly.
    if (typeof document.execCommand !== 'function') return false;
    const previousFocus = document.activeElement;
    const buffer = document.createElement('textarea');
    buffer.value = text;
    buffer.readOnly = false;
    buffer.tabIndex = -1;
    buffer.setAttribute('inputmode', 'none');
    buffer.setAttribute('aria-label', 'Texto temporal para copiar');
    buffer.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:0;opacity:0;font-size:16px;pointer-events:none;-webkit-user-select:text;user-select:text;';
    const copyExactText = event => {
      if (event.clipboardData) { event.clipboardData.setData('text/plain', text); event.preventDefault(); }
    };
    try {
      document.body.appendChild(buffer);
      document.addEventListener('copy', copyExactText, true);
      buffer.focus({ preventScroll:true });
      buffer.select();
      buffer.setSelectionRange(0, text.length);
      return document.execCommand('copy') === true;
    } catch { return false; }
    finally {
      document.removeEventListener('copy', copyExactText, true);
      buffer.remove();
      previousFocus?.focus({ preventScroll:true });
    }
  }
  async function requestCopy(text) {
    if (window.isSecureContext === false || !navigator.clipboard?.writeText) return legacyCopy(text);
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return legacyCopy(text); }
  }
  async function copyPrompt() {
    $('manual-copy').hidden = true;
    const text = promptToCopy();
    if (text === null) return false;
    const copied = await requestCopy(text);
    if (copied) notify('Prompt copiado al portapapeles. Pégalo en ChatGPT y adjunta allí tus fotografías.');
    else {
      $('manual-copy').hidden = false;
      notify(window.isSecureContext === false
        ? 'Safari no autorizó la copia en esta conexión HTTP local. La copia moderna requiere HTTPS. Puedes usar “Seleccionar para copiar manualmente”.'
        : 'El navegador no permitió copiar al portapapeles. Puedes usar “Seleccionar para copiar manualmente”.');
    }
    return copied;
  }
  $('copy-prompt').addEventListener('click', copyPrompt);
  $('manual-copy').addEventListener('click', () => {
    if (promptToCopy() === null) return;
    selectPrompt();
    notify('Texto seleccionado para copia manual: mantén pulsado y elige Copiar en Safari, o usa Ctrl+C / ⌘C en el computador.');
  });
  function fillSettings() {
    $('chatgptUrl').value = config.url; $('businessContact').value = config.contact; $('businessLocation').value = config.location; $('businessDetails').value = config.details; $('url-error').hidden = true; $('chatgptUrl').removeAttribute('aria-invalid');
  }
  function openSettings() { fillSettings(); $('settings-dialog').showModal(); }
  $('settings-open').addEventListener('click', openSettings);
  $('settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const url = $('chatgptUrl').value.trim();
    if (url && !validUrl(url)) { $('url-error').textContent = 'Usa un enlace HTTPS de chatgpt.com, sin usuario ni contraseña en la dirección.'; $('url-error').hidden = false; $('chatgptUrl').setAttribute('aria-invalid','true'); $('chatgptUrl').focus(); return; }
    config = { url, contact:$('businessContact').value.trim(), location:$('businessLocation').value.trim(), details:$('businessDetails').value.trim() };
    clearFlyerErrors();
    $('chatgpt-fallback').hidden = true;
    $('settings-dialog').close(); refresh(); notify('Configuración guardada en este navegador.');
  });
  $('open-chatgpt').addEventListener('click', async () => {
    $('chatgpt-fallback').hidden = true;
    $('manual-copy').hidden = true;
    if (!config.url || !validUrl(config.url)) { openSettings(); $('chatgptUrl').focus(); $('url-error').hidden = false; $('url-error').textContent = 'Configura aquí el enlace de tu proyecto o conversación en ChatGPT para poder abrirlo.'; return; }
    const text = promptToCopy();
    if (text === null) return;
    // Inicia la copia y abre durante el mismo toque, sin esperar permisos ni bloquear por un fallo.
    const copyResult = requestCopy(text);
    const link = $('chatgpt-fallback'); link.href = config.url; link.hidden = false; link.click();
    notify('Se solicitó abrir ChatGPT. Comprobando la copia del prompt…');
    const copied = await copyResult;
    if (copied) notify('Prompt copiado. Pégalo en ChatGPT y adjunta tus fotos. Si no se abrió, usa el enlace de abajo o el botón de la app móvil.');
    else {
      $('manual-copy').hidden = false;
      notify('Se solicitó abrir ChatGPT, pero no se pudo copiar al portapapeles. Vuelve aquí y usa “Seleccionar para copiar manualmente”; después pega en ChatGPT. En Safari sobre HTTP local, la copia moderna requiere HTTPS.');
    }
  });
  function fillTemplates() { for (const key of Object.keys(defaults)) $('template-' + key).value = templates[key]; }
  function openTemplates() { fillTemplates(); $('template-dialog').showModal(); }
  $('template-open').addEventListener('click', openTemplates);
  $('settings-templates').addEventListener('click', openTemplates);
  $('template-form').addEventListener('submit', event => {
    event.preventDefault();
    for (const key of Object.keys(defaults)) templates[key] = $('template-' + key).value.trim();
    $('template-dialog').close(); refresh(); notify('Plantilla reutilizable guardada. Los datos del producto y tu prompt particular no se incorporaron a ella.');
  });
  function restoreTemplates() {
    const changed = Object.keys(defaults).some(key => templates[key] !== defaults[key] || ($('template-dialog').open && $('template-' + key).value.trim() !== defaults[key]));
    if (changed && !window.confirm('¿Restaurar las instrucciones originales? Se reemplazarán tus cambios en las plantillas. El producto y tus ediciones manuales del prompt se conservarán.')) return;
    templates = { ...defaults }; fillTemplates(); refresh(); notify('Plantilla original restaurada.');
  }
  $('template-restore').addEventListener('click', restoreTemplates);
  $('dialog-restore').addEventListener('click', restoreTemplates);
  function hasDialogChanges(id) {
    if (id === 'settings-dialog') return $('chatgptUrl').value.trim() !== config.url || $('businessContact').value.trim() !== config.contact || $('businessLocation').value.trim() !== config.location || $('businessDetails').value.trim() !== config.details;
    return Object.keys(defaults).some(key => $('template-' + key).value.trim() !== templates[key]);
  }
  function closeDialog(id) {
    if (hasDialogChanges(id) && !window.confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y cerrar?')) return;
    $(id).close();
  }
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.dataset.close)));
  for (const id of ['settings-dialog','template-dialog']) $(id).addEventListener('cancel', event => { event.preventDefault(); closeDialog(id); });
  window.addEventListener?.('beforeunload', event => {
    if (['settings-dialog','template-dialog'].some(id => $(id).open && hasDialogChanges(id))) { event.preventDefault(); event.returnValue = ''; }
  });
})();
