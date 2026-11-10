/* Editor · interface dos blocos. Lista indentada com arraste por Pointer Events: funciona igual com mouse e dedo.
   Cada linha é um bloco com campos; botões ↑ ↓ ✕; menu "+ bloco" no fim de cada pilha. Só edita DADOS (script.blocos). */
(function () {
  const B = EditorBlocos, el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  function sel(ops, atual, aoMudar, rotulo) {
    const s = el('select'); s.setAttribute('aria-label', rotulo || 'opção');
    for (const o of ops) { const [v, t] = Array.isArray(o) ? o : [o, o]; const x = el('option', null, t); x.value = v; s.append(x); }
    s.value = atual; s.addEventListener('change', () => aoMudar(s.value)); return s;
  }
  function entrada(tipo, v, aoMudar, rotulo) { const i = el('input'); i.type = tipo; i.value = v; i.setAttribute('aria-label', rotulo); i.addEventListener('change', () => aoMudar(i.value)); return i; }

  B.montar = function (cont, script, opc) {
    const vars = () => opc.vars(), mudou = () => opc.aoMudar(), redesenhar = () => { render(); mudou(); };
    let arrastando = null, indicador = null;
    const interativo = t => t.closest && t.closest('input,select,textarea,button');
    function limparArraste() {
      if (!arrastando) return;
      arrastando.linha.style.opacity = '';
      arrastando.linha.style.cursor = '';
      window.removeEventListener('pointermove', moverArraste, true);
      window.removeEventListener('pointerup', terminarArraste, true);
      window.removeEventListener('pointercancel', cancelarArraste, true);
      window.removeEventListener('keydown', teclaArraste, true);
      if (indicador) { indicador.remove(); indicador = null; }
      arrastando = null;
    }
    function cancelarArraste() { limparArraste(); }
    function teclaArraste(ev) { if (ev.key === 'Escape') { ev.preventDefault(); cancelarArraste(); } }
    function mostrarIndicador(alvo) {
      if (!indicador) { indicador = el('div', 'drop-indicador'); indicador.style.cssText = 'position:fixed;height:3px;background:var(--acento);border-radius:3px;z-index:1000;pointer-events:none;box-shadow:0 0 0 1px color-mix(in srgb, var(--acento) 35%, transparent)'; document.body.append(indicador); }
      const r = alvo.rect; indicador.style.left = r.left + 'px'; indicador.style.top = Math.max(0, r.top - 1) + 'px'; indicador.style.width = Math.max(12, r.width) + 'px'; indicador.hidden = false;
    }
    function alvoDoPonteiro(ev) { const r = alvoBruto(ev); return r && ((r.arr === script.blocos) === !!B.HATS[arrastando.bloco.t]) ? r : null; }
    function alvoBruto(ev) {
      const sob = document.elementFromPoint(ev.clientX, ev.clientY); if (!sob) return null;
      const bloco = sob.closest && sob.closest('.bloco');
      if (bloco && bloco === arrastando.linha) return null;
      const ehHat = !!B.HATS[arrastando.bloco.t];   // eventos só no topo; os demais blocos só dentro de eventos (alvoDoPonteiro valida)
      if (bloco) {
        const pilhaAlvo = bloco.parentElement, b = bloco.__bloco, arr = pilhaAlvo && pilhaAlvo.__arr;
        if (!arr || !b) return null;
        if (B.HATS[b.t] && !ehHat) { const pf = bloco.querySelector('.pilha'), r = (pf || bloco).getBoundingClientRect(); return pf && pf.__arr ? { arr: pf.__arr, index: 0, pilha: pf, rect: { left: r.left, top: r.top, width: r.width } } : null; }
        const r = bloco.getBoundingClientRect(), antes = ev.clientY < r.top + r.height / 2;
        return { arr, index: arr.indexOf(b) + (antes ? 0 : 1), pilha: pilhaAlvo, rect: { left: r.left, top: antes ? r.top : r.bottom, width: r.width } };
      }
      const rot = sob.closest && sob.closest('.rot');
      if (rot) {
        const pilhaAlvo = rot.nextElementSibling && rot.nextElementSibling.classList.contains('pilha') ? rot.nextElementSibling : null;
        if (pilhaAlvo && pilhaAlvo.__arr) { const r = pilhaAlvo.getBoundingClientRect(); return { arr: pilhaAlvo.__arr, index: pilhaAlvo.__arr.length, pilha: pilhaAlvo, rect: { left: r.left, top: r.bottom, width: r.width } }; }
      }
      const pilhaAlvo = sob.closest && sob.closest('.pilha');
      if (pilhaAlvo && pilhaAlvo.__arr) { const r = pilhaAlvo.getBoundingClientRect(); return { arr: pilhaAlvo.__arr, index: pilhaAlvo.__arr.length, pilha: pilhaAlvo, rect: { left: r.left, top: r.bottom, width: r.width } }; }
      return null;
    }
    function moverArraste(ev) {
      if (!arrastando || ev.pointerId !== arrastando.pointerId) return;
      ev.preventDefault(); const alvo = alvoDoPonteiro(ev);
      if (!alvo || arrastando.linha.contains(alvo.pilha)) { if (indicador) indicador.hidden = true; arrastando.alvo = null; return; }
      arrastando.alvo = alvo; mostrarIndicador(alvo);
    }
    function terminarArraste(ev) {
      if (!arrastando || ev.pointerId !== arrastando.pointerId) return;
      const alvo = arrastando.alvo;
      if (alvo && !arrastando.linha.contains(alvo.pilha)) {
        const origem = arrastando.arr, i = origem.indexOf(arrastando.bloco);
        if (i >= 0) { origem.splice(i, 1); let n = alvo.index; if (alvo.arr === origem && n > i) n--; alvo.arr.splice(Math.max(0, Math.min(n, alvo.arr.length)), 0, arrastando.bloco); limparArraste(); render(); mudou(); return; }
      }
      limparArraste();
    }
    function iniciarArraste(ev, linha, arr, b, i) {
      if (arrastando || (ev.button !== undefined && ev.button !== 0) || interativo(ev.target) || ev.currentTarget !== ev.target.closest('.bloco')) return;
      ev.preventDefault(); ev.stopPropagation(); linha.setPointerCapture?.(ev.pointerId); linha.style.opacity = '.45'; linha.style.cursor = 'grabbing';
      arrastando = { linha, arr, bloco: b, index: i, pointerId: ev.pointerId, alvo: null };
      window.addEventListener('pointermove', moverArraste, true); window.addEventListener('pointerup', terminarArraste, true); window.addEventListener('pointercancel', cancelarArraste, true); window.addEventListener('keydown', teclaArraste, true);
    }
    function campoValor(obj, nome, rotulo) {
      const v = obj[nome] || (obj[nome] = { k: 'num', v: 0 }), w = el('span', 'val');
      w.append(sel(Object.entries(B.VALORES), v.k, k => { obj[nome] = k === 'var' ? { k, n: vars()[0] || '' } : k === 'rand' ? { k, min: 0, max: 100 } : k === 'num' ? { k, v: 0 } : k === 'txt' ? { k, v: '' } : k === 'attr' ? { k, o: 'proprio', a: 'x' } : k === 'op' ? { k, a: { k: 'num', v: 0 }, o: '+', b: { k: 'num', v: 1 } } : k === 'contar' ? { k, tag: 'inimigo' } : { k }; redesenhar(); }, rotulo));
      if (v.k === 'num') w.append(entrada('number', v.v, x => { v.v = x === '' ? 0 : +x; mudou(); }, rotulo + ' (número)'));
      if (v.k === 'txt') w.append(entrada('text', v.v, x => { v.v = x; mudou(); }, rotulo + ' (texto)'));
      if (v.k === 'var') w.append(campoVar(v, 'n'));
      if (v.k === 'attr') w.append(campoObj(v, 'o'), campoAttr(v, 'a'));
      if (v.k === 'contar') w.append(entrada('text', v.tag || '', x => { v.tag = x; mudou(); }, 'etiqueta'));
      if (v.k === 'op') w.append(el('span', null, '('), campoValor(v, 'a', 'A'), sel(B.CONTAS, v.o, x => { v.o = x; mudou(); }, 'conta'), campoValor(v, 'b', 'B'), el('span', null, ')'));
      if (v.k === 'rand') w.append(entrada('number', v.min, x => { v.min = +x; mudou(); }, rotulo + ' mínimo'), el('span', null, 'e'), entrada('number', v.max, x => { v.max = +x; mudou(); }, rotulo + ' máximo'));
      return w;
    }
    function campoObj(h, n) {
      const nomes = opc.objetos ? opc.objetos() : [], ops = [['proprio', 'este objeto'], ['outro', 'o outro objeto'], ['cada', 'cada objeto (dentro de "para cada")'], ...(opc.etiquetas ? opc.etiquetas() : []).map(t => ['p:' + t, 'o mais próximo com etiqueta ' + t]), ...nomes.map(x => ['n:' + x, x])];
      if (!ops.some(o => o[0] === h[n])) ops.push([h[n], (h[n] || '').replace(/^n:/, '') + ' (não existe)']);
      return sel(ops, h[n] === undefined ? 'proprio' : h[n], x => { h[n] = x; mudou(); }, 'objeto');
    }
    function campoAttr(h, n) {
      const ex = opc.atributos ? opc.atributos() : [], ops = [...B.ATTR_NOMES, ...ex.map(a => ['a:' + a, a + ' (do objeto)']), ['__novo', '+ novo atributo…']];
      if (!ops.some(o => o[0] === h[n])) ops.push([h[n], String(h[n]).replace(/^a:/, '')]);
      return sel(ops, h[n], x => {
        if (x !== '__novo') { h[n] = x; mudou(); return; }
        const nome = (window.prompt('Nome do novo atributo (letras, números e _):') || '').trim();
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(nome)) h[n] = 'a:' + nome;
        redesenhar();
      }, 'atributo');
    }
    function campoVar(obj, nome) {
      const nomes = vars(); if (!nomes.length) { const s = el('em', 'aviso-mini', '(crie uma variável antes)'); return s; }
      if (!nomes.includes(obj[nome])) { obj[nome] = nomes[0]; }
      return sel(nomes, obj[nome], x => { obj[nome] = x; mudou(); }, 'variável');
    }
    function campoCond(h, n) {
      const c = h[n], w = el('span', 'val'), cmp0 = () => ({ k: 'cmp', a: { k: 'x' }, op: '>', b: { k: 'num', v: 0 } });
      w.append(sel(B.LOGICOS, c.k, k => { h[n] = k === 'tecla' ? { k, acao: 'acao', modo: 'down' } : k === 'e' || k === 'ou' ? { k, a: cmp0(), b: cmp0() } : k === 'nao' ? { k, a: cmp0() } : k === 'etiq' ? { k, o: 'proprio', tag: 'inimigo' } : k === 'mouse' ? { k, modo: 'pressed' } : k === 'sobre' ? { k, o: 'proprio' } : cmp0(); redesenhar(); }, 'tipo de condição'));
      if (c.k === 'e' || c.k === 'ou') w.append(el('span', null, '('), campoCond(c, 'a'), el('span', null, c.k === 'e' ? 'E' : 'OU'), campoCond(c, 'b'), el('span', null, ')'));
      if (c.k === 'mouse') w.append(sel([['pressed', 'clicou agora'], ['down', 'está apertado']], c.modo || 'pressed', x => { c.modo = x; mudou(); }, 'modo do mouse'));
      if (c.k === 'sobre') w.append(el('span', null, 'está sobre'), campoObj(c, 'o'));
      if (c.k === 'etiq') w.append(campoObj(c, 'o'), el('span', null, 'tem a etiqueta'), entrada('text', c.tag || '', x => { c.tag = x; mudou(); }, 'etiqueta'));
      if (c.k === 'nao') w.append(el('span', null, '('), campoCond(c, 'a'), el('span', null, ')'));
      if (c.k === 'tecla') {
        w.append(sel([['acao', 'direção/ação'], ['livre', 'qualquer tecla']], c.tecla !== undefined ? 'livre' : 'acao', t => { if (t === 'livre') { delete c.acao; c.tecla = 'z'; } else { delete c.tecla; c.acao = 'acao'; } redesenhar(); }, 'tipo de tecla'));
        if (c.tecla !== undefined) {
          const bt = el('button', 'tecla', 'Tecla: ' + B.nomeTecla(c.tecla)); bt.type = 'button'; bt.title = 'Clique e aperte a tecla desejada';
          bt.addEventListener('click', () => {
            bt.textContent = 'aperte uma tecla…';
            const ouvir = ev => { ev.preventDefault(); ev.stopPropagation(); window.removeEventListener('keydown', ouvir, true); if (ev.key !== 'Escape') c.tecla = ev.key.toLowerCase(); redesenhar(); };
            window.addEventListener('keydown', ouvir, true);
          }); w.append(bt);
        } else w.append(sel(B.ACOES, c.acao, x => { c.acao = x; mudou(); }, 'tecla'));
        w.append(sel([['down', 'segurada'], ['pressed', 'apertada agora']], c.modo || 'down', x => { c.modo = x; mudou(); }, 'modo'));
      }
      else if (c.k === 'cmp') { w.append(campoValor(c, 'a', 'valor A'), sel(B.OPS, c.op, x => { c.op = x; mudou(); }, 'comparação'), campoValor(c, 'b', 'valor B')); }
      return w;
    }
    function menu(arr, hat) {
      const s = el('select', 'add'), o0 = el('option', null, hat ? '+ evento…' : '+ bloco…'); o0.value = ''; s.append(o0); s.setAttribute('aria-label', hat ? 'Adicionar evento' : 'Adicionar bloco');
      if (hat) for (const [t, d] of Object.entries(B.HATS)) { const o = el('option', null, d.rotulo); o.value = t; s.append(o); }
      else { const grupos = {}; for (const [t, d] of Object.entries(B.BLOCOS)) { (grupos[d.cat] = grupos[d.cat] || []).push([t, d]); }
        for (const g in grupos) { const og = el('optgroup'); og.label = g; for (const [t, d] of grupos[g]) { const o = el('option', null, d.menu || d.campos.map(c => c.t || '…').join(' ').replace(/\s+/g, ' ')); o.value = t; og.append(o); } s.append(og); } }
      s.addEventListener('change', () => { if (s.value) { arr.push(B.novo(s.value)); redesenhar(); } }); return s;
    }
    function botoes(arr, i) {
      const w = el('span', 'bt');
      const mk = (txt, rot, fn, off) => { const b = el('button', null, txt); b.type = 'button'; b.title = rot; b.setAttribute('aria-label', rot); b.disabled = !!off; b.addEventListener('click', fn); return b; };
      w.append(mk('↑', 'Subir', () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; redesenhar(); }, i === 0), mk('↓', 'Descer', () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; redesenhar(); }, i === arr.length - 1), mk('✕', 'Remover bloco', () => { arr.splice(i, 1); redesenhar(); }));
      return w;
    }
    function pilha(arr, hat) {
      const p = el('div', 'pilha');
      p.__arr = arr;
      arr.forEach((b, i) => {
        const def = hat ? B.HATS[b.t] : B.BLOCOS[b.t];
        if (!def) { const w = el('div', 'bloco'); w.append(el('span', 'aviso-mini', 'bloco inválido (' + b.t + ') '), botoes(arr, i)); p.append(w); return; }
        const linha = el('div', hat ? 'bloco hat' : 'bloco cat-' + def.cat);
        linha.__arr = arr; linha.__bloco = b; linha.style.touchAction = 'none';
        const topo = el('div', 'topo');
        if (hat) topo.append(el('b', null, def.rotulo));
        else for (const c of def.campos) {
          if (c.t) topo.append(el('span', null, c.t));
          else if (c.tipo === 'valor') topo.append(campoValor(b, c.n, c.n));
          else if (c.tipo === 'var') topo.append(campoVar(b, c.n));
          else if (c.tipo === 'txt') topo.append(entrada('text', b[c.n] == null ? '' : b[c.n], x => { b[c.n] = x; mudou(); }, c.n));
          else if (c.tipo === 'script') { const nomes = opc.scripts ? opc.scripts() : [], s = sel([['', '(nenhum)'], ...nomes], b[c.n] || '', x => { b[c.n] = x; mudou(); }, 'script do objeto criado'), existe = !b[c.n] || nomes.includes(b[c.n]); s.style.borderColor = existe ? '' : 'red'; s.title = existe ? '' : 'script não existe'; topo.append(s); }
          else if (c.tipo === 'sel') topo.append(sel(c.ops, b[c.n], x => { b[c.n] = x; mudou(); }, c.n));
          else if (c.tipo === 'cond') topo.append(campoCond(b, 'c'));
          else if (c.tipo === 'obj') topo.append(campoObj(b, c.n));
          else if (c.tipo === 'attr') topo.append(campoAttr(b, c.n));
          else if (c.tipo === 'cena') { const cs = opc.cenas ? opc.cenas() : []; topo.append(cs.length ? sel([['', '(escolha)'], ...cs.map(x => [x, x])], b[c.n] || '', x => { b[c.n] = x; mudou(); }, 'cena') : entrada('text', b[c.n] || '', x => { b[c.n] = x; mudou(); }, 'nome da cena')); }
          else if (c.tipo === 'objn') { const ns = opc.objetos ? opc.objetos() : []; topo.append(sel([['', '(escolha)'], ...ns.map(x => [x, x])], b[c.n] || '', x => { b[c.n] = x; mudou(); }, 'objeto a copiar')); }
          else if (c.tipo === 'cor') topo.append(entrada('color', /^#[0-9a-f]{6}$/i.test(b.cor) ? b.cor : '#ff5555', x => { b.cor = x; mudou(); }, 'cor'));
        }
        topo.append(botoes(arr, i)); linha.append(topo); linha.addEventListener('pointerdown', ev => iniciarArraste(ev, linha, arr, b, i));
        if (hat) { linha.append(pilha(b.f, false), menu(b.f, false)); }
        else if (def.filhos) { const dois = def.filhos.length > 1; linha.append(el('div', 'rot', dois ? 'então' : 'faça'), pilha(b.f, false), menu(b.f, false)); if (dois) linha.append(el('div', 'rot', 'senão'), pilha(b.s, false), menu(b.s, false)); }
        p.append(linha);
      });
      return p;
    }
    function render() { cont.innerHTML = ''; cont.append(pilha(script.blocos, true), menu(script.blocos, true)); }
    render();
  };
})();
