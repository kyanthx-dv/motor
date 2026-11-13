/* Editor · sons: importar arquivo de áudio (data URL em estado.sons), ouvir e remover. Tocar no jogo: blocos "tocar som importado". */
(function (root) {
  const ed = root.editor, cena = ed.cena, $ = id => document.getElementById(id), MAX_CHARS = 480000, MAX_N = 10;
  let ultima = null, prev = null;
  const msg = (t, tipo) => { const m = $('som-msg'); m.textContent = t || ''; m.className = 'msg ' + (tipo || ''); };
  const ler = f => new Promise((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => erro(new Error('não consegui ler')); fr.readAsDataURL(f); });
  async function importar(arqs) {
    for (const f of arqs) {
      const sons = cena.estado.sons || {};
      if (Object.keys(sons).length >= MAX_N) { msg('Limite de ' + MAX_N + ' sons por cena.', 'erro'); break; }
      try {
        const src = await ler(f); if (!/^data:audio\//.test(src)) throw new Error('não é um arquivo de áudio');
        if (src.length > MAX_CHARS) throw new Error('"' + f.name + '" é grande demais (use um som curto, até ~350 KB)');
        let n = f.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 30) || 'som', k = n, i = 2; while (sons[k]) k = n + '_' + i++;
        (cena.estado.sons = cena.estado.sons || {})[k] = src; msg('Importado: ' + k, 'ok'); ed.json();
      } catch (x) { msg(x.message, 'erro'); }
    }
  }
  function remover(n) { delete cena.estado.sons[n]; if (!Object.keys(cena.estado.sons).length) delete cena.estado.sons; ultima = null; ed.json(); }
  function ouvir(src) { try { if (prev) prev.pause(); prev = new Audio(src); prev.play().catch(() => msg('O navegador não conseguiu tocar este arquivo.', 'erro')); } catch (x) {} }
  function lista() {
    const ul = $('som-lista'), so = cena.estado.sons || {}; ul.innerHTML = ''; $('n-som').textContent = '(' + Object.keys(so).length + ')';
    for (const [n, src] of Object.entries(so)) {
      const li = document.createElement('li'), nm = document.createElement('span'), p = document.createElement('button'), x = document.createElement('button');
      nm.className = 'nome'; nm.textContent = n; p.type = x.type = 'button'; p.textContent = '▶'; p.title = 'Ouvir'; x.textContent = '✕'; x.title = 'Remover som'; x.setAttribute('aria-label', 'Remover ' + n);
      p.addEventListener('click', () => ouvir(src)); x.addEventListener('click', () => remover(n)); li.append(nm, p, x); ul.append(li);
    }
  }
  (function sincronizar() { const so = cena.estado.sons || {}, c = Object.entries(so).map(([n, s]) => n + s.length).join('|'); if (c !== ultima) { ultima = c; lista(); } requestAnimationFrame(sincronizar); })();
  $('som-importar').addEventListener('click', () => $('som-arquivo').click());
  $('som-arquivo').addEventListener('change', async ev => { const f = [...ev.target.files]; ev.target.value = ''; await importar(f); });
})(window);
