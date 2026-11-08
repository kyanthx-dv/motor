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
  ok(erros.length === 0, 'nenhum erro de console' + (erros.length ? ': ' + erros[0] : ''));
  await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'todos os testes de navegador passaram'); process.exit(falhas ? 1 : 0);
})();
