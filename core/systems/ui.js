/* Sistema · ui
   Entidade com Botao { acao:{ irPara:'cena', dados, evento:'nome' } } + Transform + Sprite vira botão clicável.
   Sprite.fixo:true = posição na janela (não anda com a câmera). Marca Botao.sobre para o desenho mudar de cor. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  // O ponteiro está sobre a entidade? Usa o Body (círculo/retângulo) ou, sem ele, o Sprite. Sprite.fixo usa a posição na janela.
  function sobre(e, p) {
    if (!e || !e.Transform || !p) return false;
    const S = e.Sprite, B = e.Body, fixo = S && S.fixo, px = fixo ? p.tx : p.x, py = fixo ? p.ty : p.y;
    if (typeof px !== 'number' || typeof py !== 'number') return false;
    let circ = false, r = 0, w = 0, h = 0;
    if (B) { if (B.forma === 'circulo' || (!B.forma && B.raio !== undefined)) { circ = true; r = B.raio; } else { w = B.w; h = B.h; } }
    else if (S) { if (S.forma === 'circulo' || (S.raio !== undefined && S.w === undefined)) { circ = true; r = S.raio ?? 16; } else { w = S.w ?? 32; h = S.h ?? 32; } }
    else return false;
    const dx = px - e.Transform.x, dy = py - e.Transform.y;
    return circ ? dx * dx + dy * dy <= r * r : Math.abs(dx) <= w / 2 && Math.abs(dy) <= h / 2;
  }
  C.Systems.ui = function (scene, dt, ctx) {
    const p = ctx.input.pointer;
    if (p.pressed) for (const e of scene.query('Script', 'Transform')) if (sobre(e, p)) ctx.events.emit('clique', { para: e.id });   // scripts: eventos.clique(e, d, ctx)
    for (const e of scene.query('Botao', 'Transform', 'Sprite')) {
      const B = e.Botao, S = e.Sprite, px = S.fixo ? p.tx : p.x, py = S.fixo ? p.ty : p.y;
      const w = S.w ?? 100, h = S.h ?? 40;
      B.sobre = px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 && Math.abs(py - e.Transform.y) <= h / 2;
      if (B.sobre && p.pressed && B.acao) {
        if (B.acao.irPara) ctx.engine.irPara(B.acao.irPara, B.acao.dados);
        if (B.acao.evento) ctx.events.emit(B.acao.evento, { para: e.id });
      }
    }
  };
  C.Systems.ui.sobre = sobre;
})(typeof window !== 'undefined' ? window : globalThis);
