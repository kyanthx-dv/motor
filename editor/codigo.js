/* Editor · código: melhora o <textarea id="sc-fonte"> sem biblioteca externa — números de linha, cores, Tab/Shift+Tab, auto-indent,
   fechamento de ( [ { " ', Ctrl+/ (comentar), autocompletar (ctx., e., dt…) e marcação da linha do erro.
   O textarea continua sendo a fonte da verdade (mesmo id/eventos); quem muda .value por código é detectado por observação. */
(function (root) {
  const ed = root.editor, ta = document.getElementById('sc-fonte'); if (!ta) return;
  const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
  // Cada item: 'nome' (propriedade) ou 'nome|(assinatura)' (função: ao aceitar vira nome() com o cursor dentro).
  const API = {
    ctx: ['vars', 'listas', 'input', 'scene', 'engine', 'dispositivo', 'audio', 'efeitos', 'caminho', 'events', 'tela', 'dt', 'matter', 'escrever|(texto)', 'sobre|(objeto, "tag")', 'depois|(segundos, fn)', 'tween|(objeto, "Comp.campo", alvo, seg)', 'salvarPartida|(nome)', 'carregarPartida|(nome)', 'existePartida|(nome)'],
    'ctx.vars': ['ler|("nome")', 'definir|("nome", valor)', 'somar|("nome", n)', 'existe|("nome")', 'declarar|("nome", valor)'],
    'ctx.listas': ['adicionar|("lista", valor)', 'remover|("lista", i)', 'item|("lista", i)', 'definir|("lista", i, valor)', 'tamanho|("lista")', 'contem|("lista", valor)', 'todos|("lista")', 'limpar|("lista")', 'aleatorio|("lista")'],
    'ctx.input': ['axes|()', 'pointer', 'joystick', 'tecla|("nome")', 'apertou|("acao")', 'soltou|("acao")'],
    'ctx.scene': ['create|({ nome, Transform })', 'find|("nome")', 'get|(id)', 'query|("Comp")', 'destroy|(id)', 'clonar|(objeto)', 'animar|(objeto, "clip")', 'adotar|(filho, pai)', 'soltar|(filho)', 'estado'],
    'ctx.engine': ['tempo', 'aleatorio|()', 'irPara|("cena")', 'reiniciar|()', 'observar|("nome", fn)'],
    'ctx.efeitos': ['tremer|(cena, forca, seg)', 'fade|(cena, ...)', 'particulas|(cena, x, y, {})'], 'ctx.dispositivo': ['vibrar|(ms)', 'telaCheia|(sim)', 'ler|("plataforma")'],
    'ctx.caminho': ['parar|(objeto)'], 'ctx.tela': ['largura', 'altura'], 'ctx.audio': ['tocar|("som")', 'efeito|("som")', 'parar|()', 'volume|(0-1)'],
    'ctx.events': ['on|("evento", fn)', 'emit|("evento", dados)'], 'ctx.matter': ['forca|(objeto, fx, fy)', 'velocidade|(objeto, vx, vy)', 'ler|(objeto)'],
    e: ['id', 'nome', 'Transform', 'Sprite', 'Body', 'Corpo', 'Junta', 'Animacao', 'Script', 'Etiquetas', 'Attr', 'Botao', 'Rota', 'Pai'], 'e.Transform': ['x', 'y', 'rot', 'escala'],
    'e.Sprite': ['cor', 'w', 'h', 'raio', 'rotulo', 'opacidade', 'imagem', 'invisivel', 'fixo', 'forma', 'grupo'], 'e.Body': ['vx', 'vy', 'w', 'h', 'raio', 'estatico', 'sensor', 'gravidade', 'elasticidade'], 'e.Animacao': ['atual', 'quadro', 'terminou'],
    Math: ['abs|(x)', 'floor|(x)', 'ceil|(x)', 'round|(x)', 'min|(a, b)', 'max|(a, b)', 'sqrt|(x)', 'sin|(x)', 'cos|(x)', 'atan2|(y, x)', 'hypot|(a, b)', 'random|()', 'PI']
  };
  const SNIP = [
    ['iniciar', '(e, ctx) { }', 'function iniciar(e, ctx) {\n  |\n}'], ['atualizar', '(e, dt, ctx) { }', 'function atualizar(e, dt, ctx) {\n  |\n}'],
    ['eventos', '= { colisao, gatilho, clique }', 'var eventos = {\n  colisao: function (e, d, ctx) {\n    |\n  }\n};'], ['se', 'if (…) { }', 'if (|) {\n  \n}'], ['senao', 'else { }', 'else {\n  |\n}'],
    ['para', 'for (…) { }', 'for (var i = 0; i < |; i++) {\n  \n}'], ['enquanto', 'while (…) { }', 'while (|) {\n  \n}'], ['funcao', 'function nome() { }', 'function |() {\n  \n}']
  ];
  const GLOBAIS = ['ctx', 'e', 'dt', 'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'Math', 'Object', 'Array', 'JSON', 'Number', 'String'];
  const EVENTOS = ['colisao', 'gatilho', 'clique', 'dano', 'curar', 'morreu', 'dialogo-abrir', 'inv-adicionar', 'inv-usar', 'inv-mudou', 'erro-script'];
  const KW = /^(function|const|let|var|if|else|for|while|do|return|break|continue|switch|case|default|new|typeof|of|in|try|catch|throw|true|false|null|undefined|this)$/;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function colorir(src) {
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\[\s\S])*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(\s*\()?/g; let o = '', i = 0, m;
    while ((m = re.exec(src))) { o += esc(src.slice(i, m.index)); i = re.lastIndex;
      if (m[1]) o += '<i class=c>' + esc(m[1]) + '</i>'; else if (m[2]) o += '<i class=s>' + esc(m[2]) + '</i>'; else if (m[3]) o += '<i class=n>' + m[3] + '</i>';
      else { const w = m[4], cls = KW.test(w) ? 'k' : (w === 'ctx' || w === 'e' || w === 'dt') ? 'v' : m[5] ? 'f' : ''; o += (cls ? '<i class=' + cls + '>' + w + '</i>' : w) + (m[5] ? esc(m[5]) : ''); } }
    return o + esc(src.slice(i)) + '\n';
  }
  // estrutura: [gutter | pilha(pre + textarea)]
  const cx = el('div', 'cod'), nums = el('pre', 'cod-n'), pilha = el('div', 'cod-pilha'), hl = el('pre', 'cod-hl'), pop = el('div', 'cod-pop'); pop.hidden = true;
  ta.parentNode.insertBefore(cx, ta); pilha.append(hl, ta, pop); cx.append(nums, pilha); ta.classList.add('cod-ta'); ta.wrap = 'off';
  let ultimo = null, erroLinha = null, sugest = [], idx = 0;
  function pintar() {
    const v = ta.value, n = v.split('\n').length; if (v === ultimo && ta.dataset.n === String(n) && ta.dataset.e === String(erroLinha)) return; ultimo = v; ta.dataset.n = n; ta.dataset.e = erroLinha;
    hl.innerHTML = colorir(v); let t = ''; for (let k = 1; k <= n; k++) t += (k === erroLinha ? '<b class=err>' + k + '</b>' : k) + '\n'; nums.innerHTML = t;
    cx.querySelector('.cod-linha-erro') && cx.querySelector('.cod-linha-erro').remove(); if (erroLinha) { const b = el('div', 'cod-linha-erro'); b.style.top = ((erroLinha - 1) * 18 + 6) + 'px'; pilha.append(b); b.style.transform = 'translateY(' + (-ta.scrollTop) + 'px)'; }
  }
  const rolar = () => { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; nums.scrollTop = ta.scrollTop; const b = cx.querySelector('.cod-linha-erro'); if (b) b.style.transform = 'translateY(' + (-ta.scrollTop) + 'px)'; };
  ta.addEventListener('scroll', rolar); (function obs() { pintar(); rolar(); requestAnimationFrame(obs); })();
  // erro: linha da sintaxe (tentativa) ou do último erro de execução
  function marcar(l) { erroLinha = l || null; pintar(); }
  root.EditorCodigo = { marcarErro: marcar };
  // — edição —
  const par = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  const troca = (ini, fim, txt, selIni, selFim) => { ta.setRangeText(txt, ini, fim, 'end'); if (selIni != null) ta.setSelectionRange(selIni, selFim == null ? selIni : selFim); ta.dispatchEvent(new Event('input', { bubbles: true })); };
  function linhaDe(p) { const v = ta.value, a = v.lastIndexOf('\n', p - 1) + 1, b = v.indexOf('\n', p); return [a, b < 0 ? v.length : b]; }
  function fecharPop() { pop.hidden = true; sugest = []; }
  function contexto() { const p = ta.selectionStart, m = /([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.?([\w$]*)$/.exec(ta.value.slice(Math.max(0, p - 80), p)); return m ? { cheio: m[0], base: m[1], resto: m[2], ponto: m[0].includes('.') } : null; }
  // dentro de uma string de argumento ("nome da variável", "objeto", "som"...): sugere nomes que EXISTEM na cena
  function dadosCena() {
    const c = ed.cena || {}, est = c.estado || {}, n = o => Object.keys(o || {});
    const objs = c.entities ? [...c.entities.values()].map(x => x.nome).filter(Boolean) : [];
    const emit = [...new Set((ta.value.match(/emit\(\s*["']([^"']+)["']/g) || []).map(x => x.replace(/^emit\(\s*["']/, '')))];
    return { vars: n(est.vars), listas: n(est.listas), objs, sons: n(est.sons), cenas: n(ed.cenasNomes ? ed.cenasNomes() : {}), eventos: [...new Set([...EVENTOS, ...emit])] };
  }
  const ARG = [[/ctx\.vars\.(?:ler|definir|somar|existe|declarar)\(\s*$/, 'vars'], [/ctx\.listas\.\w+\(\s*$/, 'listas'], [/ctx\.scene\.find\(\s*$/, 'objs'], [/ctx\.audio\.(?:tocar|efeito)\(\s*$/, 'sons'], [/ctx\.engine\.irPara\(\s*$/, 'cenas'], [/ctx\.events\.(?:on|emit)\(\s*$/, 'eventos'], [/ctx\.(?:sobre)\(\s*[\w.]+\s*,\s*$/, 'etiq']];
  function itens(forcar) {
    const p = ta.selectionStart, antes = ta.value.slice(Math.max(0, p - 120), p);
    const ms = /(["'])([^"'\n]*)$/.exec(antes);
    if (ms) { const cab = antes.slice(0, antes.length - ms[0].length), dc = dadosCena(); for (const [re, k] of ARG) if (re.test(cab)) return { pref: ms[2], lista: (dc[k] || []).map(x => ({ l: x, s: k === 'vars' ? 'variável' : k === 'objs' ? 'objeto' : k === 'sons' ? 'som' : k, ins: x, str: true })) }; return null; }
    const c = contexto(); if (!c) return forcar ? { pref: '', lista: GLOBAIS.map(x => ({ l: x, ins: x })).concat(SNIP.map(([l, s, i]) => ({ l, s, ins: i }))) } : null;
    if (c.ponto) { const i = c.cheio.lastIndexOf('.'), base = c.cheio.slice(0, i); let a = API[base] || (/^[a-z]\w*$/i.test(base) && !API[base] && /^(d|outro|o|alvo|obj|filho|pai)$/.test(base) ? API.e : null) || []; return { pref: c.cheio.slice(i + 1), lista: a.map(x => { const [n, sig] = x.split('|'); return { l: n, s: sig || '', ins: sig ? n + '(|)' : n }; }) }; }
    if (c.cheio.length < 2 && !forcar) return null;
    const vars = [...new Set((ta.value.match(/\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)/g) || []).map(x => x.split(/\s+/)[1]))];
    return { pref: c.cheio, lista: GLOBAIS.map(x => ({ l: x, ins: x })).concat(vars.map(x => ({ l: x, s: 'sua variável', ins: x })), SNIP.map(([l, s, i]) => ({ l, s, ins: i }))) };
  }
  let medida = 0; const charW = () => { if (medida) return medida; const t = el('span'); t.textContent = 'MMMMMMMMMM'; t.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit'; pilha.append(t); medida = t.getBoundingClientRect().width / 10 || 7.8; t.remove(); return medida; };
  function sugerir(forcar) {
    const r = itens(forcar); if (!r) return fecharPop(); const pref = r.pref, q = pref.toLowerCase();
    const pontua = x => { const l = x.l.toLowerCase(); return l === q ? -1 : l.startsWith(q) ? 0 : l.includes(q) ? 1 : 9; };
    sugest = r.lista.filter(x => x.l !== pref && (forcar || !q || pontua(x) < 9)).map((x, i) => ({ x, i })).sort((a, b) => pontua(a.x) - pontua(b.x) || (q ? a.x.l.localeCompare(b.x.l) : a.i - b.i)).map(o => o.x).slice(0, 10); if (!sugest.length) return fecharPop();
    idx = 0; pop.innerHTML = ''; sugest.forEach((x, i) => { const d = el('div', 'cod-it' + (i === 0 ? ' on' : '')); const n = el('b'); n.textContent = x.l; d.append(n); if (x.s) { const g = el('span', 'cod-sig'); g.textContent = x.s; d.append(g); } d.addEventListener('mousedown', ev => { ev.preventDefault(); idx = i; aceitar(); }); pop.append(d); });
    const linha = ta.value.slice(0, ta.selectionStart).split('\n'); pop.style.top = (linha.length * 18 + 8 - ta.scrollTop) + 'px'; pop.style.left = Math.max(0, Math.min(pilha.clientWidth - 240, 10 + linha[linha.length - 1].length * charW() - ta.scrollLeft)) + 'px'; pop.hidden = false; pop.dataset.pref = pref;
  }
  function aceitar() {
    const x = sugest[idx]; if (!x) return; const p = ta.selectionStart, pref = pop.dataset.pref, base = p - pref.length;
    if (x.str) { const dep = ta.value[p] || '', fim = dep === '"' || dep === "'" ? 1 : 0; troca(base, p, x.ins); ta.setSelectionRange(base + x.ins.length + fim, base + x.ins.length + fim); fecharPop(); return; }
    const ind = /^\s*/.exec(ta.value.slice(linhaDe(p)[0], p))[0]; let ins = x.ins.replace(/\n/g, '\n' + ind); const cur = ins.indexOf('|'); if (cur >= 0) ins = ins.slice(0, cur) + ins.slice(cur + 1);
    troca(base, p, ins, cur >= 0 ? base + cur : null); fecharPop();
  }
  ta.addEventListener('input', () => { if (document.activeElement === ta) sugerir(false); marcar(null); });
  ta.addEventListener('click', fecharPop);
  ta.addEventListener('blur', () => setTimeout(fecharPop, 120));
  ta.addEventListener('keydown', ev => {
    if (ta.readOnly) return; const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
    if (ev.key === ' ' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); sugerir(true); return; }
    if (!pop.hidden) { if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); idx = (idx + (ev.key === 'ArrowDown' ? 1 : sugest.length - 1)) % sugest.length; [...pop.children].forEach((d, i) => d.classList.toggle('on', i === idx)); return; } if (ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); aceitar(); return; } if (ev.key === 'Escape') { ev.preventDefault(); fecharPop(); return; } }
    if (ev.key === 'Tab') { ev.preventDefault(); const [ls] = linhaDe(a), fim = linhaDe(b)[1], bloco = v.slice(ls, fim), multi = a !== b || ev.shiftKey;
      if (!multi) return troca(a, b, '  ', a + 2);
      const novo = bloco.split('\n').map(l => ev.shiftKey ? l.replace(/^ {1,2}/, '') : '  ' + l).join('\n'); ta.setSelectionRange(ls, fim); troca(ls, fim, novo, ls, ls + novo.length); return; }
    if (ev.key === 'Enter' && !ev.ctrlKey) { ev.preventDefault(); const [ls] = linhaDe(a), l = v.slice(ls, a), ind = /^\s*/.exec(l)[0], abre = /[{(\[]\s*$/.test(l), fecha = /^[}\])]/.test(v.slice(b));
      if (abre && fecha) { const ins = '\n' + ind + '  \n' + ind; return troca(a, b, ins, a + 1 + ind.length + 2); } return troca(a, b, '\n' + ind + (abre ? '  ' : ''), a + 1 + ind.length + (abre ? 2 : 0)); }
    if (ev.key === '/' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); const [ls] = linhaDe(a), fim = linhaDe(b)[1], ls2 = v.slice(ls, fim).split('\n'), todas = ls2.every(l => /^\s*\/\//.test(l) || !l.trim()); const novo = ls2.map(l => todas ? l.replace(/^(\s*)\/\/ ?/, '$1') : l.replace(/^(\s*)/, '$1// ')).join('\n'); troca(ls, fim, novo, ls, ls + novo.length); return; }
    if (par[ev.key] && !ev.ctrlKey && !ev.metaKey) { const ant = v[a - 1] || '', dep = v[b] || ''; if (a !== b) { ev.preventDefault(); return troca(a, b, ev.key + v.slice(a, b) + par[ev.key], a + 1, b + 1); }
      if ((ev.key === '"' || ev.key === "'") && (/\w/.test(ant) || dep === ev.key)) { if (dep === ev.key) { ev.preventDefault(); ta.setSelectionRange(a + 1, a + 1); } return; }
      if (!/\w/.test(dep)) { ev.preventDefault(); troca(a, b, ev.key + par[ev.key], a + 1); } return; }
    if (')]}"\''.includes(ev.key) && a === b && v[a] === ev.key) { ev.preventDefault(); ta.setSelectionRange(a + 1, a + 1); return; }
    if (ev.key === 'Backspace' && a === b && par[v[a - 1]] && v[a] === par[v[a - 1]]) { ev.preventDefault(); troca(a - 1, a + 1, '', a - 1); }
  });
  // linha do erro de sintaxe (Function não informa linha: procuramos pela tentativa de achar o menor prefixo que já falha de forma "definitiva")
  const msgEl = document.getElementById('sc-msg'); if (msgEl) new MutationObserver(() => { const t = msgEl.textContent, m = /linha (\d+)/.exec(t); if (/Erro|Ao iniciar|erro/.test(t) && m) marcar(+m[1]); else if (!/Erro|erro/.test(t)) marcar(null); }).observe(msgEl, { childList: true, characterData: true, subtree: true });
})(window);
