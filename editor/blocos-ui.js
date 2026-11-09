/* Editor · interface dos blocos. Lista indentada (sem arrastar): funciona igual com mouse e dedo.
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
    function campoValor(obj, nome, rotulo) {
      const v = obj[nome] || (obj[nome] = { k: 'num', v: 0 }), w = el('span', 'val');
      w.append(sel(Object.entries(B.VALORES), v.k, k => { obj[nome] = k === 'var' ? { k, n: vars()[0] || '' } : k === 'rand' ? { k, min: 0, max: 100 } : k === 'num' ? { k, v: 0 } : k === 'txt' ? { k, v: '' } : { k }; redesenhar(); }, rotulo));
      if (v.k === 'num') w.append(entrada('number', v.v, x => { v.v = x === '' ? 0 : +x; mudou(); }, rotulo + ' (número)'));
      if (v.k === 'txt') w.append(entrada('text', v.v, x => { v.v = x; mudou(); }, rotulo + ' (texto)'));
      if (v.k === 'var') w.append(campoVar(v, 'n'));
      if (v.k === 'rand') w.append(entrada('number', v.min, x => { v.min = +x; mudou(); }, rotulo + ' mínimo'), el('span', null, 'e'), entrada('number', v.max, x => { v.max = +x; mudou(); }, rotulo + ' máximo'));
      return w;
    }
    function campoVar(obj, nome) {
      const nomes = vars(); if (!nomes.length) { const s = el('em', 'aviso-mini', '(crie uma variável antes)'); return s; }
      if (!nomes.includes(obj[nome])) { obj[nome] = nomes[0]; }
      return sel(nomes, obj[nome], x => { obj[nome] = x; mudou(); }, 'variável');
    }
    function campoCond(b) {
      const c = b.c, w = el('span', 'val');
      w.append(sel([['cmp', 'comparar'], ['tecla', 'tecla']], c.k, k => { b.c = k === 'tecla' ? { k, acao: 'acao', modo: 'down' } : { k: 'cmp', a: { k: 'x' }, op: '>', b: { k: 'num', v: 0 } }; redesenhar(); }, 'tipo de condição'));
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
      else { w.append(campoValor(c, 'a', 'valor A'), sel(B.OPS, c.op, x => { c.op = x; mudou(); }, 'comparação'), campoValor(c, 'b', 'valor B')); }
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
      arr.forEach((b, i) => {
        const def = hat ? B.HATS[b.t] : B.BLOCOS[b.t], linha = el('div', hat ? 'bloco hat' : 'bloco cat-' + def.cat);
        const topo = el('div', 'topo');
        if (hat) topo.append(el('b', null, def.rotulo));
        else for (const c of def.campos) {
          if (c.t) topo.append(el('span', null, c.t));
          else if (c.tipo === 'valor') topo.append(campoValor(b, c.n, c.n));
          else if (c.tipo === 'var') topo.append(campoVar(b, c.n));
          else if (c.tipo === 'txt') topo.append(entrada('text', b[c.n] == null ? '' : b[c.n], x => { b[c.n] = x; mudou(); }, c.n));
          else if (c.tipo === 'script') topo.append(sel([['', '(nenhum)'], ...(opc.scripts ? opc.scripts() : [])], b[c.n] || '', x => { b[c.n] = x; mudou(); }, 'script do objeto criado'));
          else if (c.tipo === 'sel') topo.append(sel(c.ops, b[c.n], x => { b[c.n] = x; mudou(); }, c.n));
          else if (c.tipo === 'cond') topo.append(campoCond(b));
          else if (c.tipo === 'cor') topo.append(entrada('color', /^#[0-9a-f]{6}$/i.test(b.cor) ? b.cor : '#ff5555', x => { b.cor = x; mudou(); }, 'cor'));
        }
        topo.append(botoes(arr, i)); linha.append(topo);
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
