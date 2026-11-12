/* Editor · inspetor: script do objeto (escolher, criar, editar, copiar, baixar). Os scripts continuam em estado.scripts. */
(function (root) {
  const ed = root.editor, C = Core, cena = ed.cena, $ = id => document.getElementById(id);
  const fontes = () => cena.estado.scripts || (cena.estado.scripts = {});
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const botao = (txt, fn, dica) => { const b = el('button', null, txt); b.type = 'button'; if (dica) b.title = dica; b.addEventListener('click', fn); return b; };
  function unico(base) { base = (base || 'objeto').replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1'); let n = base + '_script', i = 2; while (fontes()[n]) n = base + '_script' + i++; return n; }
  const refazer = () => { ed.json(); ed.selecionar(ed.sel); };
  function editar(nome) { const l = $('sc-lista'); l.value = nome; l.dispatchEvent(new Event('change')); $('e-scripts').click(); }
  function montar(box, e) {
    const g = el('div', 'grupo sc-obj'), atual = e.Script && e.Script.nome, nomes = Object.keys(fontes()), travado = ed.engine.rodando;
    g.append(el('b', null, 'Script'));
    const sel = el('select'); sel.setAttribute('aria-label', 'Script do objeto'); sel.disabled = travado;
    sel.append(new Option('(nenhum)', '')); for (const n of nomes) sel.append(new Option(n, n)); sel.value = nomes.includes(atual) ? atual : '';
    sel.addEventListener('change', () => { if (sel.value) e.Script = { nome: sel.value }; else delete e.Script; refazer(); });
    g.append(sel);
    const l1 = el('div', 'linha'), l2 = el('div', 'linha');
    l1.append(botao('+ Novo (blocos)', () => { const n = unico(e.nome); fontes()[n] = { blocos: [], fonte: EditorBlocos.gerar([]) }; e.Script = { nome: n }; refazer(); editar(n); }, 'Cria um script de blocos e anexa a este objeto'));
    if (atual && fontes()[atual]) {
      l1.append(botao('✎ Editar', () => editar(atual), 'Abre este script na janela grande'));
      l2.append(botao('⧉ Copiar', () => { const base = atual.replace(/_copia\d*$/, ''); let n = base + '_copia', i = 2; while (fontes()[n]) n = base + '_copia' + i++; const o = JSON.parse(JSON.stringify(fontes()[atual])); fontes()[n] = o; e.Script = { nome: n }; refazer(); }, 'Duplica o script e anexa a cópia'),
        botao('⬇ Baixar .js', () => { const a = el('a'); a.href = URL.createObjectURL(new Blob([fontes()[atual].fonte || ''], { type: 'text/javascript' })); a.download = atual + '.js'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, 'Baixa o código JavaScript'));
    }
    g.append(l1); if (l2.children.length) g.append(l2);
    box.append(g);
  }
  root.EditorInspetorScript = { montar };
})(window);
