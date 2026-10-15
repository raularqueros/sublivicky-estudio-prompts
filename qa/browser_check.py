"""Pruebas reales con Playwright; no añade dependencias a la app publicada."""
import argparse
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def accessibility(page, axe_path):
    if not axe_path:
        return []
    page.add_script_tag(path=axe_path)
    return page.evaluate('async () => (await axe.run(document, {runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","best-practice"]}})).violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}))')


def exercise(page, context, output, axe_path):
    checks = []
    audits = []
    def passed(name):
        checks.append(name)
    def audit(state):
        violations = accessibility(page, axe_path)
        audits.append({'state': state, 'violations': violations})
        assert not violations, json.dumps(audits[-1], ensure_ascii=False)
    audit('inicio')
    page.keyboard.press('Tab')
    expect(page.locator('.skip')).to_be_focused()
    page.keyboard.press('Enter')
    expect(page.locator('#main-content')).to_be_focused()
    passed('Enlace de salto usable con teclado')
    page.get_by_role('link', name='Ver prompts', exact=True).click()
    expect(page.locator('#prompt-panel')).to_be_focused()
    passed('Acceso directo al prompt sin recorrer todo el formulario')
    page.locator('#copy-prompt').click()
    expect(page.locator('#product')).to_be_focused()
    expect(page.locator('#product-error')).to_be_visible()
    passed('Error de producto obligatorio junto al campo y con foco')
    page.locator('#product').fill('Tazón personalizado de prueba para QA')
    expect(page.locator('#prompt')).to_have_value(__import__('re').compile('ETAPA 1'))
    for platform, expected in {
        'facebook':['publication','story','marketplace','group','reel'],
        'whatsapp':['status','message','catalog'],
        'instagram':['publication','story','carousel','reel']
    }.items():
        page.locator('#platform').select_option(platform)
        assert page.locator('#destination option').evaluate_all('els=>els.map(el=>el.value)') == expected
    passed('Destinos correctos y válidos por plataforma')
    page.locator('#product-add').click()
    page.locator('#product-add-menu').get_by_role('button', name='Público objetivo', exact=True).click()
    page.locator('#audience').press_sequentially('Personas que buscan regalos')
    expect(page.locator('#audience')).to_have_value('Personas que buscan regalos')
    expect(page.locator('#audience')).to_be_focused()
    passed('Agregar y escribir un dato opcional conserva foco y texto')
    page.locator('#sceneEnabled').focus()
    page.keyboard.press('Space')
    expect(page.locator('#optional-scene')).to_be_visible()
    assert page.locator('#scene-presets').evaluate('el=>el.scrollHeight>el.clientHeight')
    page.locator('#scene-presets').focus()
    page.keyboard.press('End')
    page.wait_for_function('document.getElementById("scene-presets").scrollTop > 0', timeout=2000)
    assert page.locator('#scene-presets').evaluate('el=>el.scrollTop>0')
    page.locator('#scene-presets').get_by_role('button', name='Oficina', exact=True).click()
    page.locator('#scene').fill('Escena de QA: escritorio con luz natural, sin accesorios incluidos.')
    scene = page.locator('#scene').input_value()
    page.locator('#sceneEnabled').uncheck()
    assert scene not in page.locator('#prompt').input_value()
    page.locator('#sceneEnabled').check()
    expect(page.locator('#scene')).to_have_value(scene)
    passed('Escena visible, lista desplazable con teclado y contexto recuperable')
    page.locator('#settings-open').click()
    page.locator('#chatgptUrl').fill('https://chatgpt.com.ejemplo.cl/')
    page.get_by_role('button', name='Guardar configuración', exact=True).click()
    expect(page.locator('#url-error')).to_be_visible()
    expect(page.locator('#chatgptUrl')).to_be_focused()
    passed('Configuración rechaza dominios engañosos')
    page.locator('#chatgptUrl').fill('https://chatgpt.com/c/sublivicky-prueba')
    page.locator('#businessContact').fill('Contacto de prueba de QA')
    audit('configuracion')
    page.get_by_role('button', name='Guardar configuración', exact=True).click()
    page.locator('#settings-open').click()
    page.locator('#businessLocation').fill('Borrador sin guardar')
    page.once('dialog', lambda dialog: dialog.dismiss())
    page.keyboard.press('Escape')
    expect(page.locator('#settings-dialog')).to_be_visible()
    expect(page.locator('#businessLocation')).to_have_value('Borrador sin guardar')
    page.once('dialog', lambda dialog: dialog.accept())
    page.keyboard.press('Escape')
    expect(page.locator('#settings-dialog')).not_to_be_visible()
    passed('Escape confirma cambios sin guardar; cancelar mantiene el diálogo')
    page.locator('#photos').check()
    page.locator('#flyer').check()
    assert 'TEXTOS DEL FLYER PARA APROBAR' in page.locator('#prompt').input_value()
    page.locator('#stage-visuals').click()
    expect(page.locator('#flyer-pending')).to_be_visible()
    page.locator('#copy-prompt').click()
    expect(page.locator('#flyerMessage')).to_be_focused()
    expect(page.locator('#flyerMessage-error')).to_be_visible()
    page.locator('#flyerMessage').fill('Un regalo hecho para ti')
    assert 'ETAPA 2' in page.locator('#prompt').input_value()
    assert 'El precio es opcional' in page.locator('#prompt').input_value()
    assert 'NOMBRES Y TEXTOS' not in page.locator('#prompt').input_value()
    assert 'stage=visuals' in page.url
    page.locator('#photo-add').click()
    page.locator('#photo-add-menu').get_by_role('button', name='Estilo visual', exact=True).click()
    page.locator('#photoStyle').fill('Luz natural y fondo limpio')
    audit('imagenes_y_escena')
    page.screenshot(path=str(output / 'expanded.png'), full_page=True)
    passed('Etapa 2 usa requisitos de flyer sin exigir precio y refleja etapa en URL')
    page.locator('#prompt').fill('Mi prompt de imágenes editado en QA')
    page.locator('#photoCount').select_option('3')
    expect(page.locator('#prompt')).to_have_value('Mi prompt de imágenes editado en QA')
    expect(page.locator('#edit-conflict')).to_be_visible()
    audit('edicion_manual')
    page.locator('#keep-prompt').click()
    page.locator('#stage-analysis').click()
    page.locator('#prompt').fill('Mi prompt de análisis editado en QA')
    page.locator('#stage-visuals').click()
    expect(page.locator('#prompt')).to_have_value('Mi prompt de imágenes editado en QA')
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('#prompt')).to_have_value('Mi prompt de imágenes editado en QA')
    page.locator('#stage-analysis').click()
    expect(page.locator('#prompt')).to_have_value('Mi prompt de análisis editado en QA')
    passed('Ediciones independientes conservadas entre etapas y tras recargar')
    page.locator('#copy-prompt').click()
    expect(page.locator('#status')).to_contain_text('copiado al portapapeles')
    assert page.evaluate('navigator.clipboard.readText()') == page.locator('#prompt').input_value()
    passed('Copia real al portapapeles del navegador coincide con el texto visible')
    page.evaluate('''() => {
        window.__qaExec = document.execCommand;
        Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:()=>Promise.reject(new Error('QA denied'))}});
        document.execCommand = () => false;
    }''')
    page.locator('#copy-prompt').click()
    expect(page.locator('#manual-copy')).to_be_visible()
    page.locator('#manual-copy').click()
    assert page.locator('#prompt').evaluate('el=>el.selectionEnd-el.selectionStart') == len(page.locator('#prompt').input_value())
    page.evaluate('() => {delete navigator.clipboard; document.execCommand=window.__qaExec;}')
    passed('Copia rechazada ofrece selección manual sin confirmar éxito')
    context.route('https://chatgpt.com/**', lambda route: route.fulfill(status=200, content_type='text/html', body='<title>Destino de prueba</title>'))
    with page.expect_popup() as popup_event:
        page.locator('#open-chatgpt').click()
    popup = popup_event.value
    popup.wait_for_load_state('load')
    assert popup.url == 'https://chatgpt.com/c/sublivicky-prueba'
    popup.close()
    expect(page.locator('#chatgpt-fallback')).to_be_visible()
    passed('Apertura real de pestaña al enlace configurado, con destino interceptado')
    page.locator('#template-open').click()
    assert 'Escena de QA' not in page.locator('#template-base').input_value()
    page.locator('#template-base').fill('Instrucción reutilizable de prueba de QA')
    audit('plantillas')
    page.get_by_role('button', name='Guardar plantilla', exact=True).click()
    expect(page.locator('#prompt')).to_have_value('Mi prompt de análisis editado en QA')
    page.locator('#update-prompt').click()
    assert 'Instrucción reutilizable de prueba de QA' in page.locator('#prompt').input_value()
    passed('Plantilla separada del producto y protección de edición al guardarla')
    page.once('dialog', lambda dialog: dialog.dismiss())
    page.locator('#template-restore').click()
    assert 'Instrucción reutilizable de prueba de QA' in page.locator('#prompt').input_value()
    page.once('dialog', lambda dialog: dialog.accept())
    page.locator('#template-restore').click()
    assert 'Instrucción reutilizable de prueba de QA' not in page.locator('#prompt').input_value()
    passed('Restauración de plantilla exige confirmación')
    page.locator('#stage-visuals').click()
    page.locator('#stage-analysis').click()
    page.reload()
    page.wait_for_load_state('networkidle')
    assert 'stage=analysis' in page.url
    expect(page.locator('#stage-analysis')).to_have_attribute('aria-pressed', 'true')
    page.locator('#prompt').fill('Texto largo de QA. ' * 1500)
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    passed('Etapa enlazable, texto largo sin desbordamiento horizontal')
    page.locator('#open-chatgpt-app').click()
    page.wait_for_load_state('load')
    assert page.url == 'https://chatgpt.com/c/sublivicky-prueba'
    passed('Botón móvil navega directamente; no afirma apertura nativa')
    return {'checks': checks, 'audits': audits}


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:8000/')
    parser.add_argument('--output', default='artifacts/qa/before')
    parser.add_argument('--axe')
    parser.add_argument('--full', action='store_true')
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        try:
            findings = []
            for name, width, height in [('desktop', 1366, 1000), ('mobile', 390, 844), ('narrow', 320, 740), ('landscape', 844, 390)]:
                context = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1, is_mobile=name != 'desktop', has_touch=name != 'desktop', permissions=['clipboard-read','clipboard-write'])
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(args.url)
                page.wait_for_load_state('networkidle')
                violations = []
                if args.axe:
                    violations = accessibility(page, args.axe)
                page.screenshot(path=str(output / f'{name}.png'), full_page=True)
                findings.append({'viewport': name, 'title': page.title(), 'errors': errors, 'accessibility': violations,
                    'horizontal_overflow': page.evaluate('document.documentElement.scrollWidth > innerWidth'),
                    'unlabelled_fields': page.locator('input:not([type=hidden]),select,textarea').evaluate_all('els => els.filter(el => !el.labels?.length && !el.getAttribute("aria-label")).map(el => el.id)'),
                    'small_fields': page.locator('input:not([type=checkbox]),select,textarea').evaluate_all('els => els.filter(el => el.checkVisibility() && parseFloat(getComputedStyle(el).fontSize) < 16).map(el => el.id)')})
                if args.full:
                    assert not violations, violations
                    assert not findings[-1]['horizontal_overflow'], name
                    assert not findings[-1]['unlabelled_fields'], name
                    assert not findings[-1]['small_fields'], name
                if args.full and name in ['desktop','mobile']:
                    case_dir = output / name
                    case_dir.mkdir(exist_ok=True)
                    findings[-1]['flow'] = exercise(page, context, case_dir, args.axe)
                    assert not errors, errors
                context.close()
            (output / 'inspection.json').write_text(json.dumps(findings, indent=2, ensure_ascii=False), encoding='utf-8')
            print(json.dumps([{'viewport': item['viewport'], 'checks':len(item.get('flow', {}).get('checks', [])), 'accessibility_violations':len(item['accessibility']), 'errors':item['errors'], 'horizontal_overflow':item['horizontal_overflow'], 'small_fields':item['small_fields']} for item in findings], ensure_ascii=False))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
