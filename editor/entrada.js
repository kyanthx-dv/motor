/* Editor · entrada: configurar o joystick virtual do jogo (estado.joystick): modo (flutuante, fixo, desligado), visível, posição do fixo, raio.
   Os dados chegam aos scripts em ctx.input.joystick {ativo, dx, dy, forca, angulo, modo}. */
(function (root) {
  const ed = root.editor, cena = ed.cena, barra = document.querySelector('.vista-barra'); if (!barra) return;
  const el = (tag, props, ...filhos) => { const e = document.createElement(tag); Object.assign(e, props); e.append(...filhos); return e; };
  const modo = el('select', { id: 'j-modo', title: 'Joystick virtual (toque)', ariaLabel: 'Joystick virtual' }, ...[['flutuante', 'joystick: flutuante'], ['fixo', 'joystick: fixo'], ['desligado', 'joystick: desligado']].map(([v, t]) => el('option', { value: v, textContent: t })));
  const vis = el('input', { type: 'checkbox', id: 'j-vis', checked: true }), visL = el('label', {}, vis, ' visível');
  const num = (id, titulo, min, max, passo) => el('input', { type: 'number', id, min, max, step: passo, title: titulo, ariaLabel: titulo, style: 'width:64px' });
  const fx = num('j-x', 'Posição X do joystick fixo (% da tela)', 0, 100, 1), fy = num('j-y', 'Posição Y do joystick fixo (% da tela)', 0, 100, 1), raio = num('j-raio', 'Raio do joystick (px)', 20, 200, 2);
  const pos = el('span', { id: 'j-pos' }, ' x ', fx, '% y ', fy, '% '), raioL = el('label', {}, ' raio ', raio);
  barra.append(modo, visL, pos, raioL);
  const ler = () => cena.estado.joystick || {}; let ultimo = '';
  function gravar() {
    const c = { modo: modo.value, visivel: vis.checked, x: Math.max(0, Math.min(1, (+fx.value || 0) / 100)), y: Math.max(0, Math.min(1, (+fy.value || 0) / 100)), raio: Math.max(20, Math.min(200, +raio.value || 56)) };
    if (c.modo === 'flutuante' && c.visivel && c.raio === 56) delete cena.estado.joystick; else cena.estado.joystick = c; ed.json();
  }
  for (const e of [modo, vis, fx, fy, raio]) e.addEventListener('change', gravar);
  (function sincronizar() {
    const c = ler(), chave = JSON.stringify(c);
    if (chave !== ultimo) { ultimo = chave; modo.value = c.modo || 'flutuante'; vis.checked = c.visivel !== false; fx.value = Math.round((c.x ?? 0.14) * 100); fy.value = Math.round((c.y ?? 0.78) * 100); raio.value = c.raio ?? 56; }
    pos.style.display = modo.value === 'fixo' ? '' : 'none'; visL.style.display = raioL.style.display = modo.value === 'desligado' ? 'none' : '';
    requestAnimationFrame(sincronizar);
  })();
})(window);
