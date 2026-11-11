/* Editor · câmera (T2): painel para editar scene.estado.camera sem alterar o core. */
(function (root) {
  const ed = root.editor, $ = id => document.getElementById(id);
  const num = id => { const v = Number($(id).value); return Number.isFinite(v) ? v : null; };
  const cena = () => ed.cena;
  function estado(criar = false) {
    if (criar && !cena().estado.camera) cena().estado.camera = { x: 400, y: 225, zoom: 1, suavizar: 8 };
    return cena().estado.camera;
  }
  function atualizar() {
    const c = estado(), box = $('camera'); if (!box) return;
    box.hidden = false;
    for (const id of ['cam-x', 'cam-y', 'cam-zoom', 'cam-suavizar', 'cam-x0', 'cam-y0', 'cam-x1', 'cam-y1']) $(id).value = c && c[id.slice(4)] !== undefined ? c[id.slice(4)] : '';
    const s = $('cam-seguir'); s.innerHTML = '<option value="">câmera fixa</option>';
    for (const e of cena().entities.values()) if (e.nome) { const o = document.createElement('option'); o.value = e.nome; o.textContent = e.nome; s.append(o); }
    s.value = c && c.seguir || '';
  }
  function aplicar() {
    const c = estado(true), valores = { x: num('cam-x'), y: num('cam-y'), zoom: num('cam-zoom'), suavizar: num('cam-suavizar') };
    if (Object.values(valores).some(v => v === null) || valores.zoom <= 0 || valores.suavizar < 0) return $('cam-msg').textContent = 'Use números válidos; zoom deve ser maior que zero.';
    Object.assign(c, valores); c.seguir = $('cam-seguir').value;
    const limites = { x0: num('cam-x0'), y0: num('cam-y0'), x1: num('cam-x1'), y1: num('cam-y1') };
    if (Object.values(limites).every(v => v !== null)) c.limites = limites; else delete c.limites;
    $('cam-msg').textContent = 'Câmera atualizada.'; ed.redesenhar(); ed.json(); atualizar();
  }
  function limpar() { delete cena().estado.camera; $('cam-msg').textContent = 'Câmera fixa restaurada.'; ed.redesenhar(); ed.json(); atualizar(); }
  for (const id of ['cam-aplicar', 'cam-limpar']) $(id).addEventListener('click', id === 'cam-aplicar' ? aplicar : limpar);
  atualizar(); root.EditorCamera = { atualizar, aplicar };
})(window);
