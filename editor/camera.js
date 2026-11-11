/* Editor · câmera (T2): painel para editar scene.estado.camera sem alterar o core. */
(function (root) {
  const ed = root.editor, $ = id => document.getElementById(id);
  const num = id => { const t = $(id).value.trim(); if (t === '') return null; const v = Number(t); return Number.isFinite(v) ? v : null; };   // vazio não é zero
  const cena = () => ed.cena;
  function estado(criar = false) {
    if (criar && !cena().estado.camera) cena().estado.camera = { x: 400, y: 225, zoom: 1, suavizar: 8 };
    return cena().estado.camera;
  }
  function atualizar() {
    const c = estado(), box = $('camera'); if (!box) return;
    box.hidden = false;
    const padrao = { x: 400, y: 225, zoom: 1, suavizar: 8 };   // sem câmera, o painel mostra os valores iniciais para você só clicar Aplicar
    for (const id of ['cam-x', 'cam-y', 'cam-zoom', 'cam-suavizar']) { const k = id.slice(4); $(id).value = c && c[k] !== undefined ? c[k] : padrao[k]; }
    for (const id of ['cam-x0', 'cam-y0', 'cam-x1', 'cam-y1']) $(id).value = c && c.limites ? c.limites[id.slice(4)] : '';
    const s = $('cam-seguir'); s.innerHTML = '<option value="">câmera fixa</option>';
    for (const e of cena().entities.values()) if (e.nome) { const o = document.createElement('option'); o.value = e.nome; o.textContent = e.nome; s.append(o); }
    s.value = c && c.seguir || '';
  }
  function aplicar() {
    const valores = { x: num('cam-x'), y: num('cam-y'), zoom: num('cam-zoom'), suavizar: num('cam-suavizar') };
    if (Object.values(valores).some(v => v === null) || valores.zoom <= 0 || valores.suavizar < 0) return $('cam-msg').textContent = 'Use números válidos; zoom deve ser maior que zero.';
    const c = estado(true); Object.assign(c, valores); c.seguir = $('cam-seguir').value;
    const limites = { x0: num('cam-x0'), y0: num('cam-y0'), x1: num('cam-x1'), y1: num('cam-y1') };
    if (Object.values(limites).every(v => v !== null) && limites.x1 > limites.x0 && limites.y1 > limites.y0) c.limites = limites; else delete c.limites;   // limites só valem com os 4 números e x1>x0, y1>y0
    $('cam-msg').textContent = 'Câmera atualizada.'; ed.redesenhar(); ed.json(); atualizar();
  }
  function limpar() { delete cena().estado.camera; $('cam-msg').textContent = 'Câmera fixa restaurada.'; ed.redesenhar(); ed.json(); atualizar(); }
  for (const id of ['cam-aplicar', 'cam-limpar']) $(id).addEventListener('click', id === 'cam-aplicar' ? aplicar : limpar);
  atualizar(); root.EditorCamera = { atualizar, aplicar };
})(window);
