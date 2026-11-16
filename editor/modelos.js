/* Editor · modelos prontos de RPG (menu "＋ Novo objeto"): diálogo com escolhas, inventário com slots e vida com dano.
   Cada modelo cria objetos de interface + UM script de código (editável) e funciona só com eventos:
     dialogo-abrir {id} · inv-adicionar {item,qtd} · inv-usar {item} · dano {qtd} · curar {qtd}
   Os modelos conversam: poção do inventário dispara "curar"; opção de diálogo pode disparar qualquer evento. */
(function (root) {
  const ed = root.editor, cena = ed.cena, $ = id => document.getElementById(id);
  const msg = (t, k) => { const m = $('msg'); if (m) { m.textContent = t; m.className = 'msg ' + (k || ''); } };
  const T = (nome, x, y, rotulo, tam, cor, al) => ({ nome, Transform: { x, y }, Sprite: { fixo: true, rotulo, corTexto: cor || '#ffffff', tamanhoTexto: tam, alinhar: al || 'center', fonte: 'system-ui', camada: 3 } });
  const P = (nome, x, y, w, h, cor, camada) => ({ nome, Transform: { x, y }, Sprite: { fixo: true, forma: 'retangulo', w, h, cor, borda: '#64748b', larguraBorda: 2, arredondar: 10, camada: camada || 1 } });
  const B = (nome, x, y, w, h, rotulo, evento, tam) => ({ nome, Transform: { x, y }, Sprite: { fixo: true, forma: 'retangulo', w, h, rotulo, cor: '#2563eb', corSobre: '#3b82f6', corApertado: '#1d4ed8', borda: '#93c5fd', larguraBorda: 2, arredondar: 8, corTexto: '#ffffff', tamanhoTexto: tam || 16, alinhar: 'center', fonte: 'system-ui', camada: 4 }, Botao: { acao: { evento } } });

  const DIALOGO = [
    '// DIÁLOGO COM ESCOLHAS. Edite a ARVORE: cada nó tem quem, fala e opcoes (até 3).',
    '// Opção: { texto, vai:"outroNó" (ou null para fechar), evento:"nome", dados:{}, vars:{ variavel: valor } }',
    '// Sem opcoes, aparece um "Continuar" que vai para o nó "vai" do próprio nó.',
    '// Abrir: ctx.events.emit("dialogo-abrir", { id: "inicio" })   Eventos de saída: dialogo-aberto, dialogo-fechado.',
    'var ARVORE = {',
    '  inicio: { quem: "Aldeão", fala: "Olá, viajante! Precisa de ajuda?", opcoes: [',
    '    { texto: "Sim, por favor", vai: "ajuda" },',
    '    { texto: "Não, obrigado", vai: null, vars: { recusou: true } } ] },',
    '  ajuda: { quem: "Aldeão", fala: "Leve esta poção. Boa sorte!", opcoes: [',
    '    { texto: "Obrigado!", vai: null, evento: "inv-adicionar", dados: { item: "pocao", qtd: 1 }, vars: { ajudou: true } } ] }',
    '};',
    'var ops = ["dialogo-op1", "dialogo-op2", "dialogo-op3"], fixos = ["dialogo-caixa", "dialogo-nome", "dialogo-fala"], aberto = null, ligado = false;',
    'function cena(ctx) { return ctx.engine.scene; }',
    'function opac(ctx, nome, v) { var x = cena(ctx).find(nome); if (x && x.Sprite) x.Sprite.opacidade = v; return x; }',
    'function texto(ctx, nome, t) { var x = cena(ctx).find(nome); if (x && x.Sprite) x.Sprite.rotulo = t; }',
    'function esconder(ctx) { fixos.concat(ops).forEach(function (n) { var x = opac(ctx, n, 0); if (x && x.Botao) x.Botao.desativado = true; }); }',
    'function fechar(ctx) { var estava = aberto !== null; aberto = null; esconder(ctx); if (estava) ctx.events.emit("dialogo-fechado", {}); }',
    'function abrir(ctx, id) {',
    '  var n = ARVORE[id]; if (!n) { fechar(ctx); return; }',
    '  aberto = id; fixos.forEach(function (f) { opac(ctx, f, 1); });',
    '  texto(ctx, "dialogo-nome", n.quem || ""); texto(ctx, "dialogo-fala", n.fala || "");',
    '  var lista = n.opcoes && n.opcoes.length ? n.opcoes : [{ texto: "Continuar", vai: n.vai || null }];',
    '  ops.forEach(function (nome, i) { var o = lista[i], b = opac(ctx, nome, o ? 1 : 0); if (b && b.Botao) { b.Botao.desativado = !o; if (o) b.Sprite.rotulo = o.texto; } });',
    '  ctx.events.emit("dialogo-aberto", { id: id });',
    '}',
    'function escolher(ctx, i) {',
    '  if (aberto === null) return;',
    '  var n = ARVORE[aberto], lista = n.opcoes && n.opcoes.length ? n.opcoes : [{ vai: n.vai || null }], o = lista[i]; if (!o) return;',
    '  if (o.vars) for (var k in o.vars) { if (ctx.vars.existe(k)) ctx.vars.definir(k, o.vars[k]); else ctx.vars.declarar(k, o.vars[k]); }',
    '  if (o.evento) ctx.events.emit(o.evento, o.dados || {});',
    '  if (o.vai) abrir(ctx, o.vai); else fechar(ctx);',
    '}',
    'function iniciar(e, ctx) {',
    '  esconder(ctx); if (ligado) return; ligado = true;',
    '  ctx.events.on("dialogo-abrir", function (d) { abrir(ctx, (d && d.id) || "inicio"); });',
    '  ops.forEach(function (nome, i) { ctx.events.on(nome, function () { escolher(ctx, i); }); });',
    '}', ''
  ].join('\n');

  const INVENTARIO = [
    '// INVENTÁRIO COM SLOTS. Edite ITENS (nome mostrado, max por slot, usar = evento ao clicar no slot, consumir).',
    '// Eventos de entrada: inv-adicionar {item,qtd} · inv-remover {item,qtd} · inv-usar {item}. Clicar num slot usa o item.',
    '// Saída: inv-mudou {item,qtd} · inv-cheio {item} · inv-usado {item}. A quantidade fica na variável inv_<item> (entra no save).',
    'var ITENS = {',
    '  pocao: { nome: "Poção", max: 9, usar: { evento: "curar", dados: { qtd: 1 } }, consumir: true },',
    '  chave: { nome: "Chave", max: 1 },',
    '  moeda: { nome: "Moeda", max: 99 }',
    '};',
    'var SLOTS = 6, ligado = false;',
    'function cena(ctx) { return ctx.engine.scene; }',
    'function qtd(ctx, item) { return ctx.vars.existe("inv_" + item) ? ctx.vars.ler("inv_" + item) : 0; }',
    'function presentes(ctx) { return Object.keys(ITENS).filter(function (k) { return qtd(ctx, k) > 0; }); }',
    'function desenhar(ctx) {',
    '  var lista = presentes(ctx);',
    '  for (var i = 0; i < SLOTS; i++) {',
    '    var s = cena(ctx).find("inv-slot" + (i + 1)); if (!s) continue; var k = lista[i];',
    '    s.Sprite.rotulo = k ? ITENS[k].nome + (qtd(ctx, k) > 1 ? " x" + qtd(ctx, k) : "") : "";',
    '    s.Sprite.cor = k ? "#334155" : "rgba(15,23,42,.6)";',
    '  }',
    '}',
    'function mudar(ctx, item, delta) {',
    '  var d = ITENS[item]; if (!d || !delta) return;',
    '  var atual = qtd(ctx, item), novo = atual + delta;',
    '  if (delta > 0 && atual === 0 && presentes(ctx).length >= SLOTS) { ctx.events.emit("inv-cheio", { item: item }); return; }',
    '  if (novo > (d.max || 99)) { novo = d.max || 99; ctx.events.emit("inv-cheio", { item: item }); }',
    '  if (novo < 0) novo = 0;',
    '  if (ctx.vars.existe("inv_" + item)) ctx.vars.definir("inv_" + item, novo); else ctx.vars.declarar("inv_" + item, novo);',
    '  desenhar(ctx); ctx.events.emit("inv-mudou", { item: item, qtd: novo });',
    '}',
    'function usar(ctx, item) {',
    '  var d = ITENS[item]; if (!d || qtd(ctx, item) < 1) return;',
    '  if (d.usar && d.usar.evento) ctx.events.emit(d.usar.evento, d.usar.dados || {});',
    '  if (d.consumir) mudar(ctx, item, -1);',
    '  ctx.events.emit("inv-usado", { item: item });',
    '}',
    'function iniciar(e, ctx) {',
    '  Object.keys(ITENS).forEach(function (k) { if (!ctx.vars.existe("inv_" + k)) ctx.vars.declarar("inv_" + k, ITENS[k].inicial || 0); });',
    '  desenhar(ctx); if (ligado) return; ligado = true;',
    '  ctx.events.on("inv-adicionar", function (d) { if (d) mudar(ctx, d.item, d.qtd === undefined ? 1 : d.qtd); });',
    '  ctx.events.on("inv-remover", function (d) { if (d) mudar(ctx, d.item, -(d.qtd === undefined ? 1 : d.qtd)); });',
    '  ctx.events.on("inv-usar", function (d) { if (d) usar(ctx, d.item); });',
    '  for (var i = 0; i < SLOTS; i++) (function (i) { ctx.events.on("inv-slot" + (i + 1), function () { var k = presentes(ctx)[i]; if (k) usar(ctx, k); }); })(i);',
    '}', ''
  ].join('\n');

  const VIDA = [
    '// VIDA E DANO. Edite VIDA_MAX, INVUL (segundos de invulnerabilidade após o golpe) e ALVO (nome do objeto que pisca).',
    '// Entrada: dano {qtd} · curar {qtd}. Saída: vida-mudou {vida} · morreu {}. Variáveis: vida e vida_max (use em blocos/condições).',
    '// Inimigo que machuca: no script dele, em eventos = { colisao(e, d, ctx) { ctx.events.emit("dano", { qtd: 1 }); } }.',
    'var VIDA_MAX = 5, INVUL = 1, ALVO = "jogador", BARRA = 200;',
    'var inv = 0, morto = false, ligado = false;',
    'function cena(ctx) { return ctx.engine.scene; }',
    'function def(ctx, k, v) { if (ctx.vars.existe(k)) ctx.vars.definir(k, v); else ctx.vars.declarar(k, v); }',
    'function hud(ctx) {',
    '  var v = ctx.vars.ler("vida"), f = cena(ctx).find("vida-barra"), t = cena(ctx).find("vida-texto");',
    '  if (f) { var w = Math.max(0, Math.round(BARRA * v / VIDA_MAX)); f.Sprite.w = Math.max(w, 1); f.Sprite.opacidade = w ? 1 : 0; f.Transform.x = 20 + w / 2; }',
    '  if (t) t.Sprite.rotulo = v + " / " + VIDA_MAX;',
    '}',
    'function mudar(ctx, delta) {',
    '  var v = Math.max(0, Math.min(VIDA_MAX, ctx.vars.ler("vida") + delta));',
    '  def(ctx, "vida", v); hud(ctx); ctx.events.emit("vida-mudou", { vida: v });',
    '  return v;',
    '}',
    'function iniciar(e, ctx) {',
    '  inv = 0; morto = false; def(ctx, "vida_max", VIDA_MAX); def(ctx, "vida", VIDA_MAX); hud(ctx);',
    '  if (ligado) return; ligado = true;',
    '  ctx.events.on("dano", function (d) {',
    '    if (morto || inv > 0) return;',
    '    var q = d && d.qtd !== undefined ? d.qtd : 1, v = mudar(ctx, -q), a = cena(ctx).find(ALVO);',
    '    inv = INVUL; ctx.efeitos.tremer(cena(ctx), 6, 0.25);',
    '    if (a) ctx.efeitos.particulas(cena(ctx), a.Transform.x, a.Transform.y, { n: 12, cor: "#ef4444", tamanho: 3, vel: 140, vida: 0.5 });',
    '    if (v <= 0) { morto = true; inv = 0; if (a && a.Sprite) a.Sprite.opacidade = 1; ctx.events.emit("morreu", {}); }',
    '  });',
    '  ctx.events.on("curar", function (d) { if (!morto) mudar(ctx, d && d.qtd !== undefined ? d.qtd : 1); });',
    '}',
    'function atualizar(e, dt, ctx) {',
    '  if (inv <= 0) return;',
    '  inv -= dt; var a = cena(ctx).find(ALVO);',
    '  if (a && a.Sprite) a.Sprite.opacidade = inv > 0 ? (Math.floor(inv * 10) % 2 ? 0.25 : 1) : 1;',
    '}', ''
  ].join('\n');

  const MODELOS = {
    dialogo: { rotulo: '💬 Diálogo com escolhas', ctl: 'dialogo', script: DIALOGO, objetos: () => [
      P('dialogo-caixa', 400, 385, 740, 110, 'rgba(15,23,42,.88)'), T('dialogo-nome', 60, 345, 'Nome', 18, '#fbbf24', 'left'), T('dialogo-fala', 400, 390, 'Fala do personagem', 20),
      B('dialogo-op1', 400, 250, 320, 38, 'Opção 1', 'dialogo-op1'), B('dialogo-op2', 400, 295, 320, 38, 'Opção 2', 'dialogo-op2'), B('dialogo-op3', 400, 205, 320, 38, 'Opção 3', 'dialogo-op3')] },
    inventario: { rotulo: '🎒 Inventário (slots)', ctl: 'inventario', script: INVENTARIO, objetos: () => [0, 1, 2, 3, 4, 5].map(i => B('inv-slot' + (i + 1), 52 + i * 68, 415, 62, 56, '', 'inv-slot' + (i + 1), 12))
      .map(o => { o.Sprite.cor = 'rgba(15,23,42,.6)'; o.Sprite.corSobre = '#475569'; o.Sprite.corApertado = '#1e293b'; o.Sprite.borda = '#94a3b8'; return o; }) },
    vida: { rotulo: '❤ Vida e dano', ctl: 'vida', script: VIDA, objetos: () => [
      P('vida-fundo', 120, 24, 208, 22, 'rgba(15,23,42,.8)'), Object.assign(P('vida-barra', 120, 24, 200, 14, '#ef4444', 2), {}), T('vida-texto', 120, 24, '5 / 5', 12, '#ffffff')] }
  };
  MODELOS.vida.objetos = (f => () => { const l = f(); l[1].Sprite.borda = undefined; delete l[1].Sprite.borda; delete l[1].Sprite.larguraBorda; l[2].Sprite.camada = 4; return l; })(MODELOS.vida.objetos);

  function instalar(m) {
    if (ed.engine.rodando) return msg('Pare o jogo antes de adicionar um modelo.', 'erro');
    if (cena.find(m.ctl) || (cena.estado.scripts || {})[m.ctl]) return msg('Esse modelo já está na cena (' + m.ctl + ').', 'erro');
    const lista = m.objetos(); if (lista.some(o => cena.find(o.nome))) return msg('Já existe um objeto com o nome de um item do modelo.', 'erro');
    (cena.estado.scripts || (cena.estado.scripts = {}))[m.ctl] = { fonte: m.script };
    const c = cena.create({ nome: m.ctl, Transform: { x: 0, y: 0 }, Script: { nome: m.ctl } });
    for (const o of lista) cena.create(o);
    cena.flush(); ed.selecionar(c.id); ed.json(); ed.redesenhar();
    msg('Modelo "' + m.rotulo + '" adicionado. Veja o código na aba Scripts; dê Play para testar.', 'ok');
  }
  const painel = $('mais-painel');
  const t = document.createElement('p'); t.className = 't'; t.textContent = 'Modelos de RPG:'; painel.append(t);
  for (const k of Object.keys(MODELOS)) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'm-' + k; b.textContent = MODELOS[k].rotulo; b.addEventListener('click', () => instalar(MODELOS[k])); painel.append(b);
  }
  root.EditorModelos = { definicao: k => MODELOS[k], instalar: k => instalar(MODELOS[k]), nomes: () => Object.keys(MODELOS) };
})(window);
