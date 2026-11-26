// Bench do runner (jogar.html) no Chromium: mede tempo de logica (por sistema), desenho e quadros. Uso: node tests/bench-runner.js [pequena|grande] [dpr]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const raiz = path.join(__dirname, '..');
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const f = path.join(raiz, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': tipos[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const modo = process.argv[2] || 'pequena', dpr = Number(process.argv[3] || 2.6), render = process.argv[4] || 'canvas';
srv.listen(0, async () => {
  const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 615, height: 277 }, deviceScaleFactor: dpr })).newPage();
  pg.on('pageerror', e => console.log('ERRO', e.message));
  await pg.goto('http://localhost:' + srv.address().port + '/jogar.html');
  const res = await pg.evaluate(async ([modo, render]) => {
    const nomes = [['Grama', 'Tile'], ['Terra', 'Tile'], ['Pedra', 'Tile'], ['Água', 'Tile'], ['Areia', 'Tile'], ['Árvore', 'Deco'], ['Flor', 'Deco'], ['Nuvem', 'Deco'], ['Herói', 'Ator'], ['Slime', 'Ator'], ['Fantasma', 'Ator'], ['Baú', 'Objeto'], ['Moeda', 'Objeto'], ['Bandeira', 'Objeto']];
    const paleta = nomes.map(([nome, aba], i) => ({ nome, aba, cor: 0x40A040 + i * 300 }));
    const imagens = {};
    for (let i = 0; i < 14; i++) { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { g.fillStyle = `hsl(${i * 25},60%,${35 + ((x * 7 + y * 13) % 5) * 6}%)`; g.fillRect(x, y, 1, 1); } imagens[i] = { nome: nomes[i][0], l: 16, a: 16, png: c.toDataURL() }; }
    const W = modo === 'grande' ? 40 : 16, H = modo === 'grande' ? 30 : 12, objs = []; let id = 1;
    for (let x = 0; x < W; x++) for (let y = 0; y < (modo === 'grande' ? 10 : 5); y++) objs.push({ id: id++, x, y, w: 1, h: 1, v: y === (modo === 'grande' ? 9 : 4) ? 0 : 1, solido: true, scripts: [], visivel: true, camada: 0 });
    const hero = id++; objs.push({ id: hero, x: 3, y: modo === 'grande' ? 10 : 5, w: 1, h: 1, v: 8, scripts: [], visivel: true, camada: 0 });
    for (let i = 0; i < (modo === 'grande' ? 60 : 3); i++) objs.push({ id: id++, x: 5 + (i % (W - 6)), y: (modo === 'grande' ? 10 : 5) + (i % 3), w: 1, h: 1, v: 9, scripts: ['perseguir', 'perigo'], solido: false, visivel: true, camada: 0, movVel: 60 });
    for (let i = 0; i < (modo === 'grande' ? 40 : 4); i++) objs.push({ id: id++, x: 4 + (i % (W - 5)), y: (modo === 'grande' ? 11 : 6), w: 1, h: 1, v: 12, scripts: ['coletavel'], visivel: true, camada: 0 });
    objs.push({ id: id++, x: 9, y: modo === 'grande' ? 10 : 5, w: 3, h: 4, v: 5, scripts: [], visivel: true, camada: 0 });
    await iniciarProjeto({ projeto: { nome: 'bench', ori: 'paisagem', cenas: [{ nome: 'c', fisica: 'plataforma', l: W, a: H, cor: 0x4DD0FF, ini: true, objs, ator: { obj: hero }, cam: { modo: 'restrito', zoom: 1.4 } }] }, paleta, imagens, render });
    const eng = jogo.engine; eng.perfil = true;
    let tDes = 0, nDes = 0; const r = eng.renderer, orig = r.desenhar.bind(r);
    r.desenhar = (...a) => { const t = performance.now(); orig(...a); tDes += performance.now() - t; nDes++; };
    const quadros = []; let ult = performance.now();
    await new Promise(ok => { const f = t => { quadros.push(t - ult); ult = t; if (quadros.length < 240) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
    const ms = quadros.slice(10), media = ms.reduce((a, b) => a + b) / ms.length;
    return { objetos: eng.scene.query('Transform').length, corpos: eng.scene.query('Body').length, render: window.renderizador, canvas: r.canvas.width + 'x' + r.canvas.height, quadroMs: +media.toFixed(1), fps: Math.round(1000 / media), desenhoMs: +(tDes / nDes).toFixed(2), sistemasMs: Object.fromEntries(Object.entries(eng.tempos).map(([k, v]) => [k, +v.toFixed(3)])) };
  }, [modo, render]);
  await pg.screenshot({ path: process.env.PRINT || '/tmp/bench.png' });
  console.log(modo, 'dpr', dpr, JSON.stringify(res, null, 1));
  await b.close(); srv.close();
});
