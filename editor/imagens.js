/* Editor · imagens: importar (botão ou arrastar para o canvas), guardar na cena (estado.imagens, data URL) e registrar em Assets. */
(function (root) {
  const ed = root.editor, r = ed.renderer, cena = ed.cena, $ = id => document.getElementById(id), tela = $('tela'), palco = tela.parentElement;
  const MAX_LADO = 1024, MAX_CHARS = 400000, MAX_N = 30;
  const registradas = new Map(); let ultima = null;
  const msg = (t, tipo) => { const m = $('img-msg'); m.textContent = t || ''; m.className = 'msg ' + (tipo || ''); };
  const lerArquivo = f => new Promise((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => erro(new Error('não consegui ler o arquivo')); fr.readAsDataURL(f); });
  const abrir = src => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('imagem inválida')); i.src = src; });
  async function reduzir(arquivo) {   // encolhe até caber no limite; devolve {src, w, h}
    const img = await abrir(await lerArquivo(arquivo));
    let k = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
    for (let t = 0; t < 5; t++, k *= .7) {
      const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k)), c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h); const src = c.toDataURL('image/png');
      if (src.length <= MAX_CHARS) return { src, w, h };
    }
    throw new Error('imagem grande demais, mesmo reduzida');
  }
  function nomeUnico(arquivo) {
    const base = (arquivo.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 30) || 'imagem'), im = cena.estado.imagens || {};
    let n = base, i = 2; while (im[n]) n = base + '_' + i++; return n;
  }
  async function importar(arquivos) {
    const nomes = [];
    for (const f of arquivos) {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { msg('"' + f.name + '" não é PNG, JPG, WEBP ou GIF.', 'erro'); continue; }
      if (Object.keys(cena.estado.imagens || {}).length >= MAX_N) { msg('Limite de ' + MAX_N + ' imagens por cena.', 'erro'); break; }
      try { const { src, w, h } = await reduzir(f), n = nomeUnico(f); (cena.estado.imagens = cena.estado.imagens || {})[n] = src; registradas.set(n, src); const i = await abrir(src); r.assets.registrar(n, i); nomes.push({ nome: n, w, h }); msg('Importada: ' + n + ' (' + w + '×' + h + ').', 'ok'); }
      catch (x) { msg(f.name + ': ' + x.message, 'erro'); }
    }
    if (nomes.length) { ed.json(); desenharLista(); ed.redesenhar(); }
    return nomes;
  }
  function usar(nome, w, h) {
    const e = ed.cena.get(ed.sel); if (!e) return msg('Selecione um objeto primeiro.', 'erro');
    if (!e.Sprite) e.Sprite = {};
    const i = r.assets.get(nome); w = w || (i && i.width) || 32; h = h || (i && i.height) || 32;
    ed.aplicar('Sprite', 'imagem', nome); ed.aplicar('Sprite', 'quadroW', w); ed.aplicar('Sprite', 'quadroH', h); msg('"' + nome + '" aplicada ao objeto.', 'ok');
  }
  function remover(nome) { delete cena.estado.imagens[nome]; if (!Object.keys(cena.estado.imagens).length) delete cena.estado.imagens; registradas.delete(nome); ultima = null; ed.json(); ed.redesenhar(); }
  function desenharLista() {
    const ul = $('img-lista'), im = cena.estado.imagens || {}; ul.innerHTML = ''; $('n-img').textContent = '(' + Object.keys(im).length + ')';
    for (const [n, src] of Object.entries(im)) {
      const li = document.createElement('li'), t = document.createElement('img'), nm = document.createElement('span'), u = document.createElement('button'), x = document.createElement('button');
      t.src = src; t.alt = ''; nm.className = 'nome'; nm.textContent = n; nm.title = n; u.type = x.type = 'button'; u.textContent = 'Usar'; u.title = 'Aplicar ao objeto selecionado'; x.textContent = '✕'; x.title = 'Remover imagem'; x.setAttribute('aria-label', 'Remover a imagem ' + n);
      u.addEventListener('click', () => usar(n)); x.addEventListener('click', () => remover(n)); li.append(t, nm, u, x); ul.append(li);
    }
  }
  (function sincronizar() {   // abrir projeto/cena/desfazer troca estado.imagens: registra o que faltar
    const im = cena.estado.imagens || {};
    for (const [n, src] of Object.entries(im)) if (registradas.get(n) !== src) { registradas.set(n, src); abrir(src).then(i => { r.assets.registrar(n, i); ed.redesenhar(); }).catch(() => {}); }
    const chave = Object.entries(im).map(([n, s]) => n + s.length).join('|'); if (chave !== ultima) { ultima = chave; desenharLista(); }
    requestAnimationFrame(sincronizar);
  })();
  $('img-importar').addEventListener('click', () => $('img-arquivo').click());
  $('img-arquivo').addEventListener('change', async ev => { const f = [...ev.target.files]; ev.target.value = ''; await importar(f); });
  const temArquivo = ev => ev.dataTransfer && [...(ev.dataTransfer.types || [])].includes('Files');
  palco.addEventListener('dragover', ev => { if (!temArquivo(ev) || ed.engine.rodando) return; ev.preventDefault(); palco.classList.add('solte'); });
  palco.addEventListener('dragleave', () => palco.classList.remove('solte'));
  palco.addEventListener('drop', async ev => {
    palco.classList.remove('solte'); if (!temArquivo(ev) || ed.engine.rodando) return; ev.preventDefault();
    const b = tela.getBoundingClientRect(), w = ed.mundo(ev), lista = await importar([...ev.dataTransfer.files]);
    lista.forEach((it, k) => {
      let nome = it.nome, n = 2; while (cena.find(nome)) nome = it.nome + '_' + n++;
      const e = cena.create({ nome, Transform: { x: Math.round(w.x + k * 24), y: Math.round(w.y + k * 24) }, Sprite: { imagem: it.nome, quadroW: it.w, quadroH: it.h, escala: 1 } }); if (k === lista.length - 1) ed.selecionar(e.id);
    });
    if (lista.length) { cena.flush(); ed.json(); ed.redesenhar(); }
  });
  root.EditorImagens = { importar, usar, remover };
})(window);
