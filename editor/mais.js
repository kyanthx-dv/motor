/* Editor · painel "＋ Novo objeto": tipos de objeto que podem ser criados (o Criar do topo foi para cá). */
(function (root) {
  const ed = root.editor, cena = ed.cena, $ = id => document.getElementById(id);
  const painel = $('mais-painel'), abrir = on => { painel.hidden = !on; $('e-mais').setAttribute('aria-expanded', String(on)); };
  const nome = base => { let n = base, i = 2; while (cena.find(n)) n = base + i++; return n; };
  const novo = def => { if (ed.engine.rodando) return; const e = cena.create(def); cena.flush(); ed.selecionar(e.id); ed.json(); ed.redesenhar(); };
  $('e-mais').addEventListener('click', () => abrir(painel.hidden));
  painel.addEventListener('click', ev => { if (ev.target.closest('button')) abrir(false); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') abrir(false); });
  $('e-retangulo').addEventListener('click', () => novo({ nome: nome('parede'), Transform: { x: 400, y: 225 }, Body: { forma: 'retangulo', w: 160, h: 24, massa: 0, elasticidade: 0.2 }, Sprite: { cor: '#6b7280' } }));
  $('e-sensor').addEventListener('click', () => novo({ nome: nome('sensor'), Transform: { x: 400, y: 225 }, Body: { forma: 'retangulo', w: 80, h: 80, massa: 0, sensor: true }, Sprite: { cor: 'rgba(125,220,140,.45)' }, Etiquetas: ['gatilho'] }));
  $('e-painel').addEventListener('click', () => novo({ nome: nome('painel'), Transform: { x: 400, y: 60 }, Sprite: { fixo: true, forma: 'retangulo', w: 300, h: 70, cor: 'rgba(15,23,42,.75)', borda: '#64748b', larguraBorda: 2, arredondar: 12, sombra: true, camada: -1 } }));
  $('e-imagem').addEventListener('click', () => $('e-imagem-arq').click());
  $('e-imagem-arq').addEventListener('change', async ev => {
    const arqs = [...ev.target.files]; ev.target.value = ''; const lista = await root.EditorImagens.importar(arqs);
    lista.forEach((it, k) => { const e = cena.create({ nome: nome(it.nome), Transform: { x: 400 + k * 24, y: 225 + k * 24 }, Sprite: { imagem: it.nome, quadroW: it.w, quadroH: it.h, escala: 1 } }); if (k === lista.length - 1) ed.selecionar(e.id); });
    if (lista.length) { cena.flush(); ed.json(); ed.redesenhar(); }
  });
})(window);
