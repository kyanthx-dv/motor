/* Editor · código: melhora o <textarea id="sc-fonte"> sem biblioteca externa — números de linha, cores, Tab/Shift+Tab, auto-indent,
   fechamento de ( [ { " ', Ctrl+/ (comentar), autocompletar (ctx., e., dt…) e marcação da linha do erro.
   O textarea continua sendo a fonte da verdade (mesmo id/eventos); quem muda .value por código é detectado por observação. */
(function (root) {
  const ed = root.editor, ta = document.getElementById('sc-fonte'); if (!ta) return;
  const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };
  const API = {
    ctx: ['vars', 'listas', 'input', 'scene', 'engine', 'dispositivo', 'audio', 'efeitos', 'caminho', 'events', 'tela', 'dt', 'escrever', 'sobre', 'depois', 'tween', 'salvarPartida', 'carregarPartida', 'existePartida'],
    'ctx.vars': ['ler', 'definir', 'somar'], 'ctx.listas': ['adicionar', 'remover', 'item', 'definir', 'tamanho', 'contem', 'todos', 'limpar', 'aleatorio'],
    'ctx.input': ['axes', 'pointer', 'joystick', 'tecla', 'apertou', 'soltou'], 'ctx.scene': ['create', 'find', 'get', 'query', 'destroy', 'clonar', 'animar', 'adotar', 'soltar', 'estado'],
    'ctx.engine': ['tempo', 'aleatorio', 'irPara', 'reiniciar', 'observar'], 'ctx.efeitos': ['tremer', 'fade', 'particulas'], 'ctx.dispositivo': ['vibrar', 'telaCheia', 'ler'],
    'ctx.caminho': ['parar'], 'ctx.tela': ['largura', 'altura'], 'ctx.audio': ['tocar', 'parar', 'volume'],
    e: ['id', 'nome', 'Transform', 'Sprite', 'Body', 'Animacao', 'Script', 'Etiquetas', 'Attr', 'Botao', 'Rota', 'Pai'], 'e.Transform': ['x', 'y', 'rot', 'escala'],
    'e.Sprite': ['cor', 'w', 'h', 'raio', 'rotulo', 'opacidade', 'imagem', 'invisivel', 'fixo', 'forma'], 'e.Body': ['vx', 'vy', 'w', 'h', 'raio', 'estatico', 'sensor', 'gravidade', 'elasticidade'], 'e.Animacao': ['atual', 'quadro', 'terminou']
  };
  const GLOBAIS = ['ctx', 'e', 'dt', 'function', 'iniciar', 'atualizar', 'ao_colidir', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'true', 'false', 'null', 'Math'];
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
  function sugerir() {
    const c = contexto(); if (!c) return fecharPop(); let lista = [], pref = '';
    if (c.ponto) { const i = c.cheio.lastIndexOf('.'); const base = c.cheio.slice(0, i); pref = c.cheio.slice(i + 1); lista = API[base] || []; } else { pref = c.cheio; lista = pref.length >= 2 ? GLOBAIS : []; }
    sugest = lista.filter(x => x.startsWith(pref) && x !== pref).slice(0, 8); if (!sugest.length) return fecharPop();
    idx = 0; pop.innerHTML = ''; sugest.forEach((s, i) => { const d = el('div', 'cod-it' + (i === 0 ? ' on' : '')); d.textContent = s; d.addEventListener('mousedown', ev => { ev.preventDefault(); idx = i; aceitar(); }); pop.append(d); });
    const linha = ta.value.slice(0, ta.selectionStart).split('\n'); pop.style.top = (linha.length * 18 + 8 - ta.scrollTop) + 'px'; pop.style.left = Math.min(260, 8 + linha[linha.length - 1].length * 7.2 - ta.scrollLeft) + 'px'; pop.hidden = false; pop.dataset.pref = pref;
  }
  function aceitar() { const s = sugest[idx]; if (!s) return; const p = ta.selectionStart, pref = pop.dataset.pref; troca(p - pref.length, p, s); fecharPop(); }
  ta.addEventListener('input', () => { if (document.activeElement === ta) sugerir(); marcar(null); });
  ta.addEventListener('blur', () => setTimeout(fecharPop, 120));
  ta.addEventListener('keydown', ev => {
    if (ta.readOnly) return; const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
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
