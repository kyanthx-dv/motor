/* Sistema · ui
   Entidade com Botao { acao:{ irPara:'cena', dados, evento:'nome' } } + Transform + Sprite vira botão clicável.
   Sprite.fixo:true = posição na janela (não anda com a câmera). Marca Botao.sobre para o desenho mudar de cor. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  // Campo sob o ponteiro p (x,y mundo; tx,ty janela): { id, valor, max, senha } do de maior camada, ou null. Usado pelo adaptador de entrada (thread principal)
  C.campoEm = function (scene, p) {
    let topo = null;
    for (const e of scene.query('Campo', 'Transform', 'Sprite')) {
      const K = e.Campo, S = e.Sprite; if (K.desativado) continue; const w = S.w ?? 200, h = S.h ?? 36, px = S.fixo ? p.tx : p.x, py = S.fixo ? p.ty : p.y;
      if (px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 && Math.abs(py - e.Transform.y) <= h / 2 && (!topo || (S.camada || 0) >= (topo.e.Sprite.camada || 0))) topo = { e };
    }
    return topo ? { id: topo.e.id, valor: topo.e.Campo._v || '', max: topo.e.Campo.max || 0, senha: !!topo.e.Campo.senha } : null;
  };
  C.Systems.ui = function (scene, dt, ctx) {
    const p = ctx.input.pointer, ptrs = ctx.input.pointers && ctx.input.pointers.length ? ctx.input.pointers : [p];   // multitoque: todos os dedos; sem dedos (mouse passando) usa o ponteiro principal
    for (const q of ptrs) if (q.pressed) {   // o clique vai só para o objeto do topo (maior camada; empate: o criado por último). Scripts: eventos.clique(e, d, ctx)
      let topo = null;
      for (const e of scene.query('Script', 'Transform')) if (C.sobre(e, q) && (!topo || ((e.Sprite && e.Sprite.camada) || 0) >= ((topo.Sprite && topo.Sprite.camada) || 0))) topo = e;
      if (topo) ctx.events.emit('clique', { para: topo.id });
    }
    // Qualquer dedo dentro da área (x,y do centro; w,h; fixo = coordenada da janela): { sobre, apertado, clique }
    const toqueEm = (e, S, w, h) => {
      const r = { sobre: false, apertado: false, clique: false };
      for (const q of ptrs) { const px = S.fixo ? q.tx : q.x, py = S.fixo ? q.ty : q.y; if (q.ativo !== false && px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 && Math.abs(py - e.Transform.y) <= h / 2) { r.sobre = true; if (q.down) r.apertado = true; if (q.pressed) r.clique = true; } }
      return r;
    };
    for (const e of scene.query('Botao', 'Transform', 'Sprite')) {
      const B = e.Botao, S = e.Sprite;
      if (B.desativado) { B.sobre = false; B.apertado = false; continue; }   // botão desativado: sem hover nem clique
      const t = toqueEm(e, S, S.w ?? 100, S.h ?? 40);
      B.sobre = t.sobre;
      B.apertado = t.apertado;   // segurando o botão do mouse/dedo em cima: desenho usa corApertado (vários botões podem estar apertados ao mesmo tempo)
      if (t.clique && B.acao) {
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
      if (!A.desativado && toqueEm(e, S, S.w ?? 100, S.h ?? 40).clique) { gravaV(A.var, !lerV(A.var, false)); ctx.events.emit('alternou', { para: e.id, valor: !!lerV(A.var, false) }); }
      const on = !!lerV(A.var, false); S.rotulo = on ? (A.textoLigado || 'Ligado') : (A.textoDesligado || 'Desligado'); S.cor = on ? (A.corLigado || '#16a34a') : (A.corDesligado || '#64748b');
    }
    // Campo { var, dica, max, senha }: toque abre o teclado; o texto digitado vai para a variável (texto). Enter dispara o evento 'campo-enviado'
    const tx = ctx.input.texto || {};
    for (const e of scene.query('Campo', 'Transform', 'Sprite')) {
      const K = e.Campo, S = e.Sprite; if (typeof K.var !== 'string') continue; K._n = (K._n || 0) + 1;
      const foc = !!(tx.foco && tx.id === e.id), lim = K.max > 0 ? K.max : 200;
      if (foc && typeof tx.valor === 'string' && tx.valor !== K._ult) { K._ult = tx.valor; gravaV(K.var, tx.valor.slice(0, lim)); ctx.events.emit('campo-mudou', { para: e.id, valor: tx.valor.slice(0, lim) }); }
      if (!foc) K._ult = undefined;
      if (typeof tx.envios === 'number') { if (K._env === undefined) K._env = tx.envios; if (tx.envios !== K._env) { if (K._foi) ctx.events.emit('campo-enviado', { para: e.id, valor: String(lerV(K.var, '')) }); K._env = tx.envios; } }
      K._foi = foc;
      const v = String(lerV(K.var, '')); K._v = v; K._f = foc; const cur = foc && ((K._n >> 4) & 1) ? '|' : '';
      S.rotulo = v ? (K.senha ? '•'.repeat(v.length) : v) + cur : (foc ? '|' : (K.dica || ''));
    }
    // Lista { lista, var, itemAltura, corSel }: mostra os itens de uma lista do jogo, arrasta para rolar, toque escolhe (grava o índice em var e emite 'lista-escolheu')
    const LI = ctx.engine && ctx.engine.listas;
    for (const e of scene.query('Lista', 'Transform', 'Sprite')) {
      const L = e.Lista, S = e.Sprite; if (typeof L.lista !== 'string' || !LI) continue;
      const itens = LI.todos(L.lista), ih = L.itemAltura > 4 ? L.itemAltura : 28, w = S.w ?? 200, h = S.h ?? 150, px = S.fixo ? p.tx : p.x, py = S.fixo ? p.ty : p.y, max = Math.max(0, itens.length * ih - h);
      const dentro = p.ativo !== false && px !== undefined && Math.abs(px - e.Transform.x) <= w / 2 && Math.abs(py - e.Transform.y) <= h / 2;
      if (!L.desativado) {
        if (p.pressed && dentro) L._a = { y0: py, s0: L._s || 0, mov: false };
        if (L._a && p.down && py !== undefined) { const dy = py - L._a.y0; if (Math.abs(dy) > 6) L._a.mov = true; if (L._a.mov) L._s = Math.max(0, Math.min(max, L._a.s0 - dy)); }
        if (L._a && !p.down) {
          if (!L._a.mov) { const i = Math.floor((L._a.y0 - (e.Transform.y - h / 2) + L._a.s0) / ih); if (i >= 0 && i < itens.length) { L._sel = i; if (L.var) gravaV(L.var, i); ctx.events.emit('lista-escolheu', { para: e.id, indice: i, valor: itens[i] }); } }
          L._a = null;
        }
      }
      L._s = Math.max(0, Math.min(max, L._s || 0)); const sel = L.var && ctx.vars.existe(L.var) ? Number(ctx.vars.ler(L.var)) : (L._sel === undefined ? -1 : L._sel);
      const a = Math.floor(L._s / ih), n = Math.ceil(h / ih) + 1; L._p = a; L._off = a * ih - L._s; L._vis = itens.slice(a, a + n).map(String); L._sel = sel; L._tot = itens.length; L._max = max;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
