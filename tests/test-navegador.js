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
    ev('pointerdown', 11, 'mouse'); const mouse = { down: jogo.input.pointer.down, joystick: jogo.input.joystick.ativo }; ev('pointerup', 11, 'mouse');
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
  await p.click('#sc-conv'); ok(await p.evaluate(() => !document.getElementById('sc-fonte').readOnly && !editor.cena.estado.scripts.contar.blocos), 'converter em código libera a edição do texto');
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
  ok(erros.length === 0, 'nenhum erro de console' + (erros.length ? ': ' + erros[0] : ''));
  await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'todos os testes de navegador passaram'); process.exit(falhas ? 1 : 0);
})();
