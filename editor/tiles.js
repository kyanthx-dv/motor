/* Editor · mapa de tiles: criar, inspetor (tamanho, grade, paleta) e pintar no canvas. Os dados ficam no componente Tiles. */
(function (root) {
  const ed = root.editor, cena = ed.cena, $ = id => document.getElementById(id), tela = $('tela');
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  let pincel = 1, pintando = false, ativo = false, arrasto = false;
  const PALETA = [{ cor: '#4c8c4a' }, { cor: '#7a7a7a', solido: true }, { cor: '#3b6fb6', solido: true }, { cor: '#c2a36b' }];
  function criar() {
    const C = 25, L = 14, dados = []; for (let r = 0; r < L; r++) for (let c = 0; c < C; c++) dados.push(r === 0 || c === 0 || r === L - 1 || c === C - 1 ? 2 : 1);
    let nome = 'mapa', i = 2; while (cena.find(nome)) nome = 'mapa' + i++;
    const e = cena.create({ nome, Transform: { x: 0, y: 0 }, Tiles: { tamanho: 32, colunas: C, linhas: L, paleta: JSON.parse(JSON.stringify(PALETA)), dados } });
    cena.flush(); ed.selecionar(e.id); ed.json(); ed.redesenhar();
  }
  function redimensionar(T, colunas, linhas, tamanho) {
    colunas = Math.max(1, Math.min(300, Math.round(colunas))); linhas = Math.max(1, Math.min(300, Math.round(linhas))); tamanho = Math.max(4, Math.min(256, Math.round(tamanho)));
    if (colunas * linhas > 20000) return false;
    const d = new Array(colunas * linhas).fill(0); for (let r = 0; r < Math.min(linhas, T.linhas); r++) for (let c = 0; c < Math.min(colunas, T.colunas); c++) d[r * colunas + c] = T.dados[r * T.colunas + c];
    T.dados = d; T.colunas = colunas; T.linhas = linhas; T.tamanho = tamanho; return true;
  }
  const num = (rot, v, fn) => { const d = el('div', 'campo'), l = el('label', null, rot), i = el('input'); i.type = 'number'; i.value = v; i.addEventListener('change', () => fn(Number(i.value))); d.append(l, i); i.id = 'tl-' + rot; l.htmlFor = i.id; return d; };
  function montar(box, e) {
    if (!e.Tiles) return; const T = e.Tiles, g = el('div', 'grupo'), travado = ed.engine.rodando;
    g.append(el('b', null, 'Mapa de tiles'));
    const refaz = () => { ed.json(); ed.selecionar(ed.sel); ed.redesenhar(); };
    const mudar = (c, l, t) => { if (travado) return; if (!redimensionar(T, c, l, t)) return; delete T.gerado; refaz(); };
    g.append(num('colunas', T.colunas, v => mudar(v, T.linhas, T.tamanho)), num('linhas', T.linhas, v => mudar(T.colunas, v, T.tamanho)), num('tamanho', T.tamanho, v => mudar(T.colunas, T.linhas, v)));
    const ch = el('label', 'chk'), cb = el('input'); cb.type = 'checkbox'; cb.checked = ativo; cb.id = 'tl-pintar'; cb.disabled = travado; cb.addEventListener('change', () => { ativo = cb.checked; tela.style.cursor = ativo ? 'cell' : ''; }); ch.append(cb, ' Pintar no canvas (clique e arraste)'); g.append(ch);
    const ac = el('label', 'chk'), ca = el('input'); ca.type = 'checkbox'; ca.checked = !!T.acima; ca.addEventListener('change', () => { if (ca.checked) T.acima = true; else delete T.acima; ed.json(); ed.redesenhar(); }); ac.append(ca, ' Desenhar por cima dos objetos'); g.append(ac);
    g.append(el('div', 'vazio', 'Paleta (clique para escolher o pincel):'));
    const pal = el('div'); pal.style.display = 'grid'; pal.style.gap = '4px';
    [{ cor: 'transparent', _vazio: true }, ...T.paleta].forEach((p, k) => {
      const linha = el('div', 'linha'); linha.style.margin = '0'; linha.style.alignItems = 'center';
      const b = el('button', null, k === 0 ? '⌫ borracha' : String(k)); b.type = 'button'; b.style.minWidth = k === 0 ? '90px' : '32px'; b.setAttribute('aria-pressed', String(pincel === k)); if (pincel === k) b.style.outline = '2px solid var(--acento)'; b.addEventListener('click', () => { pincel = k; ed.selecionar(ed.sel); });
      linha.append(b); if (k > 0) {
        const cor = el('input'); cor.type = 'color'; cor.style.width = '38px'; cor.style.padding = '0'; cor.value = /^#[0-9a-f]{6}$/i.test(p.cor) ? p.cor : '#888888'; cor.disabled = travado; cor.addEventListener('change', () => { p.cor = cor.value; ed.json(); ed.redesenhar(); });
        const sol = el('label', 'chk', ''); const sc = el('input'); sc.type = 'checkbox'; sc.checked = !!p.solido; sc.disabled = travado; sc.addEventListener('change', () => { p.solido = sc.checked; delete T.gerado; ed.json(); }); sol.append(sc, ' sólido');
        const im = el('input'); im.placeholder = 'imagem'; im.value = p.imagem || ''; im.style.width = '80px'; im.title = 'Nome de uma imagem importada (opcional)'; im.disabled = travado; im.addEventListener('change', () => { if (im.value.trim()) p.imagem = im.value.trim().slice(0, 40); else delete p.imagem; ed.json(); ed.redesenhar(); });
        linha.append(cor, sol, im);
      } pal.append(linha);
    });
    g.append(pal);
    if (!travado && T.paleta.length < 32) { const mais = el('button', null, '+ cor na paleta'); mais.type = 'button'; mais.addEventListener('click', () => { T.paleta.push({ cor: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') }); refaz(); }); g.append(mais); }
    box.append(g);
  }
  function pintar(ev) {
    const e = cena.get(ed.sel); if (!e || !e.Tiles) return false; const T = e.Tiles, w = ed.mundo(ev);
    const c = Math.floor((w.x - e.Transform.x) / T.tamanho), r = Math.floor((w.y - e.Transform.y) / T.tamanho);
    if (c < 0 || r < 0 || c >= T.colunas || r >= T.linhas) return true;
    const k = Math.min(pincel, T.paleta.length); if (T.dados[r * T.colunas + c] !== k) { T.dados[r * T.colunas + c] = k; arrasto = true; ed.redesenhar(); }
    return true;
  }
  tela.addEventListener('pointerdown', ev => {
    if (!ativo || ed.engine.rodando || ev.button !== 0) return; const e = cena.get(ed.sel); if (!e || !e.Tiles) return;
    pintando = true; arrasto = false; tela.setPointerCapture(ev.pointerId); pintar(ev); ev.stopImmediatePropagation(); ev.preventDefault();
  }, true);
  tela.addEventListener('pointermove', ev => { if (pintando) { pintar(ev); ev.stopImmediatePropagation(); } }, true);
  tela.addEventListener('pointerup', ev => { if (!pintando) return; pintando = false; ev.stopImmediatePropagation(); if (arrasto) { const e = cena.get(ed.sel); if (e && e.Tiles) delete e.Tiles.gerado; ed.json(); } }, true);
  tela.addEventListener('click', ev => { if (ativo) ev.stopImmediatePropagation(); }, true);
  $('e-tiles').addEventListener('click', criar);
  root.EditorTiles = { montar, criar, get pincel() { return pincel; }, set pincel(v) { pincel = v; } };
})(window);
