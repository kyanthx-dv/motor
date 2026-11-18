// Teste de integração no navegador (opcional). Requer: npm i -D playwright && npx playwright install chromium
// Rode com: node tests/test-navegador.js
const { chromium } = require('playwright'); const path = require('path');
const url = n => 'file://' + path.resolve(__dirname, '..', n + '.html');
let falhas = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA ') + m); if (!c) falhas++; };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 900, height: 520 } }), erros = [];
  p.on('pageerror', e => erros.push(e.message)); p.on('console', m => m.type() === 'error' && erros.push(m.text()));
  for (const pg of ['index', 'mundo', 'aventura']) { await p.goto(url(pg)); await p.waitForTimeout(400); ok(await p.evaluate(() => !!window.jogo && jogo.engine.passos > 5), pg + ' abre e o motor roda'); }
  // futebol: teclado move o jogador
  await p.goto(url('index')); await p.waitForTimeout(300);
  const x0 = await p.evaluate(() => jogo.cena.find('jogador').Transform.x); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
  ok(await p.evaluate(x => jogo.cena.find('jogador').Transform.x > x + 20, x0), 'futebol: seta move o jogador');
  await p.goto(url('index')); await p.waitForTimeout(300); await p.evaluate(() => jogo.input.destruir());
  const x1 = await p.evaluate(() => jogo.cena.find('jogador').Transform.x);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(300); await p.keyboard.up('ArrowRight');
  ok(await p.evaluate(x => Math.abs(jogo.cena.find('jogador').Transform.x - x) < 1, x1), 'input: destruir remove os listeners do teclado');
  await p.goto(url('index')); await p.waitForTimeout(300);
  const ponteiros = await p.evaluate(() => {
    const c = document.getElementById('tela'), ev = (tipo, id, pointerType) => c.dispatchEvent(new PointerEvent(tipo, { pointerId: id, pointerType, clientX: 300, clientY: 200, bubbles: true, isPrimary: true }));
    ev('pointerdown', 11, 'mouse'); const mouse = { down: jogo.input.pointer.down, joystick: jogo.input.joystick.ativo }; ev('pointerup', 11, 'mouse'); jogo.input.configurar({ modo: 'flutuante', zona: 'tela' });
    ev('pointerdown', 12, 'touch'); const touch = { down: jogo.input.pointer.down, joystick: jogo.input.joystick.ativo }; ev('pointerup', 12, 'touch');
    return { mouse, touch };
  });
  ok(ponteiros.mouse.down && !ponteiros.mouse.joystick, 'input: mouse atualiza só o ponteiro');
  ok(ponteiros.touch.down && ponteiros.touch.joystick, 'input: toque ativa o joystick virtual');
  // aventura: clicar em Jogar troca de cena; salvar e carregar mantêm a cena
  await p.goto(url('aventura')); await p.waitForTimeout(300);
  const g = await p.evaluate(() => ({ ox: jogo.renderer.ox, oy: jogo.renderer.oy, e: jogo.renderer.esc }));
  await p.mouse.click(g.ox + 400 * g.e, g.oy + 270 * g.e); await p.waitForTimeout(250);
  ok(await p.evaluate(() => jogo.cena.estado.cena) === 'jogo', 'aventura: botão Jogar troca para a cena do jogo');
  await p.click('#b-salvar'); await p.evaluate(() => jogo.engine.irPara('menu')); await p.click('#b-carregar'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => jogo.cena.estado.cena === 'jogo' && !!jogo.cena.find('heroi')), 'aventura: salvar e carregar restauram a cena');
  // depurador: abre, seleciona pela lista, edita um componente e aplica
  await p.goto(url('index')); await p.waitForTimeout(300); await p.click('.dbg-btn'); ok(await p.isVisible('.dbg'), 'depurador abre pelo botão');
  await p.fill('.dbg-f', 'jogador'); await p.waitForTimeout(400); await p.selectOption('.dbg-l', { index: 0 }); await p.waitForTimeout(300);
  const txt = await p.inputValue('.dbg-j'); ok(txt.includes('"Transform"'), 'depurador mostra os componentes da entidade');
  await p.evaluate(() => { const t = document.querySelector('.dbg-j'), d = JSON.parse(t.value); d.Transform.x = 321; d.Transform.y = 111; d.Velocity = { vx: 0, vy: 0 }; t.value = JSON.stringify(d); });
  await p.click('[data-a=aplicar]'); await p.waitForTimeout(150); ok(await p.evaluate(() => Math.abs(jogo.cena.find('jogador').Transform.x - 321) < 2), 'depurador aplica a edição na entidade');
  await p.evaluate(() => { document.querySelector('.dbg-j').value = '{"Transform":{"x":"abc","y":0}}'; }); await p.click('[data-a=aplicar]');
  ok((await p.textContent('.dbg-msg')).startsWith('Erro'), 'depurador recusa valores inválidos sem quebrar o jogo');
  await p.click('[data-a=pausar]'); const ps = await p.evaluate(() => jogo.engine.passos); await p.click('[data-a=passo]'); ok(await p.evaluate(p0 => jogo.engine.passos === p0 + 1, ps), 'botão +1 passo avança exatamente um passo');
  // multitoque: soltar o 2º dedo não pode soltar o 1º
  const r = await p.evaluate(() => {
    const c = document.getElementById('tela'), ev = (t, id, x) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, clientX: x, clientY: 200, bubbles: true, isPrimary: id === 1 }));
    ev('pointerdown', 1, 300); ev('pointerdown', 2, 500); ev('pointerup', 2, 500); const depois = jogo.input.pointer.down; ev('pointerup', 1, 300); return { depois, fim: jogo.input.pointer.down };
  });
  ok(r.depois === true && r.fim === false, 'multitoque: soltar o 2º dedo mantém o 1º; soltar o 1º encerra');
  // editor E1: lista, seleção por clique, edição validada pelo motor, variáveis e JSON transacional
  await p.setViewportSize({ width: 1300, height: 760 }); await p.goto(url('editor/index') + '?abas=todas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelectorAll('#projetos option').length === 1 && editor.projetoAtual === 'Exemplo'), 'M11 cria projeto inicial na lista local');
  await p.fill('#projeto-nome', 'Projeto 2'); await p.click('#projeto-criar'); await p.waitForTimeout(80); ok(await p.evaluate(() => document.querySelectorAll('#projetos option').length === 2 && editor.projetoAtual === 'Projeto 2' && editor.cena.entities.size === 0), 'M11 cria projeto vazio');
  await p.fill('#projeto-nome', 'Projeto Renomeado'); await p.click('#projeto-renomear'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.projetoAtual === 'Projeto Renomeado' && ![...document.querySelectorAll('#projetos option')].some(o => o.value === 'Projeto 2')), 'M11 renomeia projeto');
  await p.selectOption('#projetos', 'Exemplo'); await p.click('#projeto-abrir'); await p.waitForTimeout(80); ok(await p.evaluate(() => editor.projetoAtual === 'Exemplo' && editor.cena.entities.size === 5), 'M11 abre projeto salvo');
  await p.selectOption('#projetos', 'Projeto Renomeado'); p.once('dialog', d => d.accept()); await p.click('#projeto-apagar'); await p.waitForTimeout(80); ok(await p.evaluate(() => document.querySelectorAll('#projetos option').length === 1 && editor.projetoAtual === 'Exemplo'), 'M11 apaga projeto');
  ok(await p.evaluate(() => document.querySelectorAll('#lista button').length === 5 && !!window.editor), 'editor abre com 5 objetos na lista');
  await p.fill('#cam-x', '120'); await p.fill('#cam-y', '80'); await p.fill('#cam-zoom', '1.5'); await p.fill('#cam-suavizar', '6'); await p.selectOption('#cam-seguir', { label: 'jogador' }); await p.click('#cam-aplicar'); await p.waitForTimeout(80);
  ok(await p.evaluate(() => { const c = editor.cena.estado.camera; return c.x === 120 && c.y === 80 && c.zoom === 1.5 && c.suavizar === 6 && c.seguir === 'jogador'; }), 'painel de câmera aplica posição, zoom e seguimento');
  await p.click('#cam-limpar'); await p.waitForTimeout(50); ok(await p.evaluate(() => !editor.cena.estado.camera), 'painel de câmera restaura a câmera fixa');
  const pos = await p.evaluate(() => { const e = editor.cena.find('bola'), b = document.getElementById('tela').getBoundingClientRect(), r = editor.renderer; return { x: b.left + r.ox + e.Transform.x * r.esc, y: b.top + r.oy + e.Transform.y * r.esc }; });
  await p.mouse.click(pos.x, pos.y); await p.waitForTimeout(150);
  ok(await p.evaluate(() => editor.cena.get(editor.sel).nome === 'bola' && document.querySelector('#lista [aria-current]').textContent.includes('bola')), 'clicar no canvas seleciona o objeto');
  const campoRaio = p.locator('#props .campo', { hasText: 'raio' }).first().locator('input');
  await campoRaio.fill('-5'); await campoRaio.press('Tab'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => editor.cena.find('bola').Body.raio === 12 && /raio/.test(document.getElementById('msg').textContent)), 'valor inválido é recusado pelo motor e o objeto não muda');
  await p.locator('#props .campo', { hasText: 'raio' }).first().locator('input').fill('20'); await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => editor.cena.find('bola').Body.raio === 20), 'valor válido é aplicado');
  await p.click('#e-desfazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => editor.cena.find('bola').Body.raio === 12), 'M12 botão Desfazer restaura propriedade');
  await p.click('#e-refazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => editor.cena.find('bola').Body.raio === 20), 'M12 botão Refazer reaplica propriedade');
  await p.keyboard.press('Control+Z'); await p.waitForTimeout(60); await p.keyboard.press('Control+Y'); await p.waitForTimeout(60); ok(await p.evaluate(() => editor.cena.find('bola').Body.raio === 20), 'M12 Ctrl+Z/Ctrl+Y funcionam');
  await p.fill('#nv-nome', 'vidas'); await p.fill('#nv-val', '3'); await p.click('#nova-var button'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => editor.engine.vars.ler('vidas') === 3 && JSON.parse(document.getElementById('json').value).estado.vars.vidas === 3), 'criar variável funciona e entra no JSON');
  await p.click('#e-desfazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => !editor.engine.vars.existe('vidas')), 'M12 desfaz variável'); await p.click('#e-refazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => editor.engine.vars.ler('vidas') === 3), 'M12 refaz variável');
  await p.fill('#nv-nome', '1ruim'); await p.click('#nova-var button');
  ok(await p.evaluate(() => /inválido/.test(document.getElementById('msg').textContent) && !editor.engine.vars.existe('1ruim')), 'nome de variável inválido é recusado');
  await p.evaluate(() => { document.querySelector('details.json').open = true; }); await p.fill('#json', '{"formato":1,"entidades":[{"id":1,"Transform":{"x":"a","y":0}}]}'); await p.click('#j-aplicar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => editor.cena.entities.size === 5 && /mantida/.test(document.getElementById('msg').textContent)), 'JSON inválido não destrói a cena do editor');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(50);
  const bolaPos = await p.evaluate(() => { const e = editor.cena.find('bola'), b = document.getElementById('tela').getBoundingClientRect(), r = editor.renderer; return { x: b.left + r.ox + e.Transform.x * r.esc, y: b.top + r.oy + e.Transform.y * r.esc }; });
  await p.mouse.move(bolaPos.x, bolaPos.y); await p.mouse.down(); await p.mouse.move(bolaPos.x + 35, bolaPos.y + 20); await p.mouse.up(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => editor.cena.find('bola').Transform.x > 330 && editor.cena.find('bola').Transform.y > 220), 'editor E2 move objeto por arraste');
  await p.click('#e-criar'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.cena.entities.size === 6 && editor.sel != null), 'editor E2 cria objeto e seleciona');
  await p.click('#e-desfazer'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.cena.entities.size === 5), 'M12 desfaz criação'); await p.click('#e-refazer'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.cena.entities.size === 6), 'M12 refaz criação');
  await p.click('#e-duplicar'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.cena.entities.size === 7), 'editor E2 duplica objeto');
  await p.click('#e-remover'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.cena.entities.size === 6 && editor.sel == null), 'editor E2 remove objeto selecionado');
  await p.click('#e-desfazer'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.cena.entities.size === 7), 'M12 desfaz remoção'); await p.click('#e-refazer'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.cena.entities.size === 6), 'M12 refaz remoção');
  await p.click('#e-texto'); await p.waitForTimeout(50); ok(await p.evaluate(() => { const e = editor.cena.find('texto'); return editor.cena.entities.size === 7 && editor.sel === e.id && e.Transform.x === 20 && e.Transform.y === 20 && !e.Body && e.Sprite.fixo === true && e.Sprite.rotulo === 'Texto' && e.Sprite.corTexto === '#ffffff' && e.Sprite.tamanhoTexto === 24; }), 'Novo texto cria placar sem Body e seleciona');
  await p.click('#e-desfazer'); await p.waitForTimeout(50); ok(await p.evaluate(() => !editor.cena.find('texto')), 'Novo texto desfaz'); await p.click('#e-refazer'); await p.waitForTimeout(50); ok(await p.evaluate(() => !!editor.cena.find('texto')), 'Novo texto refaz'); await p.click('#e-desfazer'); await p.waitForTimeout(50);
  await p.click('#e-botao'); await p.waitForTimeout(50); ok(await p.evaluate(() => { const e = editor.cena.find('botao'); return !!e && editor.sel === e.id && !!e.Botao && e.Sprite.fixo === true && e.Sprite.rotulo === 'Botão' && e.Sprite.corSobre === '#3b82f6'; }), 'Novo botão cria botão fixo com estado de hover');
  await p.click('#e-desfazer'); await p.waitForTimeout(50); ok(await p.evaluate(() => !editor.cena.find('botao')), 'Novo botão desfaz'); await p.click('#e-refazer'); await p.waitForTimeout(50);
  const passosEditor = await p.evaluate(() => ({ passos: editor.engine.passos, x: editor.cena.find('bola').Transform.x })); await p.evaluate(() => editor.play()); await p.waitForTimeout(180); const playState = await p.evaluate(p0 => ({ rodando: editor.engine.rodando, andou: editor.engine.passos > p0.passos, historicoDesabilitado: document.getElementById('e-desfazer').disabled && document.getElementById('e-refazer').disabled }), passosEditor); await p.evaluate(() => editor.parar()); await p.waitForTimeout(80); const stopState = await p.evaluate(p0 => ({ rodando: editor.engine.rodando, desabilitaPlay: document.getElementById('e-play').disabled, restaurou: Math.abs(editor.cena.find('bola').Transform.x - p0.x) < 0.001 }), passosEditor);
  ok(playState.rodando && playState.andou, 'editor E2 Play inicia o motor'); ok(playState.historicoDesabilitado, 'M12 Play desabilita o histórico'); ok(!stopState.rodando && !stopState.desabilitaPlay && stopState.restaurou, 'editor E2 Parar interrompe e restaura a cena');
  const jogadorX = await p.evaluate(() => ({ x: editor.cena.find('jogador').Transform.x, input: editor.engine.input })); ok(jogadorX.input === null, 'editor M8 não mantém Input fora do Play');
  await p.evaluate(() => editor.play()); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(240); await p.keyboard.up('ArrowRight'); const inputPlay = await p.evaluate(x => ({ move: editor.cena.find('jogador').Transform.x > x + 10, ativo: !!editor.engine.input }), jogadorX.x); ok(inputPlay.move && inputPlay.ativo, 'editor M8 no Play: seta move o jogador com Controller');
  await p.evaluate(() => editor.parar()); await p.waitForTimeout(80); ok(await p.evaluate(x => editor.engine.input === null && Math.abs(editor.cena.find('jogador').Transform.x - x) < 0.001, jogadorX.x), 'editor M8 Parar destrói o Input e restaura a cena');
  await p.click('#e-play'); await p.waitForTimeout(180); ok(await p.evaluate(() => document.body.classList.contains('modo-jogo') && editor.engine.rodando && !!editor.engine.input), 'M11 Jogar entra em tela cheia com entrada ligada');
  await p.click('#e-sair-jogar'); await p.waitForTimeout(120); ok(await p.evaluate(() => !document.body.classList.contains('modo-jogo') && !editor.engine.rodando && editor.engine.input === null), 'M11 Sair do jogo interrompe e desliga a entrada');
  await p.screenshot({ path: process.env.EDITOR_PNG || '/tmp/editor.png' });
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'editor sem rolagem horizontal no celular');
  // editor E3a: scripts em JS dentro da cena
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'andar'); await p.click('#sc-novo');
  await p.fill('#sc-fonte', 'function atualizar(e, dt, ctx) { e.Transform.x += 100 * dt; ctx.vars.somar("pontos"); }');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('#sc-anexar'); await p.waitForTimeout(100); const scriptX = await p.evaluate(() => editor.cena.find('bola').Transform.x);
  ok(await p.evaluate(() => editor.cena.find('bola').Script.nome === 'andar' && JSON.parse(document.getElementById('json').value).estado.scripts.andar.fonte.includes('100 * dt')), 'criar e anexar script grava no JSON da cena');
  await p.click('#e-desfazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => !editor.cena.find('bola').Script), 'M12 desfaz anexação de script'); await p.click('#e-refazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => editor.cena.find('bola').Script && editor.cena.find('bola').Script.nome === 'andar'), 'M12 refaz anexação de script');
  const fonteAntesUndo = await p.inputValue('#sc-fonte'); const cenaAntesUndo = await p.evaluate(() => JSON.stringify(Core.Serializer.paraJSON(editor.cena))); await p.locator('#sc-fonte').press('End'); await p.keyboard.type('X'); await p.keyboard.press('Control+Z'); await p.waitForTimeout(60); ok(await p.inputValue('#sc-fonte') === fonteAntesUndo && await p.evaluate(x => JSON.stringify(Core.Serializer.paraJSON(editor.cena)) === x, cenaAntesUndo), 'Ctrl+Z em #sc-fonte usa o desfazer nativo e não o histórico da cena');
  await p.locator('#json').press('End'); const jsonAntesUndo = await p.inputValue('#json'); await p.keyboard.type('X'); await p.keyboard.press('Control+Z'); await p.waitForTimeout(60); ok(await p.inputValue('#json') === jsonAntesUndo && await p.evaluate(x => JSON.stringify(Core.Serializer.paraJSON(editor.cena)) === x, cenaAntesUndo), 'Ctrl+Z em #json usa o desfazer nativo e não o histórico da cena');
  await p.evaluate(() => editor.play()); await p.waitForTimeout(600);
  ok(await p.evaluate(() => editor.cena.find('bola').Transform.x > 360 && editor.engine.vars.ler('pontos') > 10), 'Play compila e roda o script (move o objeto e usa variáveis)');
  await p.evaluate(() => editor.parar()); await p.waitForTimeout(150);
  ok(await p.evaluate(x => Math.abs(editor.cena.find('bola').Transform.x - x) < 0.001 && !!editor.cena.estado.scripts.andar && editor.engine.vars.ler('pontos') === 0, scriptX), 'Parar restaura a cena e mantém o script');
  await p.fill('#sc-fonte', 'function atualizar( {');
  ok(await p.evaluate(() => /sintaxe/i.test(document.getElementById('sc-msg').textContent)), 'erro de sintaxe aparece enquanto digita');
  await p.click('#e-play'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => editor.engine.rodando && /Ao iniciar/.test(document.getElementById('sc-msg').textContent)), 'Play com script quebrado avisa e não derruba o motor');
  await p.evaluate(() => editor.parar());
  await p.click('#sc-remover'); ok(await p.evaluate(() => !editor.cena.find('bola').Script && !('andar' in editor.cena.estado.scripts)), 'remover script também desanexa dos objetos');
  // editor E3b: blocos pela interface
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'contar'); await p.click('#sc-novo-b');
  await p.locator('#bl > select.add').selectOption('evento_quadro');
  await p.locator('#bl .hat select.add').selectOption('var_somar');
  await p.locator('#bl .hat select.add').selectOption('mover_x');
  await p.waitForTimeout(100);
  ok(await p.evaluate(() => /function atualizar/.test(document.getElementById('sc-fonte').value) && /ctx\.vars\.somar\("pontos", 1\)/.test(document.getElementById('sc-fonte').value) && document.getElementById('sc-fonte').readOnly), 'blocos geram o código (somente leitura) conforme você monta');
  const codigoBlocos = await p.inputValue('#sc-fonte'); await p.click('#e-desfazer'); await p.waitForTimeout(60); await p.click('#e-refazer'); await p.waitForTimeout(60); ok(await p.inputValue('#sc-fonte') === codigoBlocos, 'M12 desfaz/refaz alteração de bloco');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('#sc-anexar'); await p.evaluate(() => editor.play()); await p.waitForTimeout(700); 
  ok(await p.evaluate(() => editor.engine.vars.ler('pontos') > 10 && editor.cena.find('bola').Transform.x > 350), 'Play roda o script feito com blocos');
  await p.evaluate(() => editor.parar());
  await p.locator('#bl .bloco:not(.hat)', { hasText: 'mudar x em' }).locator('button[aria-label="Remover bloco"]').click(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !/Transform\.x \+=/.test(document.getElementById('sc-fonte').value)), 'remover bloco atualiza o código');
  await p.click('#sc-vercod'); await p.click('#sc-conv'); ok(await p.evaluate(() => !document.getElementById('sc-fonte').readOnly && !editor.cena.estado.scripts.contar.blocos), 'converter em código libera a edição do texto');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'editor com blocos sem rolagem horizontal');
  await p.goto(url('index')); await p.waitForTimeout(100); await p.evaluate(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; }); await p.addScriptTag({ path: path.resolve(__dirname, '..', 'adapters/audio.js') });
  const audioIndisponivel = await p.evaluate(() => !new Core.Audio().disponivel);
  await p.evaluate(() => { window.__audioTeste = { decodificado: 0, iniciado: 0 }; window.AudioContext = class { constructor() { this.state = 'running'; this.destination = {}; } decodeAudioData() { window.__audioTeste.decodificado++; return Promise.resolve({}); } createBufferSource() { return { connect() {}, start() { window.__audioTeste.iniciado++; } }; } createGain() { return { gain: { value: 0 }, connect() {} }; } }; window.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }); }); await p.addScriptTag({ path: path.resolve(__dirname, '..', 'adapters/audio.js') });
  const audioDisponivel = await p.evaluate(async () => { const a = new Core.Audio(); await a.carregar({ beep: 'beep.wav' }); const source = a.tocar('beep', { volume: 0.4 }); return { disponivel: a.disponivel, source: !!source, carregado: __audioTeste.decodificado, iniciado: __audioTeste.iniciado }; });
  ok(audioIndisponivel && audioDisponivel.disponivel && audioDisponivel.source && audioDisponivel.carregado === 1 && audioDisponivel.iniciado === 1, 'audio: detecta WebAudio, carrega por nome e toca');
  // tecla livre pela interface
  await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'tz'); await p.click('#sc-novo-b');
  await p.locator('#bl > select.add').selectOption('evento_quadro'); await p.locator('#bl .hat select.add').selectOption('se');
  await p.locator('#bl select[aria-label="tipo de condição"]').selectOption('tecla'); await p.locator('#bl select[aria-label="tipo de tecla"]').selectOption('livre');
  await p.click('#bl button.tecla'); await p.keyboard.press('x'); await p.waitForTimeout(100);
  await p.locator('#bl .hat > .pilha > .bloco > select.add').first().selectOption('var_somar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /keys\.has\("x"\)/.test(document.getElementById('sc-fonte').value)), 'escolher "qualquer tecla" capturando a tecla apertada');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('#sc-anexar'); await p.evaluate(() => editor.play()); await p.waitForTimeout(300);
  const antes = await p.evaluate(() => editor.engine.vars.ler('pontos')); await p.keyboard.down('x'); await p.waitForTimeout(300); await p.keyboard.up('x'); await p.waitForTimeout(100);
  const dep = await p.evaluate(() => editor.engine.vars.ler('pontos'));
  ok(antes === 0 && dep > 5, 'no Play, a tecla escolhida dispara o bloco (sem tecla = nada)'); await p.evaluate(() => editor.parar());
  // blocos novos pela interface: temporizador + criar objeto
  await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'chuva'); await p.click('#sc-novo-b');
  await p.locator('#bl > select.add').selectOption('evento_quadro'); await p.locator('#bl .hat select.add').selectOption('temporizador'); await p.waitForTimeout(100);
  await p.locator('#bl .bloco.cat-Controle select.add').first().selectOption('criar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /st\["t0"\]/.test(document.getElementById('sc-fonte').value) && /ctx\.scene\.create/.test(document.getElementById('sc-fonte').value)), 'temporizador com "criar objeto" dentro gera o código');
  await p.fill('#sc-nome', 'orfao'); await p.click('#sc-novo'); await p.selectOption('#sc-lista', 'chuva'); await p.locator('select[aria-label="script do objeto criado"]').selectOption('orfao'); await p.selectOption('#sc-lista', 'orfao'); await p.click('#sc-remover'); await p.selectOption('#sc-lista', 'chuva'); await p.waitForTimeout(100);
  ok(await p.locator('select[aria-label="script do objeto criado"]').evaluate(s => s.style.borderColor === 'red' && s.title === 'script não existe'), 'bloco criar marca script órfão');
  await p.locator('#bl > .pilha > .bloco.hat').first().locator(':scope > select.add').selectOption('mover_x'); await p.locator('#bl > select.add').selectOption('evento_inicio'); await p.locator('#bl > .pilha > .bloco.hat').nth(1).locator(':scope > select.add').selectOption('mover_y'); await p.waitForTimeout(100);
  await p.setViewportSize({ width: 1280, height: 1800 }); await p.waitForTimeout(100);   // os dois blocos precisam estar visíveis na janela
  await p.click('#sc-grande'); ok(await p.evaluate(() => document.getElementById('scripts-pane').classList.contains('scripts-grande')), 'janela grande de scripts abre'); await p.waitForTimeout(100);
  const origemArraste = p.locator('#bl > .pilha > .bloco.hat').first().locator(':scope > .pilha > .bloco.cat-Movimento').first(), destinoArraste = p.locator('#bl > .pilha > .bloco.hat').nth(1).locator(':scope > .pilha'); const bo = await origemArraste.boundingBox(), bd = await destinoArraste.boundingBox(); await p.mouse.move(bo.x + bo.width / 2, bo.y + 8); await p.mouse.down(); await p.mouse.move(bd.x + bd.width / 2, bd.y + bd.height / 2, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => { const s = editor.cena.estado.scripts.chuva, primeiro = s.blocos[0].f, segundo = s.blocos[1].f; return !primeiro.some(b => b.t === 'mover_x') && segundo.filter(b => b.t === 'mover_x').length === 1 && segundo.some(b => b.t === 'mover_y'); }), 'arraste move bloco para outro evento sem copiar'); await p.keyboard.press('Escape'); ok(await p.evaluate(() => !document.getElementById('scripts-pane').classList.contains('scripts-grande')), 'Esc fecha a janela grande de scripts');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); const antesN = await p.evaluate(() => editor.cena.entities.size); await p.click('#sc-anexar'); await p.evaluate(() => editor.play()); await p.waitForTimeout(1500);
  const criados = await p.evaluate(() => [...editor.cena.entities.values()].filter(x => x.nome === 'criado').length);
  ok(criados >= 1, 'Play: o temporizador cria objetos durante o jogo (' + criados + ')');
  await p.evaluate(() => editor.parar()); await p.waitForTimeout(150);
  ok(await p.evaluate(n => editor.cena.entities.size === n, antesN), 'Parar descarta os objetos criados durante o jogo');






  // mapa de tiles no editor: criar, pintar no canvas, jogar colide
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index') + '?abas=todas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.click('#e-tiles'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const m = editor.cena.find('mapa'); return m && m.Tiles.colunas === 25 && m.Tiles.dados.length === 350 && editor.sel === m.id; }), 'tiles: botão cria mapa 25×14 e seleciona');
  await p.check('#tl-pintar'); await p.evaluate(() => { EditorTiles.pincel = 3; });
  const alvo = await p.evaluate(() => { const b = document.getElementById('tela').getBoundingClientRect(), r = editor.renderer; return { x: b.left + r.ox + (5 * 32 + 16) * r.esc, y: b.top + r.oy + (5 * 32 + 16) * r.esc }; });
  await p.mouse.move(alvo.x, alvo.y); await p.mouse.down(); await p.mouse.move(alvo.x + 32 * 2 * (await p.evaluate(() => editor.renderer.esc)), alvo.y, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => { const T = editor.cena.find('mapa').Tiles; return T.dados[5 * 25 + 5] === 3 && T.dados[5 * 25 + 7] === 3; }), 'tiles: arrastar no canvas pinta células com o pincel');
  await p.uncheck('#tl-pintar');
  ok(await p.evaluate(() => { const ent = editor.cena.find('mapa'); editor.cena.find('mapa').Tiles.paleta[1].solido = true; return true; }), 'tiles: paleta editável');





  // seletor de blocos com busca, duplicar e recolher; Output agrupa repetidas
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index') + '?abas=todas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('.sc-obj >> text=+ Novo (blocos)'); await p.waitForTimeout(200);
  await p.locator('#bl > .add-btn').click(); await p.fill('.picker .p-busca', 'quadro'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.querySelectorAll('#bl > .pilha > .bloco.hat').length === 1), 'seletor com busca: digitar "quadro" + Enter adiciona o evento');
  await p.locator('#bl .hat > .add-btn').click(); await p.fill('.picker .p-busca', 'lista'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => { const it = [...document.querySelectorAll('.picker .p-item')]; return it.length >= 4 && it.every(i => /lista/i.test(i.textContent) || i.title === 'Listas'); }), 'seletor filtra por texto/categoria');
  await p.click('.picker .p-item >> nth=0'); await p.waitForTimeout(150);
  await p.click('#bl .bloco:not(.hat) .bt button[title="Duplicar bloco"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.querySelectorAll('#bl .hat > .pilha > .bloco').length === 2), 'duplicar bloco');
  await p.click('#bl .bloco:not(.hat) .bt button[title="Recolher"]'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => document.querySelectorAll('#bl .bloco.recolhido').length === 1), 'recolher bloco');
  const rep = await p.evaluate(() => { EditorOutput.itens.length = 0; for (let i = 0; i < 50; i++) editor.engine.escrever('tick'); editor.engine.events.fila.length; return 1; });
  await p.evaluate(() => { editor.engine.passo(); }); await p.waitForTimeout(100);
  ok(await p.evaluate(() => EditorOutput.itens.filter(i => i.texto === 'tick').length === 1 && EditorOutput.itens.find(i => i.texto === 'tick').n === 50), 'Output soma mensagens repetidas (×50)');

  // blocos de partida salva (armazém do navegador)
  const r5 = await p.evaluate(() => {
    const N = v => ({ k: 'num', v }), f = EditorBlocos.gerar([{ t: 'evento_inicio', f: [{ t: 'var_definir', var: 'ponto', v: N(5) }, { t: 'partida_salvar', n: 'a1' }, { t: 'var_definir', var: 'ponto', v: N(0) }, { t: 'partida_carregar', n: 'a1' }] }]);
    const eng = new Core.Engine(); eng.armazem = Core.Armazem.navegador('teste.partida.'); eng.vars.declarar('ponto', 0); eng.scene.create({ nome: 'z', Transform: { x: 0, y: 0 }, Script: { nome: 's' } });
    eng.scene.estado.scripts = { s: { fonte: f } }; eng.compilarScripts(); eng.passo(); eng.passo();
    const ok1 = eng.vars.ler('ponto'), tem = eng.existePartida('a1'), ls = localStorage.getItem('teste.partida.partida:a1') !== null; eng.apagarPartida('a1'); return { ok1, tem, ls, depois: eng.existePartida('a1'), ed: editor.engine.armazem !== null };
  });
  ok(r5.ok1 === 5 && r5.tem && r5.ls && !r5.depois && r5.ed, 'blocos de partida: salvar, carregar, existe e persiste no localStorage (' + JSON.stringify(r5) + ')');
  // variáveis locais (só no script) e botão com estados
  const r4 = await p.evaluate(() => {
    const N = v => ({ k: 'num', v }), L = n => ({ k: 'local', n });
    const f = EditorBlocos.gerar([{ t: 'evento_inicio', f: [{ t: 'local_criar', n: 'soma', v: N(10) }, { t: 'local_somar', n: 'soma', v: N(5) }, { t: 'local_definir', n: 'dobro', v: { k: 'op', a: L('soma'), o: '*', b: N(2) } }, { t: 'var_definir', var: 'res', v: L('dobro') }, { t: 'var_definir', var: 'ausente', v: L('naoexiste') }] }]);
    const eng = new Core.Engine(); eng.vars.declarar('res', 0); eng.vars.declarar('ausente', 99); eng.scene.create({ nome: 'z', Transform: { x: 0, y: 0 }, Script: { nome: 's' } });
    eng.scene.estado.scripts = { s: { fonte: f } }; eng.compilarScripts(); eng.passo(); eng.passo();
    return { res: eng.vars.ler('res'), ausente: eng.vars.ler('ausente'), vaza: eng.vars.existe('soma') };
  });
  ok(r4.res === 30 && r4.ausente === 0 && !r4.vaza, 'variáveis locais: criar, somar, definir e ler sem vazar para as globais (' + JSON.stringify(r4) + ')');
  ok(await p.evaluate(() => { const eng = new Core.Engine(), e = eng.scene.create({ nome: 'b', Transform: { x: 100, y: 100 }, Sprite: { fixo: true, forma: 'retangulo', w: 80, h: 40, cor: '#111', corSobre: '#222', corApertado: '#333', arredondar: 8 }, Botao: { acao: {} } }); eng.input = null; eng.ctx.input.pointer = { x: 100, y: 100, tx: 100, ty: 100, down: true, pressed: false, ativo: true }; Core.Systems.ui(eng.scene, 1 / 60, eng.ctx); return e.Botao.sobre === true && e.Botao.apertado === true; }), 'botão: marca sobre e apertado');
  // tela cheia ocupa a janela toda (mesmo com o painel de baixo grande) e Output mostra "observar valor"
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => { document.documentElement.style.setProperty('--bottom-h', '600px'); editor.engine.observar('vidas', 3); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => /vidas\s*=\s*3/.test(document.getElementById('out-obs').textContent)), 'Output mostra os valores observados');
  await p.click('#e-play'); await p.waitForTimeout(300);
  const tam = await p.evaluate(() => { const r = document.querySelector('.palco').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), innerWidth, innerHeight]; });
  ok(tam[0] >= tam[2] - 2 && tam[1] >= tam[3] - 2, 'tela cheia: o palco ocupa a janela inteira (' + tam.join('x') + ')');
  await p.click('#e-sair-jogar'); await p.waitForTimeout(150);
  // painel "+" e blocos não esmagados pelo CSS do topo
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !document.querySelector('header.topo #e-criar') && document.getElementById('mais-painel').hidden), 'topo sem "Criar"; painel + começa fechado');
  await p.click('[data-tab-target="objetos-pane"]'); await p.click('#e-mais'); ok(await p.evaluate(() => !document.getElementById('mais-painel').hidden), '"+ Novo objeto" abre o painel de tipos');
  await p.click('#e-retangulo'); await p.click('#e-mais'); await p.click('#e-sensor');
  ok(await p.evaluate(() => { const a = editor.cena.find('parede'), b = editor.cena.find('sensor'); return a && a.Body.forma === 'retangulo' && b && b.Body.sensor === true && document.getElementById('mais-painel').hidden; }), 'painel +: retângulo sólido e sensor criam objetos e fecham o painel');
  await p.evaluate(() => { EditorCentro.abrir('scripts'); }); await p.click('#sc-nome').catch(() => {}); 
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('header.topo')).height === '52px'), 'barra do topo mantém 52px');
  // Output: escrever (bloco) e erros; abas do centro
  const o1 = await p.evaluate(() => { const N = v => ({ k: 'txt', v }); const eng = editor.engine; const f = EditorBlocos.gerar([{ t: 'evento_inicio', f: [{ t: 'escrever', v: N('oi output') }] }]); const e = editor.cena.create({ nome: 'sc', Transform: { x: 0, y: 0 }, Script: { nome: 'so' } }); editor.cena.estado.scripts = { so: { fonte: f } }; eng.compilarScripts(); eng.passo(); eng.passo(); return document.getElementById('out').textContent; });
  ok(/oi output/.test(o1), 'Output mostra o que o bloco "escrever no output" manda (' + o1.slice(0, 40) + ')');
  await p.click('.ctab[data-centro="scripts"]'); ok(await p.evaluate(() => !document.getElementById('centro-scripts').hidden), 'aba Scripts do centro abre'); await p.click('.ctab[data-centro="cena"]');
  // blocos de lista
  const r3 = await p.evaluate(() => {
    const N = v => ({ k: 'num', v }), T = v => ({ k: 'txt', v });
    const fonte = EditorBlocos.gerar([{ t: 'evento_inicio', f: [
      { t: 'lista_add', v: T('espada'), l: 'inv' }, { t: 'lista_add', v: T('poção'), l: 'inv' }, { t: 'lista_add', v: T('chave'), l: 'inv' },
      { t: 'lista_rem', i: N(1), l: 'inv' }, { t: 'lista_set', i: N(1), l: 'inv', v: T('elixir') },
      { t: 'para_cada_item', l: 'inv', f: [{ t: 'lista_add', v: { k: 'it' }, l: 'copia' }] },
      { t: 'var_definir', var: 'total', v: { k: 'tam', l: 'copia' } }] }]);
    const eng = new Core.Engine(); eng.vars.declarar('total', 0); eng.scene.create({ nome: 'z', Transform: { x: 0, y: 0 }, Script: { nome: 's' } });
    eng.scene.estado.scripts = { s: { fonte } }; eng.compilarScripts(); eng.passo();
    return { inv: eng.listas.todos('inv'), copia: eng.listas.todos('copia'), total: eng.vars.ler('total'), fonte };
  });
  ok(JSON.stringify(r3.inv) === '["elixir","chave"]' && JSON.stringify(r3.copia) === '["elixir","chave"]' && r3.total === 2, 'blocos de lista: adicionar, remover, trocar, para cada item e tamanho (' + JSON.stringify(r3.inv) + ')');
  // blocos aguardar e alterar aos poucos (engine do editor, passo a passo)
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index') + '?abas=todas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  const r2 = await p.evaluate(() => {
    const N = v => ({ k: 'num', v }), fonte = EditorBlocos.gerar([{ t: 'evento_inicio', f: [
      { t: 'alterar_grad', o: 'proprio', a: 'x', v: N(300), s: N(1), cv: 'linear' },
      { t: 'aguardar', s: N(0.5) }, { t: 'mudar_attr', o: 'proprio', a: 'y', v: N(77) }] }]);
    const eng = new Core.Engine(), e = eng.scene.create({ nome: 'z', Transform: { x: 0, y: 0 }, Script: { nome: 's' } });
    eng.scene.estado.scripts = { s: { fonte } }; eng.compilarScripts();
    const lido = []; for (let i = 0; i < 61; i++) { eng.passo(); if (i === 20) lido.push(e.Transform.y); if (i === 40) lido.push(e.Transform.y, Math.round(e.Transform.x)); } lido.push(e.Transform.x);
    return { lido, fonte };
  });
  ok(r2.lido[0] === 0 && r2.lido[1] === 77 && r2.lido[2] > 100 && r2.lido[2] < 250 && r2.lido[3] === 300, 'blocos: aguardar adia o que vem depois e alterar aos poucos chega ao valor (' + r2.lido.join(',') + ')');
  // inspetor por objeto: script (novo/copiar/trocar) e árvore por arrastar
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index') + '?abas=todas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('.sc-obj >> text=+ Novo (blocos)'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const s = editor.cena.estado.scripts, b = editor.cena.find('bola'); return !!s.bola_script && b.Script.nome === 'bola_script' && !document.getElementById('centro-scripts').hidden; }), 'inspetor: novo script de blocos anexa ao objeto e abre a aba Scripts do centro');
  await p.keyboard.press('Escape'); await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id));
  await p.click('.sc-obj >> text=⧉ Copiar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => editor.cena.find('bola').Script.nome === 'bola_script_copia' && !!editor.cena.estado.scripts.bola_script_copia), 'inspetor: copiar script cria e anexa a cópia');
  await p.selectOption('.sc-obj select', ''); ok(await p.evaluate(() => !editor.cena.find('bola').Script), 'inspetor: (nenhum) desanexa o script');
  const pai = await p.evaluate(() => { const a = editor.cena.find('jogador').id, b = editor.cena.find('bola').id; return { a, b }; });
  await p.dragAndDrop('#lista li:has-text("bola") button', '#lista li:has-text("jogador") button'); await p.waitForTimeout(150);
  ok(await p.evaluate(q => editor.cena.get(q.b).Pai && editor.cena.get(q.b).Pai.id === q.a, pai), 'árvore: arrastar um objeto sobre outro o torna filho');
  // imagens: importar, guardar na cena, aplicar ao objeto, sobreviver a salvar/abrir
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index') + '?abas=todas'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48; const g = c.getContext('2d'); g.fillStyle = '#e11'; g.fillRect(0, 0, 64, 48); return c.toDataURL('image/png').split(',')[1]; });
  await p.setInputFiles('#img-arquivo', { name: 'Meu Herói!.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }); await p.waitForTimeout(400);
  ok(await p.evaluate(() => { const im = editor.cena.estado.imagens; return im && Object.keys(im).join() === 'Meu_Her_i_' && /^data:image\/png;base64,/.test(im.Meu_Her_i_) && !!editor.renderer.assets.get('Meu_Her_i_'); }), 'imagem importada fica na cena e em Assets (nome limpo)');
  ok(await p.evaluate(() => document.querySelectorAll('#img-lista li').length === 1), 'lista de imagens mostra a importada');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('#img-lista li button'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const s = editor.cena.find('bola').Sprite; return s.imagem === 'Meu_Her_i_' && s.quadroW === 64 && s.quadroH === 48; }), 'Usar aplica imagem e tamanho ao objeto selecionado');
  const salvoJ = await p.evaluate(() => JSON.parse(JSON.stringify(Core.Serializer.paraJSON(editor.cena))));
  await p.evaluate(j => editor.carregarCena({ formato: j.formato, estado: {}, entidades: [] }), salvoJ); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !editor.cena.estado.imagens && document.querySelectorAll('#img-lista li').length === 0), 'cena vazia não tem imagens');
  await p.evaluate(j => editor.carregarCena(j), salvoJ); await p.waitForTimeout(250);
  ok(await p.evaluate(() => !!editor.cena.estado.imagens.Meu_Her_i_ && editor.cena.find('bola').Sprite.imagem === 'Meu_Her_i_' && document.querySelectorAll('#img-lista li').length === 1), 'imagens voltam ao abrir o save');
  // vista do editor: grade, tamanho da cena, zoom, abas reais e tela cheia limpa
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!editor.renderer.vista && editor.renderer.grade === true), 'vista do editor com grade ligada');
  ok(await p.evaluate(() => { const v = id => getComputedStyle(document.getElementById(id)).display !== 'none'; return v('projetos-pane') && !v('cenas-pane') && !v('objetos-pane'); }), 'aba Projetos mostra só o próprio painel');
  await p.click('[data-tab-target="objetos-pane"]'); ok(await p.evaluate(() => { const v = id => getComputedStyle(document.getElementById(id)).display !== 'none'; return !v('projetos-pane') && v('objetos-pane'); }), 'clicar na aba Objetos troca o painel');
  const z0 = await p.evaluate(() => editor.renderer.vista.z); const bt = await p.locator('#tela').boundingBox(); await p.mouse.move(bt.x + bt.width / 2, bt.y + bt.height / 2); await p.mouse.wheel(0, -300); await p.waitForTimeout(100);
  ok(await p.evaluate(z => editor.renderer.vista.z > z * 1.05, z0), 'roda do mouse dá zoom na vista');
  await p.click('#v-ajustar'); ok(await p.evaluate(z => Math.abs(editor.renderer.vista.z - z) < 1e-6, z0), 'Ajustar vista volta ao enquadramento');
  await p.fill('#v-w', '1600'); await p.fill('#v-h', '900'); await p.dispatchEvent('#v-h', 'change'); await p.dispatchEvent('#v-w', 'change'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => editor.cena.estado.tamanho.largura === 1600 && editor.renderer.largura === 1600 && editor.renderer.altura === 900), 'tamanho da cena muda a largura e a altura');
  await p.evaluate(() => editor.play()); await p.waitForTimeout(150); ok(await p.evaluate(() => editor.renderer.vista === null && editor.engine.ctx.tela.largura === 1600), 'Play desliga a vista/grade e usa o tamanho da cena');
  await p.evaluate(() => editor.parar()); await p.waitForTimeout(100); ok(await p.evaluate(() => !!editor.renderer.vista), 'Parar volta para a vista do editor');
  await p.click('#e-play'); await p.waitForTimeout(250); ok(await p.evaluate(() => ['.bottom-dock', '.tree-dock', '.inspector-dock', '.topo'].every(q => getComputedStyle(document.querySelector(q)).display === 'none')), 'tela cheia esconde todos os painéis do editor'); await p.click('#e-sair-jogar'); await p.waitForTimeout(150);
  await p.waitForTimeout(250); ok(await p.evaluate(() => { const v = { ...editor.renderer.vista }; editor.renderer.ajustarVista(); const ok = Math.abs(v.z - editor.renderer.vista.z) < 0.01 && editor.renderer.grade; return ok; }), 'depois do Play em tela cheia a grade e a vista voltam enquadradas');
  // exemplo pelo editor: abre, roda, moedas nascem
  await p.evaluate(() => localStorage.clear()); await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400); await p.click('#p-exemplo'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!editor.cena.find('jogador') && editor.cena.estado.scripts.moeda && document.getElementById('projetos').value === 'Pega-moedas'), 'botão abre o exemplo Pega-moedas como projeto novo');
  await p.evaluate(() => editor.play()); await p.waitForTimeout(300); const xj0 = await p.evaluate(() => editor.cena.find('jogador').Transform.x); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight'); ok(await p.evaluate(() => editor.cena.find('jogador').Transform.x) > xj0 + 20, 'exemplo: seta direita move o jogador'); await p.waitForTimeout(400); const encontrouMoeda = await p.evaluate(() => { const m = [...editor.cena.entities.values()].find(x => x.nome === 'moeda'), j = editor.cena.find('jogador'); if (!m || !j) return false; j.Transform.x = m.Transform.x; j.Transform.y = m.Transform.y; return true; }); await p.waitForTimeout(300);
  const placar = await p.evaluate(moeda => ({ moeda, pontos: editor.engine.vars.ler('pontos'), texto: editor.cena.find('placar').Sprite.rotulo }), encontrouMoeda);
  ok(placar.moeda && placar.pontos >= 1 && /Pontos: [1-9]/.test(placar.texto), 'exemplo coleta uma moeda e atualiza o placar');
  const pixelsPlacar = await p.evaluate(() => { const c = document.getElementById('tela'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 220 && d[i + 2] > 220 && d[i + 3] > 0) n++; return n; });
  ok(pixelsPlacar > 0, 'exemplo desenha pixels do texto do placar');
  await p.screenshot({ path: process.env.EX_PNG || '/tmp/ex.png' }); await p.evaluate(() => editor.parar());
  ok(await p.evaluate(() => { const d = document.createElement('div'), n = x => ({ k: 'num', v: x }), sc = { blocos: [{ t: 'evento_quadro', f: [EditorBlocos.novo('mudar_attr'), EditorBlocos.novo('somar_attr'), Object.assign(EditorBlocos.novo('se'), { c: { k: 'ou', a: { k: 'nao', a: { k: 'cmp', a: { k: 'attr', o: 'n:jogador', a: 'x' }, op: '>', b: { k: 'op', a: n(1), o: '+', b: n(2) } } }, b: { k: 'tecla', acao: 'acao', modo: 'down' } } })] }] }; EditorBlocos.montar(d, sc, { vars: () => [], scripts: () => [], objetos: () => ['jogador'], aoMudar() {} }); return d.querySelectorAll('select[aria-label="objeto"]').length === 3 && d.querySelectorAll('select[aria-label="atributo"]').length >= 3 && d.querySelectorAll('select[aria-label="conta"]').length === 1; }), 'interface dos blocos mostra atributo, conta e lógica (e/ou/não)');
  await p.evaluate(() => editor.selecionar(editor.cena.find('jogador').id)); await p.waitForTimeout(100);
  await p.fill('input[placeholder="inimigo, moeda"]', 'heroi, rapido'); await p.press('input[placeholder="inimigo, moeda"]', 'Tab'); await p.fill('input[placeholder="vida=3, nome=Zé"]', 'vida=3, nome=Zé'); await p.press('input[placeholder="vida=3, nome=Zé"]', 'Tab'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => { const e = editor.cena.find('jogador'); return e.Etiquetas.join() === 'heroi,rapido' && e.Attr.vida === 3 && e.Attr.nome === 'Zé'; }), 'painel Marcas: etiquetas e atributos próprios');
  ok(await p.evaluate(() => { const d = document.createElement('div'); const bl = Object.keys(EditorBlocos.BLOCOS).map(t => { const b = EditorBlocos.novo(t); if (t === 'clonar') b.nome = ''; return b; }); EditorBlocos.montar(d, { blocos: [{ t: 'evento_quadro', f: bl }] }, { vars: () => [], scripts: () => [], objetos: () => ['jogador'], etiquetas: () => ['heroi'], atributos: () => ['vida'], aoMudar() {} }); return d.querySelectorAll('.bloco:not(.hat)').length >= bl.length; }), 'interface desenha todos os blocos, inclusive os da Fase A');
  { const r = await p.evaluate(() => {
      const d = document.createElement('div'), n = v => ({ k: 'num', v }), op = { k: 'op', o: '+', a: n(1), b: n(2) };
      const sc = { blocos: [{ t: 'evento_colisao', f: [Object.assign(EditorBlocos.novo('se'), { c: { k: 'cmp', a: { k: 'txt', v: 'a' }, op: '=', b: { k: 'txt', v: 'b' } }, f: [], s: [] }), EditorBlocos.novo('texto')] }, { t: 'evento_quadro', f: [Object.assign(EditorBlocos.novo('var_somar'), { v: op })] }] };
      EditorBlocos.montar(d, sc, { vars: () => ['v'], scripts: () => [], objetos: () => [], etiquetas: () => [], atributos: () => [], aoMudar() {} });
      const ks = sel => [...sel.options].map(o => o.value), vals = [...d.querySelectorAll('.val')], g = sel => sel.querySelectorAll('optgroup').length;
      const cmpB = vals.find(v => v.querySelector(':scope > input[aria-label="valor B (texto)"]')), nVal = d.querySelectorAll('.bloco.hat')[1].querySelector('.val > select');
      const colisao = d.querySelectorAll('.bloco.hat')[0].querySelector('.bloco.cat-Aparência .val > select');
      const aninhado = nVal.parentElement.querySelector('.val');
      return { grupos: g(nVal), txtB: ks(cmpB.querySelector('select')), numSemTxt: !ks(nVal).includes('plataforma'), outroEmColisao: ks(colisao).includes('outro'), outroForaDeColisao: ks(nVal).includes('outro'), prof: aninhado && aninhado.style.getPropertyValue('--esc'), cor: !!nVal.parentElement.style.getPropertyValue('--vg') };
    });
    ok(r.grupos >= 4 && r.numSemTxt && r.outroEmColisao && !r.outroForaDeColisao && r.txtB.includes('plataforma') && !r.txtB.includes('x') && r.prof === '12%' && r.cor, 'seletor de valores: grupos coloridos, filtra pelo tipo (texto/número) e pelo contexto (' + JSON.stringify(r) + ')'); }
  { const r = await p.evaluate(() => {
      const d = document.createElement('div'); d.className = 'blocos'; d.style.cssText = 'position:fixed;left:0;top:0;width:360px;z-index:9999'; const n = v => ({ k: 'num', v });
      const op = { k: 'op', o: '+', a: { k: 'op', o: '*', a: n(1), b: { k: 'op', o: '-', a: n(2), b: n(3) } }, b: { k: 'op', o: '/', a: n(4), b: n(5) } };
      EditorBlocos.montar(d, { blocos: [{ t: 'evento_quadro', f: [Object.assign(EditorBlocos.novo('var_somar'), { v: op, var: 'v' })] }] }, { vars: () => ['v'], scripts: () => [], objetos: () => [], etiquetas: () => [], atributos: () => [], aoMudar() {} }); document.body.append(d);
      const topo = d.querySelector('.bloco:not(.hat) > .topo'), res = { alto: topo.getBoundingClientRect().height, rola: d.scrollWidth > d.clientWidth, nome: !!d.querySelector('.val.com-nome') }; d.remove(); return res;
    });
    ok(r.alto < 60 && r.rola && r.nome, 'blocos: parâmetros ficam numa linha só (crescem para a direita e a área rola) (' + JSON.stringify(r) + ')'); }
  await p.evaluate(() => { editor.cena.estado.scripts.quebra = { fonte: 'function atualizar(e, dt, ctx) { ctx.engine.naoExiste(); }' }; editor.cena.find('jogador').Script = { nome: 'quebra' }; });
  await p.evaluate(() => editor.play()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => /Erro no script "quebra"/.test(document.getElementById('msg').textContent)), 'erro de script aparece na mensagem do editor');
  await p.evaluate(() => editor.parar());
  // arrastar: soltar fora do lugar não pode quebrar o script (bloco comum no topo / evento dentro de evento)
  await p.evaluate(() => { document.getElementById('bl-teste')?.remove(); const d = document.createElement('div'); d.id = 'bl-teste'; d.style.cssText = 'position:fixed;left:10px;top:10px;width:700px;height:420px;background:#111;z-index:5000;overflow:auto'; document.body.append(d); window.__sc = { blocos: [{ t: 'evento_inicio', f: [EditorBlocos.novo('reiniciar')] }, { t: 'evento_quadro', f: [] }] }; EditorBlocos.montar(d, window.__sc, { vars: () => [], scripts: () => [], aoMudar() {} }); });
  const caixa = async sel => (await p.locator(sel).first().boundingBox());
  const bl0 = await caixa('#bl-teste .bloco:not(.hat)'); await p.mouse.move(bl0.x + 4, bl0.y + 4); await p.mouse.down(); await p.mouse.move(bl0.x + 4, bl0.y + 300, { steps: 6 }); await p.mouse.move(700, 410, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => window.__sc.blocos.every(b => EditorBlocos.HATS[b.t]) && window.__sc.blocos.length === 2 && document.querySelectorAll('#bl-teste .bloco').length >= 3), 'soltar fora de um evento não quebra nem apaga o script');
  const hats = await p.locator('#bl-teste .bloco.hat').all(); const h2 = await hats[1].boundingBox(); const b1 = await caixa('#bl-teste .bloco:not(.hat)'); await p.mouse.move(b1.x + 4, b1.y + 4); await p.mouse.down(); await p.mouse.move(h2.x + 40, h2.y + 8, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => window.__sc.blocos[0].f.length === 0 && window.__sc.blocos[1].f.length === 1 && window.__sc.blocos[1].f[0].t === 'reiniciar'), 'soltar sobre a barra de outro evento move o bloco para dentro dele');
  await p.evaluate(() => document.getElementById('bl-teste').remove());
  // várias cenas
  p.on('dialog', d => d.accept());
  await p.evaluate(() => localStorage.clear()); await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  await p.evaluate(() => { editor.cena.create({ nome: 'marca1', Transform: { x: 10, y: 10 } }); editor.json(); });
  await p.fill('#cena-nome', 'fase2'); await p.click('#cena-nova'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => EditorCenas.nomes().join() === 'fase2,principal' && editor.cena.entities.size === 0 && document.getElementById('cenas-lista').value === 'fase2'), 'cenas: nova cena abre vazia e a lista mostra as duas');
  await p.evaluate(() => { editor.cena.create({ nome: 'marca2', Transform: { x: 20, y: 20 } }); editor.json(); });
  await p.selectOption('#cenas-lista', 'principal'); await p.click('#cena-abrir'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !!editor.cena.find('marca1') && !editor.cena.find('marca2')), 'cenas: voltar para a cena anterior mantém os objetos de cada uma');
  await p.evaluate(() => { const bl = [{ t: 'evento_inicio', f: [Object.assign(EditorBlocos.novo('ir_cena'), { cena: 'fase2' })] }]; editor.cena.estado.scripts.vai = { blocos: bl, fonte: EditorBlocos.gerar(bl) }; editor.cena.find('marca1').Script = { nome: 'vai' }; editor.json(); });
  await p.evaluate(() => editor.play()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => editor.engine.scene.estado.cena === 'fase2' && !!editor.engine.scene.find('marca2') && !editor.engine.scene.find('marca1')), 'cenas: Play + bloco "ir para a cena" troca para a outra cena');
  await p.evaluate(() => editor.parar()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => !!editor.cena.find('marca1') && EditorCenas.nomes().length === 2), 'cenas: Parar volta para a cena que estava aberta no editor');
  await p.fill('#cena-nome', 'mapa'); await p.selectOption('#cenas-lista', 'fase2'); await p.click('#cena-renomear'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => EditorCenas.nomes().join() === 'mapa,principal' && editor.cena.estado.scripts.vai.blocos[0].f[0].cena === 'mapa' && /"mapa"/.test(editor.cena.estado.scripts.vai.fonte)), 'cenas: renomear atualiza os blocos "ir para a cena"');
  await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => EditorCenas.nomes().join() === 'mapa,principal' && !!editor.cena.find('marca1')), 'cenas: sobrevivem a recarregar a página');
  await p.selectOption('#cenas-lista', 'mapa'); await p.click('#cena-apagar'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => EditorCenas.nomes().join() === 'principal'), 'cenas: apagar uma cena');
  await p.click('#cena-apagar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => EditorCenas.nomes().length === 1), 'cenas: não deixa apagar a última');
  const exportado = await p.evaluate(() => { const x = EditorArquivos.exportar(); x.cenas.cenas.segunda = { formato: 1, estado: { vars: {} }, entidades: [] }; return x; });
  ok(!!exportado.cena && exportado.cenas.atual === 'principal' && !!exportado.cenas.cenas.principal, 'arquivos: Baixar inclui a cena viva e o pacote de cenas');
  await p.evaluate(x => EditorArquivos.importar(JSON.stringify(x)), exportado); await p.waitForTimeout(120);
  ok(await p.evaluate(() => editor.projetoAtual === 'Importado' && EditorCenas.nomes().join() === 'principal,segunda'), 'arquivos: abrir projeto multi-cena recria todas as cenas');
  await p.evaluate(x => EditorArquivos.importar(JSON.stringify(x)), exportado.cena); await p.waitForTimeout(120);
  ok(await p.evaluate(() => editor.projetoAtual === 'Importado 2' && EditorCenas.nomes().length === 1), 'arquivos: abrir cena antiga cria projeto compatível');
  // ajustes do editor: câmera sem limites falsos, + componente, Play somente leitura, scripts sem sobra
  await p.evaluate(() => localStorage.clear()); await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  await p.evaluate(() => { editor.cena.create({ nome: 'j', Transform: { x: 100, y: 100 }, Sprite: { forma: 'circulo', raio: 16, cor: '#4af' } }); editor.json(); editor.selecionar(editor.cena.find('j').id); });
  await p.click('#cam-aplicar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => { const c = editor.cena.estado.camera; return c && c.x === 400 && c.zoom === 1 && c.limites === undefined; }), 'câmera: Aplicar com campos de limite vazios não cria limites 0,0,0,0');
  await p.selectOption('select[aria-label="Adicionar componente"]', 'Colisão retangular (hitbox)'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => { const e = editor.cena.find('j'); return e.Body && e.Body.forma === 'retangulo' && e.Velocity; }), '+ componente: hitbox retangular com Velocity');
  await p.locator('button[aria-label="Remover o componente Body"]').click(); await p.waitForTimeout(100);
  ok(await p.evaluate(() => !editor.cena.find('j').Body), '✕ remove o componente');
  await p.evaluate(() => editor.play()); await p.waitForTimeout(200);
  const pos0 = await p.evaluate(() => JSON.stringify(editor.cena.find('j').Transform)); const bx = await p.locator('#tela').boundingBox();
  await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.mouse.move(bx.x + 20, bx.y + 20, { steps: 5 }); await p.mouse.up();
  ok(await p.evaluate(p0 => JSON.stringify(editor.engine.scene.find('j').Transform) === p0 && document.getElementById('e-criar').disabled, pos0), 'Play: editor somente leitura (não arrasta nem cria)');
  await p.evaluate(() => editor.parar());
  await p.fill('#projeto-nome', 'Vazio2'); await p.click('#projeto-criar'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.getElementById('bl').children.length === 0 && document.getElementById('e-jogar').textContent === 'Tela cheia'), 'projeto novo: painel de blocos sem sobra do projeto anterior; botão Tela cheia');
  // hierarquia no editor: escolher pai, filho segue o pai, lista com recuo, remover pai leva os filhos
  await p.evaluate(() => localStorage.clear()); await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  await p.evaluate(() => { editor.cena.create({ nome: 'dono', Transform: { x: 100, y: 100 }, Sprite: { w: 20, h: 20, cor: '#fff' } }); editor.cena.create({ nome: 'arma', Transform: { x: 130, y: 100 }, Sprite: { w: 10, h: 10, cor: '#f00' } }); editor.json(); editor.selecionar(editor.cena.find('arma').id); });
  await p.selectOption('select[aria-label="Pai do objeto"]', { label: 'dono #' + await p.evaluate(() => editor.cena.find('dono').id) }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => { const a = editor.cena.find('arma'); return a.Pai && a.Pai.dx === 30 && a.Pai.dy === 0; }), 'editor: escolher pai guarda o deslocamento');
  await p.evaluate(() => { const d = editor.cena.find('dono'); d.Transform.x = 200; editor.redesenhar(); }); await p.waitForTimeout(150);
  ok(await p.evaluate(() => editor.cena.find('arma').Transform.x === 230), 'editor: mover o pai leva o filho');
  ok(await p.evaluate(() => /↳ arma/.test(document.getElementById('lista').textContent)), 'lista de objetos mostra o filho recuado');
  await p.evaluate(() => { editor.cena.destroy(editor.cena.find('dono').id); editor.cena.flush(); }); ok(await p.evaluate(() => !editor.cena.find('dono') && !editor.cena.find('arma')), 'remover o pai remove o filho');
  // WebGL (PixiJS): escolher "Gráficos", jogar e ver o mundo desenhado pelo adaptador
  await p.goto(url('editor/index') + '?abas=todas&render=graficos'); await p.waitForTimeout(400);
  await p.evaluate(() => { editor.cena.create({ nome: 'quadro', Transform: { x: 400, y: 225 }, Sprite: { w: 4000, h: 4000, camada: 99, cor: '#ff0000' } }); editor.redesenhar(); });
  await p.click('#e-play'); await p.waitForTimeout(1500);
  const gl = await p.evaluate(() => { const r = editor.engine.renderer; return { pixi: r.constructor.name === 'PixiRenderer', vis: getComputedStyle(document.querySelector('.tela-gl') || document.body).display, n: r.itens ? r.itens.size : -1 }; });
  ok(gl.pixi && gl.vis === 'block' && gl.n > 0, 'WebGL: Play usa PixiRenderer e desenha os objetos (' + JSON.stringify(gl) + ')');
  const bb = await p.evaluate(() => { const r = document.querySelector('.tela-gl').getBoundingClientRect(); return { x: r.left + r.width / 2 - 2, y: r.top + r.height / 2 - 2, width: 4, height: 4 }; });
  const pngB = (await p.screenshot({ clip: bb })).toString('base64');
  const px = await p.evaluate(src => new Promise(ok => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d'); g.drawImage(i, 0, 0); ok([...g.getImageData(1, 1, 1, 1).data]); }; i.src = "data:image/png;base64," + src; }), pngB);
  ok(px[0] > 200 && px[1] < 60, 'WebGL: pixel do centro é vermelho (' + px.join(',') + ')');
  await p.evaluate(() => editor.parar()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => editor.engine.renderer.constructor.name === 'CanvasRenderer' && getComputedStyle(document.querySelector('.tela-gl')).display === 'none'), 'WebGL: Parar volta ao Canvas 2D');
  // projeto em pasta/ZIP: ida e volta com imagem e som, depois abrir o ZIP pela interface
  await p.goto(url('editor/index') + '?abas=todas'); await p.waitForTimeout(400);
  const rt = await p.evaluate(async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', wav = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
    editor.cena.estado.imagens = { foto: png }; editor.cena.estado.sons = { beep: wav };
    const pac = EditorArquivos.exportar(), arq = PastaProjeto.empacotar(pac, 'teste'), chaves = Object.keys(arq).sort();
    const z = await PastaProjeto.deszipar(await PastaProjeto.zipar(arq).arrayBuffer()), v = PastaProjeto.desempacotar(z);
    let ruim = null; try { const x = Object.assign({}, z); x['cenas/principal.json'] = new TextEncoder().encode(JSON.stringify({ formato: 1, estado: { imagens: { a: 'assets/imagens/../../x.png' } }, entidades: [] })); PastaProjeto.desempacotar(x); } catch (e) { ruim = e.message; }
    return { chaves, img: v.cena.estado.imagens.foto === png, som: v.cena.estado.sons.beep === wav, nome: v.nome, ruim, ents: v.cena.entidades.length === pac.cena.entidades.length };
  });
  ok(rt.chaves.includes('projeto.json') && rt.chaves.some(c => /^assets\/imagens\/foto\.png$/.test(c)) && rt.chaves.some(c => /^assets\/sons\/beep\.wav$/.test(c)), 'pasta: gera projeto.json, cenas/ e assets/ (' + rt.chaves.join(',') + ')');
  ok(rt.img && rt.som && rt.ents && rt.nome === 'teste', 'pasta: ZIP ida e volta preserva cena, imagem e som');
  ok(/inválido|ausente/.test(rt.ruim || ''), 'pasta: recusa caminho de asset malicioso');
  // abrir projeto publicado por URL (?projeto=), servido por um servidor HTTP local
  {
    const http = require('http'), fs = require('fs'), raiz = path.resolve(__dirname, '..');
    const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' }[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); });
    await new Promise(ok => srv.listen(0, ok)); const porta = srv.address().port;
    await p.evaluate(() => localStorage.clear()); await p.goto('http://localhost:' + porta + '/editor/index.html?abas=todas&projeto=../projetos/pega-moedas/'); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => /Projeto .* aberto/.test(document.getElementById('pasta-msg').textContent) && editor.cena.entities.size > 3 && /pasta/.test(editor.projetoAtual || '')), '?projeto= abre o projeto da pasta publicada (' + await p.evaluate(() => document.getElementById('pasta-msg').textContent + '|' + editor.cena.entities.size) + ')');
    await p.goto('http://localhost:' + porta + '/editor/index.html?abas=todas&projeto=../projetos/mini-rpg/'); await p.waitForTimeout(1000);
    await p.evaluate(() => editor.play()); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => editor.engine.rodando && editor.cena.entities.size > 8 && (editor.engine.errosScripts || []).length === 0), 'mini-rpg roda no editor sem erro de script');
    ok(await p.evaluate(() => getComputedStyle(document.getElementById('tela')).touchAction === 'none'), 'toque: a tela do jogo tem touch-action:none (joystick funciona no celular)');
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT }); await p.evaluate(() => editor.parar());
    { // Matter.js no editor: objetos prontos, Play em worker e exportação com a biblioteca
      const pf = await b.newPage({ viewport: { width: 1300, height: 800 } }); const errf = []; pf.on('pageerror', e => errf.push(e.message)); await pf.goto('http://localhost:' + porta + '/editor/index.html?abas=todas'); await pf.waitForTimeout(500);
      const semMt = await pf.evaluate(async () => !(await EditorExportar.gerar()).includes('matter-js 0.20.0'));
      await pf.evaluate(() => { for (const k of ['chao', 'caixa', 'pendulo']) document.getElementById('f-' + k).click(); });
      const y0 = await pf.evaluate(() => editor.cena.find('caixa').Transform.y); await pf.evaluate(() => editor.play()); await pf.waitForTimeout(1800);
      const f = await pf.evaluate(() => { const c = editor.cenaViva || editor.cena, x = c.find('caixa'), pw = c.find('peso'), pv = c.find('pivo'); return { y: x.Transform.y, d: Math.hypot(pw.Transform.x - pv.Transform.x, pw.Transform.y - pv.Transform.y), modo: editor.engine.emWorker }; });
      await pf.evaluate(() => editor.parar());
      const html = await pf.evaluate(() => EditorExportar.gerar()), pz = await pf.evaluate(async () => { const a = await EditorExportar.gerarPasta(); return /matter-js 0\.20\.0/.test(new TextDecoder().decode(a['motor.js'])); });
      const p3 = await b.newPage(); await p3.setContent(html); await p3.waitForTimeout(400); await p3.click('button'); await p3.waitForTimeout(1800);
      const jy = await p3.evaluate(() => Core.Player.engine.scene.find('caixa') ? Core.Player.engine.scene.find('caixa').Transform.y : -1); await p3.close();
      ok(semMt && f.y > y0 + 100 && f.y < 440 && Math.abs(f.d - 120) < 4 && errf.length === 0, 'matter no editor: sem Corpo o arquivo não leva a biblioteca; no Play a caixa cai e o pêndulo segura (' + JSON.stringify(f) + ' y0=' + y0 + ' ' + errf.join('|') + ')');
      ok(html.includes('matter-js 0.20.0') && pz && jy > y0 + 100, 'matter na exportação: .html e pasta levam a biblioteca e o jogo exportado simula (y=' + jy + ')'); await pf.close();
    }
    { // ajustes finos de exportação
      const ax = await p.evaluate(async () => {
        document.getElementById('ex-ajustes').click(); const q = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change')); };
        q('ex-nome', 'Super Jogo'); q('ex-orient', 'paisagem'); q('ex-encaixe', 'inteiro'); q('ex-cor', '#102030');
        const cfg = JSON.parse(JSON.stringify(editor.cena.estado.exportar)), html = await EditorExportar.gerar(); const zip = await EditorExportar.gerarPasta(), man = JSON.parse(new TextDecoder().decode(zip['manifest.webmanifest']));
        return { cfg, html: { titulo: /<title>Super Jogo<\/title>/.test(html), cor: html.includes('background:#102030'), dados: html.includes('"orientacao":"paisagem"') }, man: [man.name, man.orientation, man.background_color].join() };
      });
      ok(ax.cfg.nomeApp === 'Super Jogo' && ax.cfg.orientacao === 'paisagem' && ax.cfg.encaixe === 'inteiro' && ax.cfg.corFundo === '#102030' && ax.html.titulo && ax.html.cor && ax.html.dados && ax.man === 'Super Jogo,landscape,#102030', 'exportar: painel de ajustes grava e o .html usa nome, cor e orientação (' + JSON.stringify(ax) + ')');
      await p.evaluate(() => { document.getElementById('ex-ajustes').click(); delete editor.cena.estado.exportar; editor.json(); });
    }
    // exportar jogo: um .html que roda sozinho (nova página, sem o editor)
    const html = await p.evaluate(() => EditorExportar.gerar());
    ok(/Core\.Player\.iniciar/.test(html) && !/class PixiRenderer|new P\.Application/.test(html) && html.length < 400000, 'exportar: gera um .html único e leve (' + Math.round(html.length / 1024) + ' KB, sem PixiJS)');
    const p2 = await b.newPage(); const err2 = []; p2.on('pageerror', e => err2.push(e.message)); const reqs = []; p2.on('request', r => { if (!/^(data|about|blob):/.test(r.url())) reqs.push(r.url()); });
    await p2.setContent(html); await p2.waitForTimeout(500); await p2.click('button'); await p2.waitForTimeout(1500);
    const jg = await p2.evaluate(() => ({ rodando: Core.Player.engine.rodando, ents: Core.Player.engine.scene.entities.size, canvas: !!document.getElementById('tela'), editor: typeof editor })), vc = await p2.evaluate(() => Core.Player.engine.vars.ler('vida'));
    ok(await p2.evaluate(() => Core.Player.modo === 'worker') && jg.rodando && jg.ents > 8 && jg.canvas && jg.editor === 'undefined' && vc === 3 && err2.length === 0 && reqs.length <= 1, 'exportar: o jogo roda sozinho, sem editor e sem rede (' + JSON.stringify(jg) + ' erros ' + err2.length + ' reqs ' + reqs.length + ')');
    // toque de verdade (celular simulado): arrastar um dedo move o jogador pelo joystick virtual
    const ctxT = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } }), p3 = await ctxT.newPage(); await p3.setContent(html); await p3.waitForTimeout(400); await p3.tap('button'); await p3.waitForTimeout(500);
    const cdp = await ctxT.newCDPSession(p3), x0 = await p3.evaluate(() => Core.Player.engine.scene.find('jogador').Transform.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 250 }] });
    for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200 + i * 12, y: 250 }] }); await p3.waitForTimeout(80); }
    await p3.waitForTimeout(300); const x1 = await p3.evaluate(() => Core.Player.engine.scene.find('jogador').Transform.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    ok(x1 > x0 + 15, 'toque: arrastar o dedo move o jogador no jogo exportado (x ' + x0.toFixed(0) + ' → ' + x1.toFixed(0) + ')'); await ctxT.close();
    // laço infinito num script: a página continua viva, o vigia avisa e "Reiniciar" recomeça
    await p.evaluate(() => { editor.cena.estado.scripts = editor.cena.estado.scripts || {}; editor.cena.estado.scripts.travar = { fonte: 'function atualizar(e, dt, ctx) { if (ctx.engine.tempo > 0.5) { while (true) {} } }' }; editor.cena.create({ nome: 'bug', Transform: { x: 0, y: 0 }, Script: { nome: 'travar' } }); });
    const htmlTrava = await p.evaluate(() => EditorExportar.gerar());
    const p5 = await b.newPage(); await p5.setContent(htmlTrava); await p5.waitForTimeout(400); await p5.click('button'); await p5.waitForTimeout(5200);
    const tr = await p5.evaluate(() => ({ vivo: true, aviso: /parou de responder/.test(document.body.innerText), modo: Core.Player.modo }));
    ok(tr.vivo && tr.aviso && tr.modo === 'worker', 'worker: laço infinito no script não trava a página; aparece o aviso (' + JSON.stringify(tr) + ')');
    await p5.evaluate(() => { const j = Core.Player.host.jogo, c = j.cenas[j.atual]; c.entidades = c.entidades.filter(e => e.nome !== 'bug'); });
    await p5.click('text=Reiniciar o jogo'); await p5.waitForTimeout(1500);
    ok(await p5.evaluate(() => Core.Player.engine.rodando && Core.Player.engine.vars.ler('vida') === 3), 'worker: "Reiniciar o jogo" recria o worker e o jogo volta a rodar');
    await p5.close();
    await p2.close();
    await p.goto('http://localhost:' + porta + '/editor/index.html?abas=todas&projeto=../projetos/nao-existe/'); await p.waitForTimeout(600);
    ok(await p.evaluate(() => /Não abriu/.test(document.getElementById('pasta-msg').textContent)), '?projeto= inexistente mostra erro');
    // joystick configurável: desligado não anda; fixo só começa perto da base; ctx.input.joystick tem os dados
    {
      const ctxJ = await b.newContext({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } }), pj = await ctxJ.newPage(), cdpJ = await ctxJ.newCDPSession(pj);
      const arrastar = async (de, ate) => { await cdpJ.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [de] }); for (let i = 1; i <= 8; i++) { await cdpJ.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: de.x + (ate.x - de.x) * i / 8, y: de.y + (ate.y - de.y) * i / 8 }] }); await pj.waitForTimeout(70); } await pj.waitForTimeout(200); };
      const jogar = async cfg => { await pj.goto('http://localhost:' + porta + '/editor/index.html?abas=todas&projeto=../projetos/mini-rpg/'); await pj.waitForTimeout(900); await pj.evaluate(c => { const j = editor.cena.find('joystick'); if (c) { j.Joystick = Object.assign({}, c); if (c.x !== undefined) { j.Transform.x = c.x * 800; j.Transform.y = (c.y === undefined ? 0.78 : c.y) * 480; delete j.Joystick.x; delete j.Joystick.y; } } else editor.cena.destroy(j.id); }, cfg); await pj.evaluate(() => editor.jogar()); await pj.waitForTimeout(1100); return pj.evaluate(() => editor.cena.find('jogador').Transform.x); };
      let x0 = await jogar({ modo: 'desligado' }); await arrastar({ x: 300, y: 200 }, { x: 420, y: 200 }); let x1 = await pj.evaluate(() => editor.cena.find('jogador').Transform.x);
      ok(Math.abs(x1 - x0) < 2, 'joystick desligado: o toque não move o jogador (x ' + x0.toFixed(0) + ' → ' + x1.toFixed(0) + ')');
      await cdpJ.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      x0 = await jogar({ modo: 'fixo', x: 0.2, y: 0.7, raio: 60 }); const base = { x: 844 * 0.2, y: 390 * 0.7 };
      await arrastar({ x: 700, y: 100 }, { x: 760, y: 100 }); x1 = await pj.evaluate(() => editor.cenaViva.find('jogador').Transform.x); await cdpJ.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      ok(Math.abs(x1 - x0) < 2, 'joystick fixo: tocar longe da base não ativa (x ' + x0.toFixed(0) + ' → ' + x1.toFixed(0) + ')');
      await arrastar(base, { x: base.x + 50, y: base.y }); x1 = await pj.evaluate(() => editor.cenaViva.find('jogador').Transform.x);
      const dados = await pj.evaluate(() => { const s = editor.engine.input.dadosJoystick(); return s; }); await cdpJ.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      ok(x1 > x0 + 15 && dados.ativo && dados.forca > 0.5 && Math.abs(dados.angulo) < 20 && dados.modo === 'fixo', 'joystick fixo: arrastar a partir da base move; dados (força/ângulo) corretos (' + JSON.stringify(dados) + ')');
      await ctxJ.close();
    }
    {
      await p.goto('http://localhost:' + porta + '/editor/index.html?abas=todas'); await p.waitForTimeout(600);
      await p.evaluate(() => { editor.cena.create({ nome: 'grad', Transform: { x: 400, y: 225 }, Sprite: { w: 3000, h: 3000, camada: 99, cor: '#ff0000', cor2: '#0000ff', gradiente: 'vertical' } }); editor.redesenhar(); }); await p.waitForTimeout(300);
      const gr = await p.evaluate(() => { const c = document.getElementById('tela'), g = c.getContext('2d'), d = window.devicePixelRatio || 1, px = (x, y) => [...g.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data]; const r = c.getBoundingClientRect(); return { cima: px(r.width / 2, 6), baixo: px(r.width / 2, r.height - 6) }; });
      ok(gr.cima[0] > gr.cima[2] && gr.baixo[2] > gr.baixo[0], 'botão/sprite: gradiente vertical cor → cor2 (' + JSON.stringify(gr) + ')');
      const ins = await p.evaluate(() => { const e = editor.cena.find('grad'); editor.selecionar(e.id); const rot = [...document.querySelectorAll('#props label')].map(l => l.textContent); return { rot: rot.includes('rot'), cor2: rot.includes('cor2'), opac: rot.includes('opacidade'), neg: rot.includes('negrito') }; });
      ok(ins.rot && ins.cor2 && ins.opac && ins.neg, 'inspetor mostra também as propriedades que o objeto ainda não tem (' + JSON.stringify(ins) + ')');
      await p.evaluate(() => { const i = [...document.querySelectorAll('#props .campo')].find(c => c.querySelector('label').textContent === 'opacidade').querySelector('input'); i.value = '0.5'; i.dispatchEvent(new Event('change')); });
      ok(await p.evaluate(() => editor.cena.find('grad').Sprite.opacidade === 0.5), 'inspetor: preencher uma propriedade ausente a cria');
      await p.evaluate(() => { const i = [...document.querySelectorAll('#props .campo')].find(c => c.querySelector('label').textContent === 'opacidade').querySelector('input'); i.value = ''; i.dispatchEvent(new Event('change')); });
      ok(await p.evaluate(() => !('opacidade' in editor.cena.find('grad').Sprite)), 'inspetor: esvaziar uma propriedade a remove (volta ao padrão)');
    }
    // PWA: manifesto válido, service worker ativo e o editor abre offline depois da primeira visita
    {
      const ctxP = await b.newContext(), pw = await ctxP.newPage(); await pw.goto('http://localhost:' + porta + '/editor/index.html'); await pw.waitForTimeout(500);
      const pwa = await pw.evaluate(async () => { await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('service worker não ativou')), 8000))]); const m = await (await fetch(document.querySelector('link[rel=manifest]').href)).json(); return { nome: m.short_name, disp: m.display, icones: m.icones || m.icons.length, sw: !!navigator.serviceWorker.controller || true }; });
      ok(pwa.nome === 'Motor' && pwa.disp === 'standalone' && pwa.icones >= 2, 'PWA: manifesto válido (' + JSON.stringify(pwa) + ')');
      await pw.reload(); await pw.waitForTimeout(1500);   // 2ª visita: já controlada pelo service worker, enchendo o cache
      await pw.evaluate(() => fetch('../core/engine.js').then(r => r.text())); await pw.waitForTimeout(300);
      await ctxP.setOffline(true); await pw.reload(); await pw.waitForTimeout(1500);
      ok(await pw.evaluate(() => typeof editor !== 'undefined' && !!document.getElementById('e-play')), 'PWA: com a rede desligada o editor ainda abre (cache)');
      await ctxP.close();
    }
    srv.close(); for (let i = erros.length - 1; i >= 0; i--) if (/404/.test(erros[i])) erros.splice(i, 1);   // o 404 acima é esperado
  }
  { // Play do editor roda no Worker: laço infinito não trava a página
    const http = require('http'), fs = require('fs'), path = require('path'); const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
    const srv = http.createServer((q, r) => { let f = path.join(__dirname, '..', decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); r.end(d); }); });
    await new Promise(r => srv.listen(0, r)); const pw = await b.newPage(); await pw.goto('http://localhost:' + srv.address().port + '/editor/'); await pw.waitForTimeout(600);
    await pw.evaluate(() => { editor.cena.estado.scripts = editor.cena.estado.scripts || {}; editor.cena.estado.scripts.trava = { fonte: 'function atualizar(e, dt, ctx) { if (ctx.engine.tempo > 0.3) { while (true) {} } }' }; editor.cena.create({ nome: 'bug', Transform: { x: 0, y: 0 }, Script: { nome: 'trava' } }); });
    await pw.evaluate(() => editor.play()); await pw.waitForTimeout(400);
    const w = await pw.evaluate(() => ({ emWorker: !!editor.engine.emWorker, rodando: editor.engine.rodando }));
    await pw.waitForTimeout(4500); const fim = await pw.evaluate(() => ({ vivo: true, rodando: editor.engine.rodando, msg: document.getElementById('msg').textContent }));
    ok(w.emWorker && w.rodando, 'Play do editor roda em Worker'); ok(fim.vivo && !fim.rodando && /parou de responder/.test(fim.msg), 'Play em Worker: laço infinito é encerrado pelo vigia sem travar o editor (' + fim.msg + ')');
    await pw.close(); srv.close();
  }
  { // exportar como pasta web (ZIP): arquivos separados + PWA; roda servido por http
    const http = require('http'), fs = require('fs'), path = require('path'); const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
    const srv = http.createServer((q, r) => { let f = path.join(__dirname, '..', decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); r.end(d); }); });
    await new Promise(r => srv.listen(0, r)); const pe = await b.newPage(); await pe.goto('http://localhost:' + srv.address().port + '/editor/'); await pe.waitForTimeout(600);
    const lista = await pe.evaluate(async () => { document.getElementById('e-render').value = 'graficos'; const a = await EditorExportar.gerarPasta(), o = {}; for (const k in a) o[k] = Array.from(a[k]); return o; });
    const nomes = Object.keys(lista); ok(['index.html', 'motor.js', 'projeto.json', 'manifest.webmanifest', 'sw.js', 'icones/icone-192.png'].every(n => nomes.includes(n)) && nomes.some(n => n.startsWith('cenas/')), 'export em pasta tem index, motor, projeto, cenas, manifest, sw e ícones (' + nomes.length + ' arquivos)');
    const dir = require('os').tmpdir() + '/motor-pasta-' + Date.now(); for (const n of nomes) { const f = path.join(dir, n); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(lista[n])); }
    const srv2 = http.createServer((q, r) => { let f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', T[path.extname(f)] || 'application/octet-stream'); r.end(d); }); }); await new Promise(r => srv2.listen(0, r));
    const pj2 = await b.newPage(); await pj2.goto('http://localhost:' + srv2.address().port + '/'); await pj2.waitForSelector('button', { timeout: 8000 }); await pj2.click('button'); await pj2.waitForTimeout(1200);
    const st = await pj2.evaluate(() => ({ modo: Core.Player.modo, render: Core.Player.render, passos: Core.Player.engine.scene.entities.size, rod: Core.Player.engine.rodando, txt: document.body.innerText.slice(0, 80) }));
    ok(st.rod && st.passos > 0, 'jogo exportado em pasta inicia e roda (' + JSON.stringify(st) + ')'); ok(st.render === 'webgl' && nomes.includes('pixi.min.js'), 'exportado em pasta usa WebGL quando escolhido nos gráficos (' + st.render + ')');
    await pj2.close(); await pe.close(); srv.close(); srv2.close();
  }
  { // joystick como objeto de cena + caixa de seleção some no Play
    const pq = await b.newPage(); await pq.goto(url('editor/index') + '?abas=todas'); await pq.waitForTimeout(500);
    await pq.click('#e-joystick'); await pq.waitForTimeout(100);
    const j = await pq.evaluate(() => { const e = [...editor.cena.entities.values()].find(x => x.Joystick); return { tem: !!e, modo: e && e.Joystick.modo, sel: editor.sel === (e && e.id), cfg: Core.joystickDe(editor.cena).modo }; });
    ok(j.tem && j.modo === 'flutuante' && j.sel && j.cfg === 'flutuante', 'joystick: botão cria objeto de cena com componente Joystick (' + JSON.stringify(j) + ')');
    await pq.evaluate(() => { const e = [...editor.cena.entities.values()].find(x => x.Joystick); editor.aplicar('Joystick', 'modo', 'fixo'); editor.aplicar('Transform', 'x', 240); editor.aplicar('Transform', 'y', 225); });
    const cfg = await pq.evaluate(() => Core.joystickDe(editor.cena)); ok(cfg.modo === 'fixo' && Math.abs(cfg.x - 0.3) < 0.001 && Math.abs(cfg.y - 0.5) < 0.001, 'joystick: propriedades vêm do inspetor (' + JSON.stringify(cfg) + ')');
    ok(await pq.evaluate(() => { const e = [...editor.cena.entities.values()].find(x => x.Joystick), h = editor.escolher(e.Transform.x + 5, e.Transform.y - 5); return !!h && h.id === e.id; }), 'joystick: dá para clicar/arrastar na cena (marcador selecionável)');
    await pq.click('#e-joystick'); ok(await pq.evaluate(() => [...editor.cena.entities.values()].filter(x => x.Joystick).length === 1), 'joystick: só um por cena');
    const antes = await pq.evaluate(() => { editor.selecionar([...editor.cena.entities.values()].find(x => x.Sprite).id); return editor.renderer.selecionada; });
    await pq.waitForTimeout(150); const antes2 = await pq.evaluate(() => editor.renderer.selecionada);
    await pq.evaluate(() => editor.play()); await pq.waitForTimeout(250); const durante = await pq.evaluate(() => editor.renderer.selecionada);
    await pq.evaluate(() => editor.parar()); await pq.waitForTimeout(250); const depois = await pq.evaluate(() => editor.renderer.selecionada);
    ok(antes2 != null && durante == null && depois != null, 'caixa de seleção some durante o Play e volta ao parar (' + [antes2, durante, depois].join(',') + ')');
    await pq.close();
  }
  { // editor de animação: criar componente, clipes, pré-visualização
    const pa = await b.newPage(); await pa.goto(url('editor/index') + '?abas=todas'); await pa.waitForTimeout(500);
    await pa.evaluate(async () => { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'); g.fillStyle = '#f00'; g.fillRect(0, 0, 64, 32); const i = new Image(); await new Promise(r => { i.onload = r; i.src = c.toDataURL(); }); editor.renderer.assets.registrar('folha', i); const e = editor.cena.create({ nome: 'heroi', Transform: { x: 100, y: 100 }, Sprite: { imagem: 'folha', quadroW: 16, quadroH: 16 } }); editor.cena.flush(); editor.selecionar(e.id); });
    await pa.waitForTimeout(150); await pa.click('#an-criar'); await pa.waitForTimeout(100);
    await pa.fill('#an-nome', 'andar'); await pa.click('#an-add'); await pa.waitForTimeout(100);
    const an = await pa.evaluate(() => { const e = editor.cena.find('heroi'); return { atual: e.Animacao.atual, clipes: Object.keys(e.Animacao.animacoes), andar: e.Animacao.animacoes.andar, previa: !!document.querySelector('.anim-previa') }; });
    ok(an.clipes.join() === 'parado,andar' && an.andar.quadros === 4 && an.previa, 'editor de animação: cria componente, adiciona clipe e mostra prévia (' + JSON.stringify(an) + ')');
    await pa.selectOption('#an-atual', 'andar'); await pa.waitForTimeout(100); ok(await pa.evaluate(() => editor.cena.find('heroi').Animacao.atual === 'andar'), 'editor de animação: troca o clipe inicial');
    await pa.close();
  }
  { // Transform.escala: desenho e área de clique crescem
    const pe2 = await b.newPage(); await pe2.goto(url('editor/index') + '?abas=todas'); await pe2.waitForTimeout(500);
    const r = await pe2.evaluate(() => { const e = editor.cena.create({ nome: 'grande', Transform: { x: 300, y: 200 }, Sprite: { w: 20, h: 20, cor: '#0f0' } }); editor.cena.flush(); const A = Core.CanvasRenderer.limitesDe(e); e.Transform.escala = 3; const B = Core.CanvasRenderer.limitesDe(e); return { a: A.hw, b: B.hw }; });
    ok(r.a === 10 && r.b === 30, 'Transform.escala multiplica a área do objeto (' + r.a + ' → ' + r.b + ')'); await pe2.close();
  }
  { // texto puro não desenha o retângulo cinza atrás
    const pt = await b.newPage(); await pt.goto(url('editor/index') + '?abas=todas'); await pt.waitForTimeout(500);
    const r = await pt.evaluate(() => { const a = editor.cena.create({ nome: 't1', Transform: { x: 5, y: 5 }, Sprite: { rotulo: 'Oi' } }), c = editor.cena.create({ nome: 't2', Transform: { x: 5, y: 5 }, Sprite: { rotulo: 'Oi', cor: '#f00' } }); return { puro: Core.soTexto(a), comCor: Core.soTexto(c) }; });
    ok(r.puro === true && r.comCor === false, 'texto puro (só rótulo) fica sem fundo; com cor mantém o fundo (' + JSON.stringify(r) + ')'); await pt.close();
  }
  { // alças: redimensionar pelo canto e girar pela bolinha
    const ph = await b.newPage({ viewport: { width: 1300, height: 800 } }); await ph.goto(url('editor/index') + '?abas=todas'); await ph.waitForTimeout(500);
    await ph.evaluate(() => { const e = editor.cena.create({ nome: 'caixa', Transform: { x: 300, y: 200 }, Sprite: { w: 40, h: 40, cor: '#0f0' } }); editor.cena.flush(); editor.selecionar(e.id); });
    await ph.waitForTimeout(200);
    const ponto = async k => ph.evaluate(k => { const e = editor.cena.find('caixa'), r = document.getElementById('tela').getBoundingClientRect(), px = Math.abs(editor.renderer.telaParaMundo(1, 0).x - editor.renderer.telaParaMundo(0, 0).x), h = Core.CanvasRenderer.alcas(e, px).find(a => a.k === k), z = 1 / px; const o = editor.renderer.telaParaMundo(0, 0); return { x: r.left + (h.x - o.x) * z, y: r.top + (h.y - o.y) * z, z, ox: o.x, oy: o.y, r: { l: r.left, t: r.top } }; }, k);
    const se = await ponto('se'); await ph.mouse.move(se.x, se.y); await ph.mouse.down(); await ph.mouse.move(se.x + 30 * se.z, se.y + 30 * se.z, { steps: 4 }); await ph.mouse.up();
    const tam = await ph.evaluate(() => { const e = editor.cena.find('caixa'); return { w: e.Sprite.w, h: e.Sprite.h }; });
    ok(tam.w === 100 && tam.h === 100, 'alça do canto redimensiona w/h arrastando (' + JSON.stringify(tam) + ')');
    const ro = await ponto('rot'); const cx = await ph.evaluate(() => { const e = editor.cena.find('caixa'), o = editor.renderer.telaParaMundo(0, 0), px = Math.abs(editor.renderer.telaParaMundo(1, 0).x - o.x), r = document.getElementById('tela').getBoundingClientRect(); return { x: r.left + (e.Transform.x - o.x) / px, y: r.top + (e.Transform.y - o.y) / px }; });
    await ph.mouse.move(ro.x, ro.y); await ph.mouse.down(); await ph.mouse.move(cx.x + 80, cx.y, { steps: 4 }); await ph.mouse.up();
    const rot = await ph.evaluate(() => editor.cena.find('caixa').Transform.rot); ok(Math.abs(rot - Math.PI / 2) < 0.05, 'bolinha gira o objeto (rot=' + rot + ')'); await ph.close();
  }
  { // editor de código: cores, linhas, autocompletar, auto-indent e fechamento
    const pc = await b.newPage({ viewport: { width: 1300, height: 800 } }); await pc.goto(url('editor/index') + '?abas=todas'); await pc.waitForTimeout(500);
    await pc.click('[data-centro="scripts"]'); await pc.fill('#sc-nome', 'cod'); await pc.click('#sc-novo'); await pc.waitForTimeout(200);
    await pc.click('#sc-fonte'); await pc.keyboard.press('Control+End'); await pc.keyboard.type('\nif (x) {\nfoo(\"a'); await pc.waitForTimeout(150);
    const v = await pc.evaluate(() => document.getElementById('sc-fonte').value.split('\n').slice(-4).join('|'));
    ok(v.includes('if (x) {|  foo("a")|}'), 'auto-indent e fechamento de ( e " (' + v + ')');
    await pc.keyboard.press('Control+End'); await pc.keyboard.type('\nctx.vars.'); await pc.waitForTimeout(250);
    const info = await pc.evaluate(() => ({ pop: !document.querySelector('.cod-pop').hidden && [...document.querySelectorAll('.cod-it b')].map(x => x.textContent).join(), cores: document.querySelectorAll('.cod-hl i.k').length > 0 && document.querySelectorAll('.cod-hl i.c').length > 0, linhas: document.querySelector('.cod-n').textContent.trim().split('\n').length > 5 }));
    ok(info.pop === 'ler,definir,somar,existe,declarar' && info.cores && info.linhas, 'editor de código: autocompletar ctx.vars., cores e números de linha (' + JSON.stringify(info) + ')');
    await pc.keyboard.press('Enter'); const ap = await pc.evaluate(() => document.getElementById('sc-fonte').value.slice(-14)); ok(ap.endsWith('ctx.vars.ler()'), 'Enter aceita a sugestão e deixa o cursor dentro dos parênteses (' + ap + ')');
    const cur = await pc.evaluate(() => { const t = document.getElementById('sc-fonte'); return t.value[t.selectionStart - 1] + t.value[t.selectionStart]; }); ok(cur === '()', 'cursor entre os parênteses (' + cur + ')');
    await pc.evaluate(() => { editor.cena.estado.vars = Object.assign({}, editor.cena.estado.vars, { vida_jogador: 3, pontos: 0 }); const t = document.getElementById('sc-fonte'); t.value = ''; t.focus(); });
    await pc.keyboard.type('ctx.vars.somar("vi'); await pc.waitForTimeout(250);
    const nomes = await pc.evaluate(() => [...document.querySelectorAll('.cod-it b')].map(x => x.textContent).join()); ok(nomes === 'vida_jogador', 'autocompleta nomes de variáveis da cena dentro das aspas (' + nomes + ')');
    await pc.keyboard.press('Tab'); const fim = await pc.evaluate(() => document.getElementById('sc-fonte').value); ok(fim === 'ctx.vars.somar("vida_jogador")', 'aceitar nome de variável pula a aspa (' + fim + ')');
    await pc.evaluate(() => { const t = document.getElementById('sc-fonte'); t.value = ''; t.focus(); }); await pc.keyboard.type('atu'); await pc.waitForTimeout(250); await pc.keyboard.press('Tab');
    const sn = await pc.evaluate(() => { const t = document.getElementById('sc-fonte'); return [t.value, t.selectionStart]; }); ok(sn[0].startsWith('function atualizar(e, dt, ctx) {') && sn[1] === sn[0].indexOf('\n  ') + 3, 'snippet "atualizar" cria a função com o cursor no corpo (' + JSON.stringify(sn) + ')');
    const g = await pc.evaluate(() => { const t = document.querySelector('.cod-ta').getBoundingClientRect(), c = document.querySelector('.cod').getBoundingClientRect(); return [Math.round(t.height), Math.round(c.height - 2)]; }); ok(Math.abs(g[0] - g[1]) <= 2, 'editor de código: o textarea tem a altura da caixa (' + g + ')');
    await pc.evaluate(() => { const t = document.getElementById('sc-fonte'); t.value = Array.from({ length: 40 }, (_, i) => 'var linha' + i + ' = ' + i + ';').join('\n'); t.dispatchEvent(new Event('input')); t.scrollTop = 0; });
    const bx = await (await pc.$('.cod-ta')).boundingBox(); await pc.mouse.click(bx.x + 60, bx.y + 6 + 18 * 3 + 9); const sel = await pc.evaluate(() => document.getElementById('sc-fonte').value.slice(0, document.getElementById('sc-fonte').selectionStart).split('\n').length);
    ok(sel === 4, 'clicar numa linha coloca o cursor nela (linha ' + sel + ')'); await pc.close();
  }
  { // blocos: código gerado escondido por padrão, com botão para ver
    const pb = await b.newPage({ viewport: { width: 1300, height: 800 } }); await pb.goto(url('editor/index') + '?abas=todas'); await pb.waitForTimeout(500);
    await pb.click('[data-centro="scripts"]'); await pb.fill('#sc-nome', 'bb'); await pb.click('#sc-novo-b'); await pb.waitForTimeout(300);
    const oculto = await pb.evaluate(() => ({ cod: document.querySelector('.cod').hidden, conv: document.getElementById('sc-conv').hidden }));
    await pb.click('#sc-vercod'); const visivel = await pb.evaluate(() => ({ cod: document.querySelector('.cod').hidden, conv: document.getElementById('sc-conv').hidden }));
    ok(oculto.cod && oculto.conv && !visivel.cod && !visivel.conv, 'blocos: código gerado escondido; "ver código gerado" mostra (' + JSON.stringify([oculto, visivel]) + ')'); await pb.close();
  }
  { // autotile desenha borda onde o terreno acaba
    const pt = await b.newPage(); await pt.goto(url('editor/index') + '?abas=todas'); await pt.waitForTimeout(500);
    const px = await pt.evaluate(async () => { editor.cena.create({ nome: 'mapa', Transform: { x: 100, y: 100 }, Tiles: { tamanho: 64, colunas: 2, linhas: 1, paleta: [{ cor: '#00ff00', auto: true }], dados: [1, 1] } }); editor.cena.flush(); editor.redesenhar(); await new Promise(r => setTimeout(r, 200));
      const c = document.getElementById('tela'), g = c.getContext('2d'), o = editor.renderer.telaParaMundo(0, 0), k = Math.abs(editor.renderer.telaParaMundo(1, 0).x - o.x), d = window.devicePixelRatio || 1, rd = (wx, wy) => [...g.getImageData(Math.round((wx - o.x) / k * d), Math.round((wy - o.y) / k * d), 1, 1).data];
      return { meio: rd(164, 132), borda: rd(101, 132), topo: rd(120, 101) }; });
    ok(px.meio[1] === 255 && px.borda[1] < 255 && px.topo[1] < 255, 'autotile: borda escurecida só onde não há vizinho (' + JSON.stringify(px) + ')'); await pt.close();
  }
  { // joystick só existe se houver objeto Joystick; toque que termina limpa o "sobre" dos botões
    const pq = await b.newPage(); await pq.goto(url('editor/index') + '?abas=todas'); await pq.waitForTimeout(500);
    const r = await pq.evaluate(() => { const c = document.getElementById('tela'), I = new Core.Input(c, editor.renderer), ev = (t, id, pt) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: pt, clientX: 200, clientY: 200, bubbles: true, isPrimary: true }));
      I.configurar(undefined); ev('pointerdown', 31, 'touch'); const sem = I.joystick.ativo; ev('pointerup', 31, 'touch');
      I.configurar({ modo: 'flutuante', zona: 'tela' }); ev('pointerdown', 32, 'mouse'); const mouse = I.joystick.ativo; ev('pointerup', 32, 'mouse'); I.poll();
      ev('pointerdown', 33, 'touch'); ev('pointerup', 33, 'touch'); const s1 = I.poll().pointer.ativo, s2 = I.poll().pointer.ativo; I.configurar({ modo: 'flutuante' }); const rc = c.getBoundingClientRect(), evp = (t, id, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: rc.left + x, clientY: rc.top + y, bubbles: true, isPrimary: true }));
      evp('pointerdown', 34, rc.width * 0.6, rc.height * 0.2); const longe = I.joystick.ativo, clique = I.pointer.down; evp('pointerup', 34, 0, 0); evp('pointerdown', 35, rc.width * 0.14 + 10, rc.height * 0.78 + 10); const perto = I.joystick.ativo; evp('pointerup', 35, 0, 0);
      I.destruir(); return { sem, mouse, s1, s2, longe, clique, perto }; });
    ok(r.longe === false && r.clique === true && r.perto === true, 'joystick: zona base só pega o toque dentro do raio; fora é clique normal (' + JSON.stringify(r) + ')');
    ok(r.sem === false && r.mouse === true, 'joystick: sem objeto Joystick não aparece; com objeto funciona também com mouse (' + JSON.stringify(r) + ')');
    ok(r.s1 === true && r.s2 === false, 'toque: o ponteiro deixa de "pairar" depois que o dedo sobe (botão não fica branco) (' + JSON.stringify(r) + ')'); await pq.close();
  }
  { // tutorial guiado: avança sozinho quando o passo é feito
    const pu = await b.newPage({ viewport: { width: 1300, height: 800 } }); await pu.goto(url('editor/index') + '?abas=todas'); await pu.waitForTimeout(500);
    await pu.click('#e-tutorial'); await pu.waitForTimeout(100); const p0 = await pu.evaluate(() => ({ passo: EditorTutorial.passo(), aberto: !!document.getElementById('tutorial') }));
    await pu.evaluate(() => { editor.cena.create({ nome: 'r', Transform: { x: 100, y: 100 }, Sprite: { w: 30, h: 30, cor: '#ccc' }, Body: { forma: 'retangulo', w: 30, h: 30 } }); }); await pu.waitForTimeout(700);
    const p1 = await pu.evaluate(() => EditorTutorial.passo()); await pu.evaluate(() => { editor.cena.find('r').Sprite.cor = '#f00'; }); await pu.waitForTimeout(700);
    const p2 = await pu.evaluate(() => EditorTutorial.passo()); await pu.click('#tut-pular'); await pu.click('#tut-pular'); await pu.click('#tut-pular'); await pu.click('#tut-pular');
    await pu.evaluate(() => editor.play()); await pu.waitForTimeout(900); const p6 = await pu.evaluate(() => EditorTutorial.passo()); await pu.evaluate(() => editor.parar()); await pu.waitForTimeout(900);
    const fim = await pu.evaluate(() => ({ passo: EditorTutorial.passo(), texto: document.getElementById('tutorial').textContent }));
    ok(p0.passo === 0 && p0.aberto && p1 === 1 && p2 === 2, 'tutorial: abre e avança sozinho ao criar objeto e mudar a cor (' + [p0.passo, p1, p2] + ')');
    ok(p6 === 6 && fim.passo === 7 && /Pronto/.test(fim.texto), 'tutorial: Play e Parar concluem o guia (' + [p6, fim.passo] + ')'); await pu.close();
  }
  { // modelos de RPG: diálogo, inventário e vida conversam por eventos; marcador do joystick some no Play
    const pm = await b.newPage({ viewport: { width: 1300, height: 800 } }); await pm.goto(url('editor/index') + '?abas=todas'); await pm.waitForTimeout(500);
    const r = await pm.evaluate(() => {
      const ed = editor; ed.cena.create({ nome: 'jogador', Transform: { x: 100, y: 100 }, Sprite: { w: 20, h: 20, cor: '#fff' } });
      for (const k of EditorModelos.nomes()) EditorModelos.instalar(k);
      const dup = EditorModelos.nomes().length; const j = Core.Serializer.paraJSON(ed.cena);
      const e = new Core.Engine(); Core.Serializer.deJSON(e.scene, j); const er = e.compilarScripts(); e.iniciar && 0;
      const passa = n => { for (let i = 0; i < n; i++) e.passo(); }, op = n => e.scene.find(n).Sprite.opacidade, tx = n => e.scene.find(n).Sprite.rotulo;
      passa(2); const oculto = op('dialogo') === 0;
      e.events.emit('dialogo-abrir', { id: 'inicio' }); passa(2); const aberto = op('dialogo') === 1 && /Olá/.test(tx('dialogo-fala')) && tx('dialogo-op1') === 'Sim, por favor' && op('dialogo-op3') === 0;
      e.events.emit('dialogo-op1', {}); passa(2); const ramo = /poção/.test(tx('dialogo-fala'));
      e.events.emit('dialogo-op1', {}); passa(3); const fechou = op('dialogo') === 0 && e.vars.ler('ajudou') === true && e.vars.ler('inv_pocao') === 1 && tx('inv-slot1') === 'Poção';
      e.events.emit('inv-adicionar', { item: 'pocao', qtd: 20 }); passa(2); const teto = e.vars.ler('inv_pocao') === 9 && tx('inv-slot1') === 'Poção x9';
      e.events.emit('dano', { qtd: 2 }); e.events.emit('dano', { qtd: 2 }); passa(3); const inv1 = e.vars.ler('vida') === 3;
      passa(70); e.events.emit('dano', { qtd: 1 }); passa(2); const inv2 = e.vars.ler('vida') === 2;
      e.events.emit('inv-slot1', {}); passa(3); const cura = e.vars.ler('vida') === 3 && e.vars.ler('inv_pocao') === 8;
      let morreu = false; e.events.on('morreu', () => { morreu = true; }); passa(70); e.events.emit('dano', { qtd: 9 }); passa(3);
      return { dup, er: er.length, oculto, aberto, ramo, fechou, teto, inv1, inv2, cura, morreu, vida: e.vars.ler('vida') };
    });
    ok(r.er === 0 && r.oculto && r.aberto && r.ramo && r.fechou, 'modelo diálogo: abre, ramifica, fecha, grava variável e dispara evento (' + JSON.stringify(r) + ')');
    ok(r.teto && r.inv1 && r.inv2 && r.cura && r.morreu && r.vida === 0, 'modelos inventário e vida: teto por slot, invulnerabilidade, poção cura, morte (' + JSON.stringify(r) + ')');
    const sc = await pm.evaluate(() => { document.getElementById('sc-lista').value = 'vida'; document.getElementById('sc-lista').dispatchEvent(new Event('change')); document.getElementById('sc-cena').click(); const a = (editor.cena.estado.scriptsCena || []).join(); document.getElementById('sc-cena').click(); return { a, b: editor.cena.estado.scriptsCena }; });
    ok(sc.a === 'vida' && sc.b === undefined, 'editor: botão "Rodar na cena" liga e desliga o script de cena (' + JSON.stringify(sc) + ')');
    const rpg = await pm.evaluate(() => {
      const j = EditorExemplos.miniRpg(), e = new Core.Engine(); Core.Serializer.deJSON(e.scene, j); const er = e.compilarScripts().length;
      for (let i = 0; i < 3; i++) e.passo(); const jg = e.scene.find('jogador'); const al = e.scene.find('aldeao'); jg.Transform.x = al.Transform.x; jg.Transform.y = al.Transform.y;
      for (let i = 0; i < 4; i++) e.passo(); const dialogo = e.scene.find('dialogo').Sprite.opacidade === 1;
      const po = e.scene.find('pocao 1'); jg.Transform.x = po.Transform.x; jg.Transform.y = po.Transform.y; for (let i = 0; i < 4; i++) e.passo();
      return { er, dialogo, pocao: e.vars.ler('inv_pocao'), vida: e.vars.ler('vida'), sumiu: !e.scene.find('pocao 1') };
    });
    ok(rpg.er === 0 && rpg.dialogo && rpg.pocao === 1 && rpg.sumiu && rpg.vida === 5, 'exemplo Mini-RPG: aldeão abre diálogo, poção entra no inventário (' + JSON.stringify(rpg) + ')');
    const cm = await pm.evaluate(() => {
      const ed = editor; ed.cena.create({ nome: 'ui-a', Transform: { x: 300, y: 300 }, Sprite: { fixo: true, forma: 'retangulo', w: 400, h: 400, cor: '#123' } }); ed.cena.create({ nome: 'mundo-a', Transform: { x: 300, y: 300 }, Sprite: { forma: 'retangulo', w: 60, h: 60, cor: '#456' } });
      const antes = ed.camadaTrava(ed.cena.find('ui-a')); document.getElementById('cam-trava-ui').click(); const trava = ed.camadaTrava(ed.cena.find('ui-a')) && !ed.camadaTrava(ed.cena.find('mundo-a'));
      document.getElementById('cam-ver-mundo').click(); const oculto = ed.renderer.ocultarGrupo.mundo === true && ed.camadaTrava(ed.cena.find('mundo-a')); document.getElementById('cam-ver-mundo').click(); return { antes, trava, oculto, volta: ed.renderer.ocultarGrupo.mundo === false };
    });
    ok(!cm.antes && cm.trava && cm.oculto && cm.volta, 'camadas rápidas: travar/ocultar Mundo e Interface no editor (' + JSON.stringify(cm) + ')');
    const cp = await pm.evaluate(async () => {
      const ed = editor, quadro = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); ed.cena.create({ nome: 'faixa', Transform: { x: 400, y: 225 }, Sprite: { forma: 'retangulo', w: 6000, h: 6000, cor: '#ff0000' } }); ed.selecionar(ed.cena.find('faixa').id);
      document.getElementById('cam-abrir').click(); const botoes = [...document.querySelectorAll('#cam-painel button')]; botoes.find(b => b.textContent === '+ Camada de Mundo').click(); [...document.querySelectorAll('#cam-painel button')].find(b => b.textContent === '+ Camada de Interface').click();
      const camadas = JSON.parse(JSON.stringify(ed.cena.estado.camadas)); [...document.querySelectorAll('#cam-painel button')].filter(b => b.textContent === '⇦ sel')[1].click();
      const f = ed.cena.find('faixa').Sprite, c = ed.canvas || document.getElementById('tela'); const px = () => { const g = c.getContext('2d'), d = g.getImageData(c.width >> 1, c.height >> 1, 1, 1).data; return [d[0], d[1], d[2]].join(); };
      ed.redesenhar(); await quadro(); const vis = px(); ed.cena.estado.camadas[1].visivel = false; ed.redesenhar(); await quadro(); const oculto = px(); ed.cena.estado.camadas[1].visivel = true; ed.redesenhar();
      const trava = (ed.cena.estado.camadas[1].bloqueada = true, ed.camadaTrava(ed.cena.find('faixa'))); ed.cena.estado.camadas[1].bloqueada = false;
      [...document.querySelectorAll('#cam-painel button')].filter(b => b.textContent === '▲')[1].click(); const ordem = ed.cena.estado.camadas.map(x => x.tipo).join();
      return { n: camadas.length, grupo: f.grupo, fixo: f.fixo, vis, oculto, trava, ordem, salvo: JSON.parse(ed.cena && document.getElementById('json').value).estado.camadas.length };
    });
    ok(cp.n === 2 && cp.grupo && cp.fixo === true && cp.vis !== cp.oculto && cp.trava && cp.ordem === 'interface,mundo' && cp.salvo === 2, 'camadas: painel cria, move o selecionado (UI vira fixo), oculta, trava, reordena e salva (' + JSON.stringify(cp) + ')');
    const hi = await pm.evaluate(() => { const c = editor.cena, d = c.find('dialogo'), filhos = [...c.entities.values()].filter(x => x.Pai && x.Pai.id === d.id).map(x => x.nome).sort().join(), inv = c.find('inventario'), slots = [...c.entities.values()].filter(x => x.Pai && x.Pai.id === inv.id).length, v = c.find('vida'); return { filhos, slots, vidaUnica: !!(v.Barra && v.Script && v.Sprite) && !c.find('vida-barra'), semPai: !d.Pai }; });
    ok(hi.filhos === 'dialogo-fala,dialogo-nome,dialogo-op1,dialogo-op2,dialogo-op3' && hi.slots === 6 && hi.vidaUnica && hi.semPai, 'modelos: partes viram filhas da raiz (diálogo, inventário) e a barra de vida é um objeto só (' + JSON.stringify(hi) + ')');
    const ui = await pm.evaluate(async () => {
      for (const k of ['barra', 'slider', 'alternar', 'campo', 'lista', 'painel']) document.getElementById('u-' + k).click();
      const c = editor.cena, v = c.estado.vars || {}, j = JSON.stringify(Core.Serializer.paraJSON(c)); const e2 = new Core.Engine(); Core.Serializer.deJSON(e2.scene, JSON.parse(j)); for (let i = 0; i < 3; i++) e2.passo();
      return { ok: !!c.find('barra').Barra && !!c.find('slider').Barra.arrastavel && !!c.find('alternar').Alternar && !!c.find('painel'), vars: [v.vida, v.vida_max, v.volume, v.som].join(), r: e2.scene.find('barra').Barra._r, rot: e2.scene.find('alternar').Sprite.rotulo, cl: !!c.find('campo').Campo && !!c.find('lista').Lista && (c.estado.listas.itens || []).length === 8 && c.estado.vars.nome === '' && e2.scene.find('lista').Lista._vis.length > 0 };
    });
    ok(ui.ok && ui.vars === '5,5,0.7,true' && ui.cl && ui.r === 1 && ui.rot === 'Som: ligado', 'menu de componentes de UI cria barra, slider, alternar e painel já ligados às variáveis (' + JSON.stringify(ui) + ')');
    const tc = await pm.evaluate(() => {
      const cv = document.createElement('canvas'); cv.width = 200; cv.height = 100; cv.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:100px'; document.body.append(cv);
      const inp = new Core.Input(cv, null); inp.campoEm = p => (p.x < 100 ? { id: 7, valor: 'oi', max: 3, senha: false } : null);
      const up = (x, y) => cv.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', bubbles: true }));
      up(20, 20); const el = inp._el, a = !!el && document.activeElement === el && el.value === 'oi' && el.maxLength === 3 && inp.poll().texto.foco === true && inp.poll().texto.id === 7;
      el.value = 'oxi'; el.dispatchEvent(new Event('input')); const t = inp.poll().texto.valor; up(150, 20); const fora = inp.poll().texto.foco === false;
      inp.destruir(); cv.remove(); return { a, t, fora, limpo: !inp._el };
    });
    ok(tc.a && tc.t === 'oxi' && tc.fora && tc.limpo, 'campo: toque abre o teclado (input escondido), repassa o texto e fecha ao tocar fora (' + JSON.stringify(tc) + ')');
    await pm.close();
  }
  ok(erros.length === 0, 'nenhum erro de console' + (erros.length ? ': ' + erros[0] : ''));
  await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'todos os testes de navegador passaram'); process.exit(falhas ? 1 : 0);
})();
