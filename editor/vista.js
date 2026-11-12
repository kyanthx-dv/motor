/* Editor · vista: grade com números, tamanho da cena e pan/zoom. Só vale com o motor parado; no Play some tudo. */
(function (root) {
  const ed = root.editor, r = ed.renderer, cena = ed.cena, $ = id => document.getElementById(id), tela = $('tela');
  const KEY = 'motor.editor.vista.v1';
  let suspensa = false, salva = null, pan = null, espaco = false;
  r.grade = (() => { try { return localStorage.getItem(KEY) !== 'sem-grade'; } catch (e) { return true; } })();
  $('v-grade').checked = r.grade;
  const fit = () => { r.ajustarVista(); ed.redesenhar(); };
  r.ajustarVista(); fit();
  new ResizeObserver(() => { if (r.vista && !r._vistaMexida) r.ajustarVista(); ed.redesenhar(); }).observe(tela);
  $('v-grade').addEventListener('change', () => { r.grade = $('v-grade').checked; try { localStorage.setItem(KEY, r.grade ? 'grade' : 'sem-grade'); } catch (e) {} ed.redesenhar(); });
  $('v-ajustar').addEventListener('click', () => { r._vistaMexida = false; fit(); });
  function tamanho() {
    const w = Number($('v-w').value), h = Number($('v-h').value);
    if (!(w >= 100 && w <= 10000 && h >= 100 && h <= 10000)) return;
    cena.estado.tamanho = { largura: Math.round(w), altura: Math.round(h) }; ed.json(); r._vistaMexida = false; ed.redesenhar();
  }
  $('v-w').addEventListener('change', tamanho); $('v-h').addEventListener('change', tamanho);
  (function sincronizar() {   // reflete a cena atual (abrir projeto, desfazer, JSON) nos campos
    const t = cena.estado.tamanho || { largura: 800, altura: 450 };
    for (const [id, v] of [['v-w', t.largura], ['v-h', t.altura]]) if (document.activeElement !== $(id) && $(id).value !== String(v)) $(id).value = v;
    requestAnimationFrame(sincronizar);
  })();
  tela.addEventListener('wheel', ev => {
    if (!r.vista) return; ev.preventDefault();
    const b = tela.getBoundingClientRect(), px = ev.clientX - b.left, py = ev.clientY - b.top, w = r.telaParaMundo(px, py);
    const z = Math.max(0.05, Math.min(16, r.vista.z * (ev.deltaY < 0 ? 1.12 : 1 / 1.12)));
    r.vista.z = z; r.vista.cx = (b.width / 2 - px + w.x * z) / z; r.vista.cy = (b.height / 2 - py + w.y * z) / z; r._vistaMexida = true; ed.redesenhar();
  }, { passive: false });
  document.addEventListener('keydown', ev => { if (ev.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) espaco = true; });
  document.addEventListener('keyup', ev => { if (ev.code === 'Space') espaco = false; });
  tela.addEventListener('pointerdown', ev => {   // bolha: o editor já capturou o ponteiro se clicou num objeto
    if (!r.vista || ed.engine.rodando) return;
    if (ev.button === 1 || espaco || !tela.hasPointerCapture(ev.pointerId)) { pan = { x: ev.clientX, y: ev.clientY, cx: r.vista.cx, cy: r.vista.cy, mexeu: false }; tela.setPointerCapture(ev.pointerId); }
  });
  tela.addEventListener('pointermove', ev => {
    if (!pan || !r.vista) return; const dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
    if (!pan.mexeu && Math.abs(dx) + Math.abs(dy) < 4) return; pan.mexeu = true;
    r.vista.cx = pan.cx - dx / r.vista.z; r.vista.cy = pan.cy - dy / r.vista.z; r._vistaMexida = true; tela.style.cursor = 'grabbing'; ed.redesenhar();
  });
  const fim = () => { pan = null; tela.style.cursor = ''; };
  tela.addEventListener('pointerup', fim); tela.addEventListener('pointercancel', fim);
  root.EditorVista = { fit, suspender(on) { if (on) { salva = r.vista || salva; r.vista = null; suspensa = true; } else { r.vista = salva || null; suspensa = false; } ed.redesenhar(); } };
})(window);
