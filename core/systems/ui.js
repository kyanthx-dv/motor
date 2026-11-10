/* Sistema · ui
   Entidade com Botao { acao:{ irPara:'cena', dados, evento:'nome' } } + Transform + Sprite vira botão clicável.
   Sprite.fixo:true = posição na janela (não anda com a câmera). Marca Botao.sobre para o desenho mudar de cor. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  C.Systems.ui = function (scene, dt, ctx) {
    const p = ctx.input.pointer;
    if (p.pressed) {   // o clique vai só para o objeto do topo (maior camada; empate: o criado por último). Scripts: eventos.clique(e, d, ctx)
      let topo = null;
      for (const e of scene.query('Script', 'Transform')) if (C.sobre(e, p) && (!topo || ((e.Sprite && e.Sprite.camada) || 0) >= ((topo.Sprite && topo.Sprite.camada) || 0))) topo = e;
      if (topo) ctx.events.emit('clique', { para: topo.id });
    }
    for (const e of scene.query('Botao', 'Transform', 'Sprite')) {
      const B = e.Botao, S = e.Sprite, px = S.fixo ? p.tx : p.x, py = S.fixo ? p.ty : p.y;
      const w = S.w ?? 100, h = S.h ?? 40;
      B.sobre = p.ativo !== false && px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 && Math.abs(py - e.Transform.y) <= h / 2;
      if (B.sobre && p.pressed && B.acao) {
        if (B.acao.irPara) ctx.engine.irPara(B.acao.irPara, B.acao.dados);
        if (B.acao.evento) ctx.events.emit(B.acao.evento, { para: e.id });
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
