/* Editor · E1. Só edita a cena (JSON do motor): o motor valida tudo, o editor não tem regras próprias.
   Por quê: o editor de celular (Flutter/WebView) vai editar o MESMO formato. */
(function () {
  const C = Core, $ = id => document.getElementById(id), tela = $('tela');
  const renderer = new C.CanvasRenderer(tela, { largura: 800, altura: 450, fundo: '#2b3a4a', assets: new C.Assets() });
  const engine = new C.Engine({ renderer }), cena = engine.scene; if (C.Armazem) engine.armazem = C.Armazem.navegador('motor.partida.v1.');
  engine.events.on('erro-script', d => { const m = document.getElementById('msg'); if (m) { m.textContent = 'Erro no script "' + d.script + '" (' + d.fase + '): ' + d.mensagem; m.className = 'msg erro'; } });
  let sel = null, sujo = true, arrastando = null, salvoPlay = null, input = null, projetoAtual = null, projetos = {}, modoJogo = false, desfazerHistorico = [], refazerHistorico = [], historicoAplicando = false, historicoSuspenso = false;

  function exemplo() {
    cena.create({ nome: 'chao', Transform: { x: 400, y: 430 }, Body: { forma: 'retangulo', w: 760, h: 24, massa: 0, elasticidade: 0.4 }, Sprite: { cor: '#3f6b4a' } });
    cena.create({ nome: 'plataforma', Transform: { x: 560, y: 300 }, Body: { forma: 'retangulo', w: 180, h: 16, massa: 0 }, Sprite: { cor: '#6b4f2f' } });
    cena.create({ nome: 'jogador', Transform: { x: 180, y: 380 }, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 18, massa: 1, elasticidade: 0.2 }, Sprite: { forma: 'circulo', raio: 18, cor: '#4aa3ff' }, Controller: { aceleracao: 1500, velMax: 260 } });
    cena.create({ nome: 'bola', Transform: { x: 330, y: 200 }, Body: { forma: 'circulo', raio: 12, massa: 0.5, elasticidade: 0.8 }, Sprite: { forma: 'circulo', raio: 12, cor: '#f5a524' } });
    cena.create({ nome: 'gol', Transform: { x: 700, y: 250 }, Body: { forma: 'retangulo', w: 40, h: 90, massa: 0, sensor: true }, Sprite: { cor: 'rgba(125,220,140,.45)' } });
    engine.vars.declarar('pontos', 0); engine.vars.declarar('fase', 'Fase 1'); engine.vars.declarar('som', true);
  }
  // O renderer interpola com px/py (runtime). Parado, desenhamos sempre na posição atual.
  const sincronizar = () => { for (const e of cena.query('Transform')) { e.Transform.px = e.Transform.x; e.Transform.py = e.Transform.y; } };
  const redesenhar = () => { sujo = true; };
  function obsTexto() { const n = $('obs'); if (!n) return; const t = engine.rodando ? Object.entries(engine.observados || {}).map(([k, v]) => k + ' = ' + v).join('  ·  ') : ''; if (n.textContent !== t) n.textContent = t; n.hidden = !t; }
  function loop() { obsTexto(); if (sujo) { sujo = false; if (!engine.rodando && C.Systems.hierarquia) C.Systems.hierarquia(cena); sincronizar(); renderer.selecionada = sel; renderer.debug = $('c-col').checked; renderer.desenhar(cena, 0, engine); } requestAnimationFrame(loop); }
  new ResizeObserver(redesenhar).observe(tela);   // registrado depois do observer do renderer: ele redimensiona primeiro

  const msg = (t, tipo) => { const m = $('msg'); m.textContent = t || ''; m.className = 'msg ' + (tipo || ''); };
  const el = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; };

  const snapshot = () => JSON.stringify(C.Serializer.paraJSON(cena));
  function atualizarHistorico() { $('e-desfazer').disabled = engine.rodando || desfazerHistorico.length < 2; $('e-refazer').disabled = engine.rodando || !refazerHistorico.length; }
  function historicoLimpar() { desfazerHistorico = [snapshot()]; refazerHistorico = []; atualizarHistorico(); }
  function registrarSnapshot() {
    if (engine.rodando || historicoAplicando || historicoSuspenso) return;
    const atual = snapshot(); if (desfazerHistorico[desfazerHistorico.length - 1] === atual) return;
    desfazerHistorico.push(atual); if (desfazerHistorico.length > 50) desfazerHistorico.shift(); refazerHistorico = []; atualizarHistorico();
  }
  function restaurarSnapshot(valor) {
    historicoAplicando = true;
    let ok = false;
    try { C.Serializer.deJSON(cena, JSON.parse(valor)); ok = true; }
    catch (x) { msg('Não restaurou o histórico: ' + x.message, 'erro'); }
    if (ok) { if (!cena.get(sel)) sel = ([...cena.entities.values()].at(-1) || {}).id ?? null; selecionar(sel); variaveis(); json(false); redesenhar(); }
    historicoAplicando = false; atualizarHistorico();
  }
  function desfazer() { if (engine.rodando || arrastando || desfazerHistorico.length < 2) return; refazerHistorico.push(desfazerHistorico.pop()); restaurarSnapshot(desfazerHistorico[desfazerHistorico.length - 1]); }
  function refazer() { if (engine.rodando || arrastando || !refazerHistorico.length) return; const valor = refazerHistorico.pop(); desfazerHistorico.push(valor); restaurarSnapshot(valor); }

  const PROJETOS_KEY = 'motor.editor.projetos.v1';
  function guardarProjetos() { localStorage.setItem(PROJETOS_KEY, JSON.stringify(projetos)); }
  function lerProjetos() { try { const v = JSON.parse(localStorage.getItem(PROJETOS_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (x) { return {}; } }
  function atualizarProjetos() { const s = $('projetos'); s.innerHTML = ''; Object.keys(projetos).sort().forEach(n => { const o = el('option', null, n); o.value = n; s.append(o); }); s.value = projetoAtual || ''; $('projeto-nome').value = projetoAtual || ''; }
  function persistirAtual() { if (projetoAtual) { projetos[projetoAtual] = C.Serializer.paraJSON(cena); guardarProjetos(); } }
  function cenaVazia() { return { formato: 1, estado: { vars: {} }, entidades: [] }; }
  function abrirProjeto(nome) {
    if (!projetos[nome]) return;
    if (engine.rodando) parar();
    try { persistirAtual(); C.Serializer.deJSON(cena, JSON.parse(JSON.stringify(projetos[nome]))); projetoAtual = nome; selecionar(null); variaveis(); json(); atualizarProjetos(); historicoLimpar(); if (window.EditorCenas) EditorCenas.projeto('abriu'); msg('Projeto "' + nome + '" aberto.', 'ok'); } catch (x) { msg('Não abriu o projeto: ' + x.message, 'erro'); }
  }
  function criarProjeto() { const nome = $('projeto-nome').value.trim(); if (!nome) return msg('Dê um nome ao projeto.', 'erro'); if (projetos[nome]) return msg('Já existe um projeto com esse nome.', 'erro'); if (engine.rodando) parar(); persistirAtual(); projetos[nome] = cenaVazia(); guardarProjetos(); abrirProjeto(nome); }
  function renomearProjeto() { const nome = $('projeto-nome').value.trim(); if (!projetoAtual || !nome) return msg('Dê um nome ao projeto.', 'erro'); if (nome !== projetoAtual && projetos[nome]) return msg('Já existe um projeto com esse nome.', 'erro'); if (nome === projetoAtual) return; persistirAtual(); projetos[nome] = projetos[projetoAtual]; delete projetos[projetoAtual]; if (window.EditorCenas) EditorCenas.projeto('renomeou', projetoAtual, nome); projetoAtual = nome; guardarProjetos(); atualizarProjetos(); msg('Projeto renomeado.', 'ok'); }
  function apagarProjeto() { const alvo = $('projetos').value || projetoAtual; if (!alvo) return; if (Object.keys(projetos).length < 2) return msg('Mantenha pelo menos um projeto.', 'erro'); if (!window.confirm('Apagar o projeto "' + alvo + '"?')) return; delete projetos[alvo]; if (window.EditorCenas) EditorCenas.projeto('apagou', alvo); guardarProjetos(); if (alvo === projetoAtual) { historicoLimpar(); abrirProjeto(Object.keys(projetos).sort()[0]); } else { atualizarProjetos(); msg('Projeto apagado.', 'ok'); } }
  function inicializarProjetos() { projetos = lerProjetos(); const nomes = Object.keys(projetos).sort(); if (!nomes.length) { projetoAtual = 'Exemplo'; projetos[projetoAtual] = C.Serializer.paraJSON(cena); guardarProjetos(); } else abrirProjeto(nomes[0]); atualizarProjetos(); }

  // ---- lista de objetos
  $('lista').addEventListener('dragover', ev => { if ([...ev.dataTransfer.types].includes('text/x-motor-id')) ev.preventDefault(); });
  $('lista').addEventListener('drop', ev => { const id = Number(ev.dataTransfer.getData('text/x-motor-id')); if (!id && id !== 0) return; ev.preventDefault(); if (cena.get(id) && cena.get(id).Pai) { cena.soltar(cena.get(id)); msg('Objeto solto do pai.', 'ok'); listar(); props(); redesenhar(); json(); registrarSnapshot(); } });
  function listar() {
    const ul = $('lista'); ul.innerHTML = ''; const todos = [...cena.entities.values()];
    $('n-obj').textContent = '(' + todos.length + ')';
    const ordem = [], visita = (e, d) => { ordem.push([e, d]); for (const f of todos) if (f.Pai && f.Pai.id === e.id && d < 20) visita(f, d + 1); };
    for (const e of todos) if (!e.Pai || !cena.get(e.Pai.id)) visita(e, 0);   // raízes primeiro; filhos logo abaixo do pai, com recuo
    for (const [e, prof] of ordem) {
      const li = el('li'), b = el('button'); b.type = 'button'; b.style.paddingLeft = (0.6 + prof * 1.1) + 'rem'; b.append(el('span', null, (prof ? '↳ ' : '') + (e.nome || 'sem nome')), el('i', null, '#' + e.id));
      if (e.id === sel) b.setAttribute('aria-current', 'true'); b.addEventListener('click', () => selecionar(e.id)); b.draggable = !engine.rodando; b.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/x-motor-id', String(e.id)); ev.dataTransfer.effectAllowed = 'move'; });
      li.addEventListener('dragover', ev => { if ([...ev.dataTransfer.types].includes('text/x-motor-id')) { ev.preventDefault(); li.classList.add('alvo'); } }); li.addEventListener('dragleave', () => li.classList.remove('alvo'));
      li.addEventListener('drop', ev => { li.classList.remove('alvo'); const id = Number(ev.dataTransfer.getData('text/x-motor-id')); if (!ev.dataTransfer.types.includes('text/x-motor-id')) return; ev.preventDefault(); ev.stopPropagation(); if (id === e.id) return; if (!cena.get(id) || !cena.adotar(cena.get(id), e)) return msg('Não dá para usar esse objeto como pai (ciclo).', 'erro'); msg('"' + (cena.get(id).nome || id) + '" agora é filho de "' + (e.nome || e.id) + '".', 'ok'); listar(); props(); redesenhar(); json(); registrarSnapshot(); });
      li.append(b); ul.append(li);
    }
  }
  function atualizarAcoes() { const tem = sel != null && !!cena.get(sel); $('e-duplicar').disabled = !tem || engine.rodando; $('e-remover').disabled = !tem || engine.rodando; $('e-criar').disabled = engine.rodando; $('e-play').disabled = engine.rodando; $('e-parar').disabled = !engine.rodando; atualizarHistorico(); }
  function selecionar(id) { sel = id != null && cena.get(id) ? id : null; listar(); props(); redesenhar(); atualizarAcoes(); if (window.editor && window.editor.aoSelecionar) window.editor.aoSelecionar(); }
  function nomeLivre(base) { let nome = base, n = 2; while (cena.find(nome)) nome = base + ' ' + n++; return nome; }
  function criar() { const e = cena.create({ nome: nomeLivre('objeto'), Transform: { x: 400, y: 225 }, Body: { forma: 'circulo', raio: 18, massa: 1, elasticidade: 0.4 }, Sprite: { forma: 'circulo', raio: 18, cor: '#a78bfa' } }); selecionar(e.id); msg('Objeto criado.', 'ok'); json(); }
  function criarTexto() { const e = cena.create({ nome: nomeLivre('texto'), Transform: { x: 20, y: 20 }, Sprite: { fixo: true, rotulo: 'Texto', corTexto: '#ffffff', tamanhoTexto: 24, alinhar: 'center', fonte: 'system-ui' } }); selecionar(e.id); msg('Texto criado.', 'ok'); json(); }
  function criarBotao() { const e = cena.create({ nome: nomeLivre('botao'), Transform: { x: 400, y: 225 }, Sprite: { fixo: true, forma: 'retangulo', w: 160, h: 48, rotulo: 'Botão', cor: '#2563eb', corSobre: '#3b82f6', corApertado: '#1d4ed8', borda: '#93c5fd', larguraBorda: 2, arredondar: 10, sombra: true, corTexto: '#ffffff', tamanhoTexto: 18, alinhar: 'center', fonte: 'system-ui' }, Botao: { acao: {} } }); selecionar(e.id); msg('Botão criado.', 'ok'); json(); }
  function duplicar() { const e = cena.get(sel); if (!e) return; const d = JSON.parse(JSON.stringify(e)); delete d.id; d.nome = nomeLivre((e.nome || 'objeto') + ' cópia'); d.Transform.x += 24; d.Transform.y += 24; const novo = cena.create(d); selecionar(novo.id); msg('Objeto duplicado.', 'ok'); json(); }
  function remover() { if (sel == null || !cena.get(sel)) return; cena.destroy(sel); cena.flush(); sel = null; listar(); props(); redesenhar(); atualizarAcoes(); msg('Objeto removido.', 'ok'); json(); }
  // Qualidade gráfica: compat = Canvas 2D; graficos = WebGL (PixiJS, carrega sob demanda); simples = Canvas 2D sem sombras e sem alta resolução.
  let gl = null, ativo = renderer, glTentou = false; const selR = $('e-render');
  try { const q = new URLSearchParams(location.search).get('render') || localStorage.getItem('motor.render'); if (q && [...selR.options].some(o => o.value === q)) selR.value = q; } catch (x) {}
  selR.addEventListener('change', () => { try { localStorage.setItem('motor.render', selR.value); } catch (x) {} });
  async function escolherRender() {
    const q = selR.value; renderer.simples = q === 'simples'; ativo = renderer;
    if (q === 'graficos') {
      if (!gl && !glTentou) { glTentou = true; msg('Carregando WebGL…', 'ok'); gl = await C.PixiRenderer.criar(tela, { largura: renderer.largura, altura: renderer.altura, fundo: renderer.fundo, assets: renderer.assets }); }
      if (gl) { gl.assets = renderer.assets; gl.largura = renderer.largura; gl.altura = renderer.altura; gl.fundo = renderer.fundo; gl.debug = renderer.debug; ativo = gl; gl.redimensionar(); gl.ligar(true); }
      else msg('WebGL indisponível neste aparelho: usando Canvas 2D.', 'erro');
    }
    engine.renderer = ativo; renderer.redimensionar();
  }
  async function play() { if (engine.rodando) return; await escolherRender(); playAgora(); }
  function playAgora() { if (window.EditorVista) EditorVista.suspender(true); historicoSuspenso = true; salvoPlay = JSON.stringify(C.Serializer.paraJSON(cena)); input = new Core.Input(tela, ativo); engine.input = input; engine.audio = Core.Audio ? new Core.Audio() : null; if (engine.audio && cena.estado.sons) engine.audio.carregar(cena.estado.sons).catch(() => {}); if (window.EditorCenas) EditorCenas.registrar(engine); engine.iniciar(); atualizarAcoes(); msg('Motor em execução.', 'ok'); }
  function parar() { engine.parar(); if (gl) gl.ligar(false); ativo = renderer; engine.renderer = renderer; renderer.simples = false; renderer.redimensionar(); if (engine.audio && engine.audio.pararTudo) engine.audio.pararTudo(); engine.audio = null; if (input) { input.destruir(); input = null; engine.input = null; } if (salvoPlay) { try { C.Serializer.deJSON(cena, JSON.parse(salvoPlay)); } catch (x) { msg('Não restaurou a cena: ' + x.message, 'erro'); } salvoPlay = null; selecionar(sel); variaveis(); json(false); redesenhar(); } if (window.EditorVista) EditorVista.suspender(false); historicoSuspenso = false; if (modoJogo) { modoJogo = false; document.body.classList.remove('modo-jogo'); $('e-jogar').textContent = 'Tela cheia'; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } atualizarAcoes(); msg('Motor parado.', 'ok'); }
  function jogar() { if (modoJogo) return parar(); persistirAtual(); modoJogo = true; document.body.classList.add('modo-jogo'); $('e-jogar').textContent = 'Sair'; play(); if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); }

  // ---- propriedades (só mostra o que a entidade já tem)
  const CAMPOS = {
    Transform: [['x', 'num'], ['y', 'num']],
    Body: [['forma', 'sel', ['circulo', 'retangulo']], ['raio', 'num'], ['w', 'num'], ['h', 'num'], ['massa', 'num'], ['elasticidade', 'num'], ['amortecimento', 'num'], ['sensor', 'bool']],
    Sprite: [['forma', 'sel', ['retangulo', 'circulo']], ['cor', 'cor'], ['corSobre', 'cor'], ['corApertado', 'cor'], ['borda', 'cor'], ['larguraBorda', 'num'], ['arredondar', 'num'], ['sombra', 'bool'], ['w', 'num'], ['h', 'num'], ['raio', 'num'], ['rotulo', 'txt'], ['tamanhoTexto', 'num'], ['corTexto', 'cor'], ['alinhar', 'sel', ['left', 'center', 'right']], ['fonte', 'txt'], ['fixo', 'bool'], ['imagem', 'txt'], ['quadroW', 'num'], ['quadroH', 'num'], ['escala', 'num'], ['espelhar', 'bool']],
    Controller: [['aceleracao', 'num'], ['velMax', 'num']]
  };
  function campo(rotulo, entrada) { const d = el('div', 'campo'), l = el('label', null, rotulo); entrada.id = 'f-' + rotulo + Math.random().toString(36).slice(2, 6); l.htmlFor = entrada.id; d.append(l, entrada); return d; }
  function props() {
    const box = $('props'); box.innerHTML = ''; const e = cena.get(sel);
    if (!e) { box.append(el('div', 'vazio', 'Nenhum objeto selecionado.')); return; }
    const nome = el('input'); nome.value = e.nome; nome.addEventListener('change', () => aplicar(null, 'nome', nome.value)); box.append(campo('nome', nome));
    for (const comp in CAMPOS) {
      if (!e[comp]) continue; const g = el('div', 'grupo'), cab = el('div', 'cab-comp'); cab.append(el('b', null, comp));
      if (comp !== 'Transform') { const rm = el('button', 'mini', '✕'); rm.type = 'button'; rm.title = 'Remover ' + comp; rm.setAttribute('aria-label', 'Remover o componente ' + comp); rm.addEventListener('click', () => definir(comp, undefined)); cab.append(rm); }
      g.append(cab);
      for (const [k, tipo, op] of CAMPOS[comp]) {
        if (!(k in e[comp])) continue; const v = e[comp][k]; let i;
        if (tipo === 'sel') { i = el('select'); for (const o of op) { const x = el('option', null, o); x.value = o; i.append(x); } i.value = v; }
        else if (tipo === 'bool') { i = el('input'); i.type = 'checkbox'; i.checked = !!v; i.style.width = 'auto'; }
        else if (tipo === 'txt') { i = el('input'); i.value = v; }
        else if (tipo === 'cor') { i = el('input'); if (/^#[0-9a-f]{6}$/i.test(v)) i.type = 'color'; i.value = v; }
        else { i = el('input'); i.type = 'number'; i.step = 'any'; i.value = v; }
        i.addEventListener('change', () => aplicar(comp, k, tipo === 'num' ? (i.value === '' ? NaN : +i.value) : tipo === 'bool' ? i.checked : i.value));
        g.append(campo(k, i));
      }
      box.append(g);
    }
    const falta = COMPONENTES.filter(([, mud]) => Object.keys(mud).some(k => !e[k]));
    if (falta.length) {
      const add = el('select'); add.setAttribute('aria-label', 'Adicionar componente'); add.append(new Option('+ componente…', ''));
      for (const [rot] of falta) add.append(new Option(rot, rot));
      add.addEventListener('change', () => { const it = COMPONENTES.find(c => c[0] === add.value); if (it) adicionar(it[1]); });
      box.append(add);
    }
    const pai = el('select'); pai.setAttribute('aria-label', 'Pai do objeto'); pai.append(new Option('(sem pai)', ''));
    for (const o of cena.entities.values()) if (o !== e && !cena.descendeDe(o, e)) pai.append(new Option((o.nome || 'sem nome') + ' #' + o.id, String(o.id)));
    pai.value = e.Pai ? String(e.Pai.id) : '';
    pai.addEventListener('change', () => { if (pai.value === '') cena.soltar(e); else if (!cena.adotar(e, cena.get(Number(pai.value)))) { msg('Não dá para usar esse objeto como pai.', 'erro'); return props(); } msg('', ''); listar(); props(); redesenhar(); json(); registrarSnapshot(); });
    if (window.EditorInspetorScript) EditorInspetorScript.montar(box, e); if (window.EditorTiles) EditorTiles.montar(box, e);
    const m = el('div', 'grupo'); m.append(el('b', null, 'Marcas'));
    const et = el('input'); et.value = (e.Etiquetas || []).join(', '); et.placeholder = 'inimigo, moeda'; et.addEventListener('change', () => definir('Etiquetas', et.value.split(',').map(x => x.trim()).filter(Boolean)));
    const at = el('input'); at.value = Object.entries(e.Attr || {}).map(([k, v]) => k + '=' + v).join(', '); at.placeholder = 'vida=3, nome=Zé';
    at.addEventListener('change', () => {
      const o = {};
      try { for (const p of at.value.split(',').map(x => x.trim()).filter(Boolean)) { const i = p.indexOf('='); if (i < 1) throw new Error('Atributos: use nome=valor, separados por vírgula.'); const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); o[k] = v !== '' && isFinite(+v) ? +v : v === 'verdadeiro' ? true : v === 'falso' ? false : v; } } catch (x) { msg(x.message, 'erro'); props(); return; }
      definir('Attr', o);
    });
    const mo = el('input'); mo.type = 'checkbox'; mo.checked = e.Modelo !== undefined; mo.style.width = 'auto'; mo.addEventListener('change', () => definir('Modelo', mo.checked ? {} : undefined));
    m.append(campo('pai', pai), campo('etiquetas', et), campo('atributos', at), campo('modelo (só molde)', mo)); box.append(m);
  }
  // Componentes que dá para adicionar pelo painel (o motor valida tudo antes de aceitar).
  const BODY = { massa: 1, elasticidade: 0, amortecimento: 0 };
  const COMPONENTES = [
    ['Colisão retangular (hitbox)', { Body: Object.assign({ forma: 'retangulo', w: 32, h: 32 }, BODY), Velocity: { vx: 0, vy: 0 } }],
    ['Colisão circular (hitbox)', { Body: Object.assign({ forma: 'circulo', raio: 16 }, BODY), Velocity: { vx: 0, vy: 0 } }],
    ['Parede (colisão parada)', { Body: { forma: 'retangulo', w: 64, h: 16, massa: 0, elasticidade: 0.3 } }],
    ['Andar com as setas', { Controller: { aceleracao: 1800, velMax: 280 }, Velocity: { vx: 0, vy: 0 } }],
    ['Aparência (Sprite)', { Sprite: { forma: 'retangulo', w: 32, h: 32, cor: '#4af' } }],
    ['Botão (clicável)', { Botao: { acao: {} } }]
  ];
  function adicionar(mud) {
    const e = cena.get(sel); if (!e) return; const copia = JSON.parse(JSON.stringify(e));
    for (const k in mud) if (!copia[k]) copia[k] = JSON.parse(JSON.stringify(mud[k]));
    try { new C.Scene().create(copia); } catch (x) { msg(x.message, 'erro'); props(); return; }
    for (const k in mud) if (!e[k]) e[k] = JSON.parse(JSON.stringify(mud[k]));
    msg('', ''); listar(); props(); redesenhar(); json();
  }
  // Troca um componente inteiro (ou remove, se vazio/undefined); o motor valida numa cópia antes.
  function definir(comp, valor) {
    const e = cena.get(sel); if (!e) return; const copia = JSON.parse(JSON.stringify(e)), vazio = valor === undefined || (Array.isArray(valor) && !valor.length) || (comp === 'Attr' && !Object.keys(valor).length);
    if (vazio) delete copia[comp]; else copia[comp] = valor;
    try { new C.Scene().create(copia); } catch (x) { msg(x.message, 'erro'); props(); return; }
    if (vazio) delete e[comp]; else e[comp] = valor;
    msg('', ''); listar(); props(); redesenhar(); json();
  }
  // Valida com o próprio motor numa cópia; só aplica se o motor aceitar.
  // Filho: mexer na posição dele muda o deslocamento em relação ao pai (o pai mexendo leva os filhos junto).
  function ajustarDeslocamento(h) { const p = h.Pai && cena.get(h.Pai.id); if (p && p.Transform) { h.Pai.dx = h.Transform.x - p.Transform.x; h.Pai.dy = h.Transform.y - p.Transform.y; } }
  function aplicar(comp, k, valor) {
    const e = cena.get(sel); if (!e) return; const copia = JSON.parse(JSON.stringify(e));
    if (comp) copia[comp][k] = valor; else copia[k] = valor;
    try { new C.Scene().create(copia); } catch (x) { msg(x.message, 'erro'); props(); return; }
    if (comp) e[comp][k] = valor; else e[k] = valor;
    if (comp === 'Transform') ajustarDeslocamento(e);
    msg('', ''); listar(); props(); redesenhar(); json();
  }

  // ---- variáveis
  function variaveis() {
    const box = $('vars'); box.innerHTML = ''; const v = engine.vars, todas = v.todas(), nomes = Object.keys(todas);
    $('n-var').textContent = '(' + nomes.length + ')'; if (!nomes.length) box.append(el('div', 'vazio', 'Nenhuma variável.'));
    for (const n of nomes) {
      const t = v.tipo(n), l = el('div', 'var'), nm = el('span', null, n), i = el('input');
      nm.append(el('small', null, ' ' + t)); nm.title = n;
      if (t === 'booleano') { i.type = 'checkbox'; i.checked = todas[n]; i.style.width = 'auto'; } else if (t === 'numero') { i.type = 'number'; i.step = 'any'; i.value = todas[n]; } else i.value = todas[n];
      i.setAttribute('aria-label', 'Valor de ' + n);
      i.addEventListener('change', () => { try { v.definir(n, t === 'booleano' ? i.checked : t === 'numero' ? (i.value === '' ? NaN : +i.value) : i.value); msg('', ''); } catch (x) { msg(x.message, 'erro'); } variaveis(); json(); });
      const rm = el('button', null, '✕'); rm.type = 'button'; rm.title = 'Remover ' + n; rm.setAttribute('aria-label', 'Remover ' + n); rm.addEventListener('click', () => { v.remover(n); variaveis(); json(); });
      l.append(nm, i, rm); box.append(l);
    }
  }
  $('nova-var').addEventListener('submit', ev => {
    ev.preventDefault(); const nome = $('nv-nome').value.trim(), t = $('nv-tipo').value, bruto = $('nv-val').value;
    const val = t === 'numero' ? (bruto === '' ? 0 : +bruto) : t === 'booleano' ? /^(1|true|sim|verdadeiro)$/i.test(bruto) : bruto;
    try { engine.vars.declarar(nome, val); $('nv-nome').value = ''; $('nv-val').value = ''; msg('Variável "' + nome + '" criada.', 'ok'); variaveis(); json(); } catch (x) { msg(x.message, 'erro'); }
  });

  // ---- JSON da cena (salvar/abrir sem arquivo; o motor carrega de forma transacional)
  function json(registrar = true) { $('json').value = JSON.stringify(C.Serializer.paraJSON(cena), null, 1); persistirAtual(); if (window.EditorCamera) EditorCamera.atualizar(); if (registrar) registrarSnapshot(); }
  $('j-ler').addEventListener('click', () => { json(); msg('JSON atualizado.', 'ok'); });
  $('j-aplicar').addEventListener('click', () => {
    try { C.Serializer.deJSON(cena, JSON.parse($('json').value)); msg('Cena carregada.', 'ok'); } catch (x) { msg('Não carregou (a cena atual foi mantida): ' + x.message, 'erro'); return; }
    selecionar(sel); variaveis(); redesenhar(); json();
  });
  $('e-criar').addEventListener('click', criar); $('e-texto').addEventListener('click', criarTexto); $('e-botao').addEventListener('click', criarBotao); $('e-duplicar').addEventListener('click', duplicar); $('e-remover').addEventListener('click', remover);
  $('e-play').addEventListener('click', jogar); $('e-parar').addEventListener('click', parar); $('e-jogar').addEventListener('click', jogar); $('e-sair-jogar').addEventListener('click', parar); $('e-desfazer').addEventListener('click', desfazer); $('e-refazer').addEventListener('click', refazer);
  document.addEventListener('keydown', ev => { if (!ev.ctrlKey && !ev.metaKey || ev.target.closest?.('input,textarea') || ev.target.matches('select') || ev.target.isContentEditable) return; if (ev.key.toLowerCase() === 'z' && !ev.shiftKey) { ev.preventDefault(); desfazer(); } else if (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey)) { ev.preventDefault(); refazer(); } });
  // Exemplo pronto vira um projeto novo (nunca sobrescreve o seu).
  $('p-exemplo').addEventListener('click', () => {
    if (engine.rodando) parar(); const base = 'Pega-moedas'; let nome = base, i = 2; while (projetos[nome]) nome = base + ' ' + i++;
    projetos[nome] = EditorExemplos.pegaMoedas(); guardarProjetos(); abrirProjeto(nome);
  });
  $('projeto-criar').addEventListener('click', criarProjeto); $('projeto-abrir').addEventListener('click', () => abrirProjeto($('projetos').value)); $('projeto-renomear').addEventListener('click', renomearProjeto); $('projeto-apagar').addEventListener('click', apagarProjeto);
  document.addEventListener('fullscreenchange', () => { if (modoJogo && !document.fullscreenElement) parar(); });

  // ---- seleção e cursor no canvas
  function mundo(ev) { const b = tela.getBoundingClientRect(); return renderer.telaParaMundo(ev.clientX - b.left, ev.clientY - b.top); }
  function escolher(x, y) {
    let melhor = null, area = Infinity;
    for (const e of cena.entities.values()) {
      if (!e.Transform || (!e.Sprite && !e.Body)) continue; const l = C.CanvasRenderer.limitesDe(e);
      if (Math.abs(x - e.Transform.x - l.ox) <= l.hw && Math.abs(y - e.Transform.y - l.oy) <= l.hh && l.hw * l.hh < area) { area = l.hw * l.hh; melhor = e; }
    }
    return melhor;
  }
  tela.addEventListener('click', ev => { if (arrastando || engine.rodando) return; /* durante o Play o editor é só leitura */ const w = mundo(ev), h = escolher(w.x, w.y); selecionar(h ? h.id : null); });
  tela.addEventListener('pointerdown', ev => { if (engine.rodando) return; const w = mundo(ev), h = escolher(w.x, w.y); if (!h) return; selecionar(h.id); arrastando = { id: h.id, dx: w.x - h.Transform.x, dy: w.y - h.Transform.y, mudou: false }; tela.setPointerCapture(ev.pointerId); ev.preventDefault(); });
  tela.addEventListener('pointermove', ev => { const w = mundo(ev), h = arrastando && cena.get(arrastando.id); if (h) { h.Transform.x = w.x - arrastando.dx; h.Transform.y = w.y - arrastando.dy; ajustarDeslocamento(h); arrastando.mudou = true; props(); json(false); redesenhar(); } const sob = escolher(w.x, w.y); $('status').textContent = 'x ' + Math.round(w.x) + ' · y ' + Math.round(w.y) + (sob ? ' · ' + (sob.nome || 'sem nome') + ' #' + sob.id : ''); });
  tela.addEventListener('pointerup', () => { if (arrastando && arrastando.mudou) registrarSnapshot(); arrastando = null; });
  $('c-col').addEventListener('change', redesenhar);

  exemplo(); listar(); props(); variaveis(); json();
  function importarProjeto(nome, viva, todas) { if (engine.rodando) parar(); projetos[nome] = viva; if (window.EditorCenas && EditorCenas.importar) EditorCenas.importar(nome, todas); guardarProjetos(); abrirProjeto(nome); }
  window.editor = { play, parar, jogar, carregarCena(j) { if (engine.rodando) parar(); C.Serializer.deJSON(cena, JSON.parse(JSON.stringify(j))); selecionar(null); variaveis(); json(); historicoLimpar(); persistirAtual(); }, importarProjeto, persistir: persistirAtual, engine, renderer, cena, selecionar, aplicar, escolher, mundo, redesenhar, json, aoSelecionar: null, get sel() { return sel; }, get projetoAtual() { return projetoAtual; } };
  inicializarProjetos(); historicoLimpar(); loop();
})();
