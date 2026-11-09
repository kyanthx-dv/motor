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
  await p.setViewportSize({ width: 1300, height: 760 }); await p.goto(url('editor/index')); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.querySelectorAll('#projetos option').length === 1 && editor.projetoAtual === 'Exemplo'), 'M11 cria projeto inicial na lista local');
  await p.fill('#projeto-nome', 'Projeto 2'); await p.click('#projeto-criar'); await p.waitForTimeout(80); ok(await p.evaluate(() => document.querySelectorAll('#projetos option').length === 2 && editor.projetoAtual === 'Projeto 2' && editor.cena.entities.size === 0), 'M11 cria projeto vazio');
  await p.fill('#projeto-nome', 'Projeto Renomeado'); await p.click('#projeto-renomear'); await p.waitForTimeout(50); ok(await p.evaluate(() => editor.projetoAtual === 'Projeto Renomeado' && ![...document.querySelectorAll('#projetos option')].some(o => o.value === 'Projeto 2')), 'M11 renomeia projeto');
  await p.selectOption('#projetos', 'Exemplo'); await p.click('#projeto-abrir'); await p.waitForTimeout(80); ok(await p.evaluate(() => editor.projetoAtual === 'Exemplo' && editor.cena.entities.size === 5), 'M11 abre projeto salvo');
  await p.selectOption('#projetos', 'Projeto Renomeado'); p.once('dialog', d => d.accept()); await p.click('#projeto-apagar'); await p.waitForTimeout(80); ok(await p.evaluate(() => document.querySelectorAll('#projetos option').length === 1 && editor.projetoAtual === 'Exemplo'), 'M11 apaga projeto');
  ok(await p.evaluate(() => document.querySelectorAll('#lista button').length === 5 && !!window.editor), 'editor abre com 5 objetos na lista');
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
  const passosEditor = await p.evaluate(() => ({ passos: editor.engine.passos, x: editor.cena.find('bola').Transform.x })); await p.click('#e-play'); await p.waitForTimeout(180); const playState = await p.evaluate(p0 => ({ rodando: editor.engine.rodando, andou: editor.engine.passos > p0.passos, historicoDesabilitado: document.getElementById('e-desfazer').disabled && document.getElementById('e-refazer').disabled }), passosEditor); await p.click('#e-parar'); await p.waitForTimeout(80); const stopState = await p.evaluate(p0 => ({ rodando: editor.engine.rodando, desabilitaPlay: document.getElementById('e-play').disabled, restaurou: Math.abs(editor.cena.find('bola').Transform.x - p0.x) < 0.001 }), passosEditor);
  ok(playState.rodando && playState.andou, 'editor E2 Play inicia o motor'); ok(playState.historicoDesabilitado, 'M12 Play desabilita o histórico'); ok(!stopState.rodando && !stopState.desabilitaPlay && stopState.restaurou, 'editor E2 Parar interrompe e restaura a cena');
  const jogadorX = await p.evaluate(() => ({ x: editor.cena.find('jogador').Transform.x, input: editor.engine.input })); ok(jogadorX.input === null, 'editor M8 não mantém Input fora do Play');
  await p.click('#e-play'); await p.keyboard.down('ArrowRight'); await p.waitForTimeout(240); await p.keyboard.up('ArrowRight'); const inputPlay = await p.evaluate(x => ({ move: editor.cena.find('jogador').Transform.x > x + 10, ativo: !!editor.engine.input }), jogadorX.x); ok(inputPlay.move && inputPlay.ativo, 'editor M8 no Play: seta move o jogador com Controller');
  await p.click('#e-parar'); await p.waitForTimeout(80); ok(await p.evaluate(x => editor.engine.input === null && Math.abs(editor.cena.find('jogador').Transform.x - x) < 0.001, jogadorX.x), 'editor M8 Parar destrói o Input e restaura a cena');
  await p.click('#e-jogar'); await p.waitForTimeout(180); ok(await p.evaluate(() => document.body.classList.contains('modo-jogo') && editor.engine.rodando && !!editor.engine.input), 'M11 Jogar entra em tela cheia com entrada ligada');
  await p.click('#e-sair-jogar'); await p.waitForTimeout(120); ok(await p.evaluate(() => !document.body.classList.contains('modo-jogo') && !editor.engine.rodando && editor.engine.input === null), 'M11 Sair do jogo interrompe e desliga a entrada');
  await p.screenshot({ path: process.env.EDITOR_PNG || '/tmp/editor.png' });
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'editor sem rolagem horizontal no celular');
  // editor E3a: scripts em JS dentro da cena
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index')); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'andar'); await p.click('#sc-novo');
  await p.fill('#sc-fonte', 'function atualizar(e, dt, ctx) { e.Transform.x += 100 * dt; ctx.vars.somar("pontos"); }');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('#sc-anexar'); await p.waitForTimeout(100); const scriptX = await p.evaluate(() => editor.cena.find('bola').Transform.x);
  ok(await p.evaluate(() => editor.cena.find('bola').Script.nome === 'andar' && JSON.parse(document.getElementById('json').value).estado.scripts.andar.fonte.includes('100 * dt')), 'criar e anexar script grava no JSON da cena');
  await p.click('#e-desfazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => !editor.cena.find('bola').Script), 'M12 desfaz anexação de script'); await p.click('#e-refazer'); await p.waitForTimeout(60); ok(await p.evaluate(() => editor.cena.find('bola').Script && editor.cena.find('bola').Script.nome === 'andar'), 'M12 refaz anexação de script');
  const fonteAntesUndo = await p.inputValue('#sc-fonte'); const cenaAntesUndo = await p.evaluate(() => JSON.stringify(Core.Serializer.paraJSON(editor.cena))); await p.locator('#sc-fonte').press('End'); await p.keyboard.type('X'); await p.keyboard.press('Control+Z'); await p.waitForTimeout(60); ok(await p.inputValue('#sc-fonte') === fonteAntesUndo && await p.evaluate(x => JSON.stringify(Core.Serializer.paraJSON(editor.cena)) === x, cenaAntesUndo), 'Ctrl+Z em #sc-fonte usa o desfazer nativo e não o histórico da cena');
  const jsonAntesUndo = await p.inputValue('#json'); await p.locator('#json').press('End'); await p.keyboard.type('X'); await p.keyboard.press('Control+Z'); await p.waitForTimeout(60); ok(await p.inputValue('#json') === jsonAntesUndo && await p.evaluate(x => JSON.stringify(Core.Serializer.paraJSON(editor.cena)) === x, cenaAntesUndo), 'Ctrl+Z em #json usa o desfazer nativo e não o histórico da cena');
  await p.click('#e-play'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => editor.cena.find('bola').Transform.x > 360 && editor.engine.vars.ler('pontos') > 10), 'Play compila e roda o script (move o objeto e usa variáveis)');
  await p.click('#e-parar'); await p.waitForTimeout(150);
  ok(await p.evaluate(x => Math.abs(editor.cena.find('bola').Transform.x - x) < 0.001 && !!editor.cena.estado.scripts.andar && editor.engine.vars.ler('pontos') === 0, scriptX), 'Parar restaura a cena e mantém o script');
  await p.fill('#sc-fonte', 'function atualizar( {');
  ok(await p.evaluate(() => /sintaxe/i.test(document.getElementById('sc-msg').textContent)), 'erro de sintaxe aparece enquanto digita');
  await p.click('#e-play'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => editor.engine.rodando && /Ao iniciar/.test(document.getElementById('sc-msg').textContent)), 'Play com script quebrado avisa e não derruba o motor');
  await p.click('#e-parar');
  await p.click('#sc-remover'); ok(await p.evaluate(() => !editor.cena.find('bola').Script && !('andar' in editor.cena.estado.scripts)), 'remover script também desanexa dos objetos');
  // editor E3b: blocos pela interface
  await p.setViewportSize({ width: 1300, height: 900 }); await p.goto(url('editor/index')); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'contar'); await p.click('#sc-novo-b');
  await p.locator('#bl > select.add').selectOption('evento_quadro');
  await p.locator('#bl .hat select.add').selectOption('var_somar');
  await p.locator('#bl .hat select.add').selectOption('mover_x');
  await p.waitForTimeout(100);
  ok(await p.evaluate(() => /function atualizar/.test(document.getElementById('sc-fonte').value) && /ctx\.vars\.somar\("pontos", 1\)/.test(document.getElementById('sc-fonte').value) && document.getElementById('sc-fonte').readOnly), 'blocos geram o código (somente leitura) conforme você monta');
  const codigoBlocos = await p.inputValue('#sc-fonte'); await p.click('#e-desfazer'); await p.waitForTimeout(60); await p.click('#e-refazer'); await p.waitForTimeout(60); ok(await p.inputValue('#sc-fonte') === codigoBlocos, 'M12 desfaz/refaz alteração de bloco');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('#sc-anexar'); await p.click('#e-play'); await p.waitForTimeout(700); 
  ok(await p.evaluate(() => editor.engine.vars.ler('pontos') > 10 && editor.cena.find('bola').Transform.x > 350), 'Play roda o script feito com blocos');
  await p.click('#e-parar');
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
  await p.goto(url('editor/index')); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'tz'); await p.click('#sc-novo-b');
  await p.locator('#bl > select.add').selectOption('evento_quadro'); await p.locator('#bl .hat select.add').selectOption('se');
  await p.locator('#bl select[aria-label="tipo de condição"]').selectOption('tecla'); await p.locator('#bl select[aria-label="tipo de tecla"]').selectOption('livre');
  await p.click('#bl button.tecla'); await p.keyboard.press('x'); await p.waitForTimeout(100);
  await p.locator('#bl .hat > .pilha > .bloco > select.add').first().selectOption('var_somar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /keys\.has\("x"\)/.test(document.getElementById('sc-fonte').value)), 'escolher "qualquer tecla" capturando a tecla apertada');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); await p.click('#sc-anexar'); await p.click('#e-play'); await p.waitForTimeout(300);
  const antes = await p.evaluate(() => editor.engine.vars.ler('pontos')); await p.keyboard.down('x'); await p.waitForTimeout(300); await p.keyboard.up('x'); await p.waitForTimeout(100);
  const dep = await p.evaluate(() => editor.engine.vars.ler('pontos'));
  ok(antes === 0 && dep > 5, 'no Play, a tecla escolhida dispara o bloco (sem tecla = nada)'); await p.click('#e-parar');
  // blocos novos pela interface: temporizador + criar objeto
  await p.goto(url('editor/index')); await p.waitForTimeout(400);
  await p.fill('#sc-nome', 'chuva'); await p.click('#sc-novo-b');
  await p.locator('#bl > select.add').selectOption('evento_quadro'); await p.locator('#bl .hat select.add').selectOption('temporizador'); await p.waitForTimeout(100);
  await p.locator('#bl .bloco.cat-Controle select.add').first().selectOption('criar'); await p.waitForTimeout(100);
  ok(await p.evaluate(() => /st\["t0"\]/.test(document.getElementById('sc-fonte').value) && /ctx\.scene\.create/.test(document.getElementById('sc-fonte').value)), 'temporizador com "criar objeto" dentro gera o código');
  await p.evaluate(() => editor.selecionar(editor.cena.find('bola').id)); const antesN = await p.evaluate(() => editor.cena.entities.size); await p.click('#sc-anexar'); await p.click('#e-play'); await p.waitForTimeout(1500);
  const criados = await p.evaluate(() => [...editor.cena.entities.values()].filter(x => x.nome === 'criado').length);
  ok(criados >= 1, 'Play: o temporizador cria objetos durante o jogo (' + criados + ')');
  await p.click('#e-parar'); await p.waitForTimeout(150);
  ok(await p.evaluate(n => editor.cena.entities.size === n, antesN), 'Parar descarta os objetos criados durante o jogo');
  ok(erros.length === 0, 'nenhum erro de console' + (erros.length ? ': ' + erros[0] : ''));
  await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'todos os testes de navegador passaram'); process.exit(falhas ? 1 : 0);
})();
