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
      if (B.desativado) { B.sobre = false; B.apertado = false; continue; }   // botão desativado: sem hover nem clique
      const w = S.w ?? 100, h = S.h ?? 40;
      B.sobre = p.ativo !== false && px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 && Math.abs(py - e.Transform.y) <= h / 2;
      B.apertado = !!(B.sobre && p.down);   // segurando o botão do mouse/dedo em cima: desenho usa corApertado
      if (B.sobre && p.pressed && B.acao) {
        if (B.acao.irPara) ctx.engine.irPara(B.acao.irPara, B.acao.dados);
        if (B.acao.evento) ctx.events.emit(B.acao.evento, { para: e.id });
      }
    }
    // Barra { var, min=0, max (número ou nome de variável), cor, arrastavel }: enche conforme a variável; arrastável = slider (arrasta e grava na variável)
    // Alternar { var, textoLigado, textoDesligado, corLigado, corDesligado }: clique liga/desliga a variável (booleana) e troca rótulo e cor
    const lerV = (n, d) => (ctx.vars.existe(n) ? ctx.vars.ler(n) : d), gravaV = (n, v) => { if (ctx.vars.existe(n)) ctx.vars.definir(n, v); else ctx.vars.declarar(n, v); };
    for (const e of scene.query('Barra', 'Transform', 'Sprite')) {
      const B = e.Barra, S = e.Sprite; if (typeof B.var !== 'string') continue;
      const mn = Number.isFinite(B.min) ? B.min : 0, mx = typeof B.max === 'string' ? Number(lerV(B.max, 1)) : Number.isFinite(B.max) ? B.max : 1, span = (mx - mn) || 1, w = S.w ?? 100, h = S.h ?? 20;
      const px = S.fixo ? p.tx : p.x, py = S.fixo ? p.ty : p.y, dentro = p.ativo !== false && px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 + 6 && Math.abs(py - e.Transform.y) <= h / 2 + 10;
      if (B.arrastavel && !B.desativado) {
        if (p.pressed && dentro) B._arr = true; if (!p.down) B._arr = false;
        if (B._arr && px !== undefined) { const r = Math.max(0, Math.min(1, (px - (e.Transform.x - w / 2)) / w)); gravaV(B.var, mn + r * span); ctx.events.emit('barra-mudou', { para: e.id, valor: mn + r * span }); }
      }
      B._r = Math.max(0, Math.min(1, (Number(lerV(B.var, mn)) - mn) / span));
    }
    for (const e of scene.query('Alternar', 'Transform', 'Sprite')) {
      const A = e.Alternar, S = e.Sprite; if (typeof A.var !== 'string') continue;
      const w = S.w ?? 100, h = S.h ?? 40, px = S.fixo ? p.tx : p.x, py = S.fixo ? p.ty : p.y;
      if (!A.desativado && p.pressed && p.ativo !== false && px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 && Math.abs(py - e.Transform.y) <= h / 2) { gravaV(A.var, !lerV(A.var, false)); ctx.events.emit('alternou', { para: e.id, valor: !!lerV(A.var, false) }); }
      const on = !!lerV(A.var, false); S.rotulo = on ? (A.textoLigado || 'Ligado') : (A.textoDesligado || 'Desligado'); S.cor = on ? (A.corLigado || '#16a34a') : (A.corDesligado || '#64748b');
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
