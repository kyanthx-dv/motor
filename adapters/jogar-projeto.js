/* Executa um projeto do editor de celular (JSON do app) com a engine real.
   window.iniciarProjeto({ projeto: {nome, ori, cenas:[{nome, fisica, l, a, cor, ini, cel:{"x,y": indice}}]}, paleta:[{nome, aba, cor}] })
   Origem das celulas: embaixo-esquerda. Cada celula = 32 px. */
(function () {
  const C = Core, U = 32;
  const hex = n => '#' + (n & 0xFFFFFF).toString(16).padStart(6, '0');
  window.iniciarProjeto = async function (dados) {
    const proj = dados.projeto, pal = dados.paleta || [];
    const retrato = proj.ori === 'retrato';
    const L = retrato ? 450 : 800, A = retrato ? 800 : 450;
    const tela = document.getElementById('tela');
    const ajustar = () => { const k = Math.min(innerWidth / L, innerHeight / A); tela.style.width = L * k + 'px'; tela.style.height = A * k + 'px'; const gl = document.querySelector('.tela-gl'); if (gl) { gl.style.width = tela.style.width; gl.style.height = tela.style.height; } };
    addEventListener('resize', ajustar); ajustar();
    const assets = new C.Assets();
    // desenhos do usuario (PNG em data URL) viram imagens da engine: nome 'a<valor da celula>'
    const manifesto = {};
    for (const [v, im] of Object.entries(dados.imagens || {})) manifesto['a' + v] = im.png;
    try { await assets.carregar(manifesto); } catch (e) { console.error(String(e)); }
    // renderizador: Canvas 2D (padrão) ou WebGL (dados.render === 'webgl', opcional; volta ao Canvas se o aparelho não suportar)
    let renderer = null;
    if (dados.render === 'webgl' && C.PixiRenderer) {
      renderer = await C.PixiRenderer.criar(tela, { largura: L, altura: A, fundo: '#141414', assets, pixiUrl: 'adapters/vendor/pixi.min.js' });
      if (renderer) { renderer.gl.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;display:block;z-index:0'; tela.style.zIndex = 1; }   // a tela 2D (HUD, joystick) fica por cima do WebGL
    }
    const webgl = !!renderer; window.renderizador = webgl ? 'webgl' : 'canvas';
    if (!renderer) renderer = new C.CanvasRenderer(tela, { largura: L, altura: A, fundo: '#141414', assets });
    const input = new C.Input(tela, renderer), engine = new C.Engine({ renderer, input }), cena = engine.scene;
    const texto = (t, x, y, tam, cor = '#fff') => cena.create({ nome: 'texto', Transform: { x, y }, Sprite: { fixo: true, forma: 'retangulo', w: 1, h: 1, cor: 'rgba(0,0,0,0)', rotulo: t, tamanhoTexto: tam, corTexto: cor, camada: 9 } });
    const botao = (t, x, y, acao, w = 200, h = 48, tam = 20) => cena.create({ nome: 'botao', Transform: { x, y }, Botao: { acao }, Sprite: { fixo: true, forma: 'retangulo', w, h, cor: '#1D9BF0', corSobre: '#4db3f5', rotulo: t, corTexto: '#ffffff', tamanhoTexto: tam, camada: 10 } });

    const inicial = (proj.cenas.find(c => c.ini) || proj.cenas[0]);
    const reiniciar = () => engine.irPara('c:' + inicial.nome);

    engine.registrarScript('heroi', {
      atualizar(e, dt, ctx) {
        const ax = ctx.input.axes, v = e.Velocity, p = e.Script.params, vel = p.vel > 0 ? p.vel : 170, pulo = p.pulo > 0 ? p.pulo : 520;
        if (p.plat) {
          v.vx = ax.x * vel;
          // chão = parado na vertical (y não mudou). Pequena tolerância (coyote) e fila de pulo (buffer) para o botão nunca "perder" o toque
          const parado = p.ly !== undefined && Math.abs(e.Transform.y - p.ly) < 0.15 && Math.abs(v.vy) < 40; p.ly = e.Transform.y;
          p.chao = parado ? 0.12 : Math.max(0, (p.chao || 0) - dt); p.fila = Math.max(0, (p.fila || 0) - dt);
          if (p.fila > 0 && p.chao > 0) { v.vy = -pulo; p.chao = 0; p.fila = 0; }
        } else { v.vx = ax.x * vel; v.vy = ax.y * vel; }
        if (Math.abs(v.vx) > 5) e.Sprite.espelhar = v.vx < 0;
      },
      eventos: { pular(e) { if (e.Script.params.plat) e.Script.params.fila = 0.15; } }
    });
    // comportamentos anexaveis (ids iguais aos do app); um objeto pode ter varios
    const defs = {
      coletavel: { eventos: { gatilho(e) { cena.destroy(e.id); cena.estado.pegas = (cena.estado.pegas || 0) + 1; } } },
      vitoria: { eventos: { gatilho(e, d, ctx) { ctx.engine.irPara('fim'); } } },
      perigo: { eventos: { gatilho() { reiniciar(); } } },
      perseguir: { atualizar(e) { const h = cena.find('heroi'); if (!h || !e.Velocity) return; const dx = h.Transform.x - e.Transform.x, dy = h.Transform.y - e.Transform.y, d = Math.hypot(dx, dy) || 1; if (d > 260) { e.Velocity.vx = 0; e.Velocity.vy = 0; return; } const vm = e.Script.params.vel > 0 ? e.Script.params.vel : 60; e.Velocity.vx = dx / d * vm; e.Velocity.vy = e.Script.params.plat ? 0 : dy / d * vm; } },
      patrulha: { atualizar(e) { const p = e.Script.params; e.Transform.x = p.x0 + Math.sin(performance.now() / 1000 * (p.vel > 0 ? p.vel / 32 : 1.5) + p.fase) * 48; } }
    };
    const combinar = lista => {
      const nome = 's:' + lista.slice().sort().join('+');
      if (!engine.scripts[nome]) {
        const ats = lista.map(n => defs[n] && defs[n].atualizar).filter(Boolean), gs = lista.map(n => defs[n] && defs[n].eventos && defs[n].eventos.gatilho).filter(Boolean), def = {};
        if (ats.length) def.atualizar = (e, dt, ctx) => ats.forEach(f => f(e, dt, ctx));
        if (gs.length) def.eventos = { gatilho: (e, d, ctx) => gs.forEach(f => f(e, d, ctx)) };
        engine.registrarScript(nome, def);
      }
      return nome;
    };
    engine.registrarScript('hud', { atualizar(e) { e.Sprite.rotulo = 'Moedas ' + (cena.estado.pegas || 0); } });

    const SOLIDOS = { Grama: 1, Terra: 1, Pedra: 1, Areia: 1 };
    // câmera 'arrastar': o dedo move a câmera (limitada ao mapa); some se o modo mudar
    let arr = null;
    function ativarArrasto(cam, L) {
      const cv = document.querySelector('canvas'); if (!cv || cv._arr) return; cv._arr = true;
      cv.addEventListener('pointerdown', e => { arr = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
      cv.addEventListener('pointermove', e => {
        const c = window.jogo && window.jogo.cena.estado.camera; if (!arr || arr.id !== e.pointerId || !c || c.modo !== 'arrastar') return;
        const k = L / cv.clientWidth / (c.zoom || 1), l = c.limites;
        c.x -= (e.clientX - arr.x) * k; c.y -= (e.clientY - arr.y) * k; arr.x = e.clientX; arr.y = e.clientY;
        if (l) { c.x = Math.max(l.x0, Math.min(l.x1, c.x)); c.y = Math.max(l.y0, Math.min(l.y1, c.y)); }
        c.px = c.x; c.py = c.y;
      });
      const fim = e => { if (arr && arr.id === e.pointerId) arr = null; };
      cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
    }
    for (const sc of proj.cenas) {
      engine.registrarCena('c:' + sc.nome, { montar() {
        const plat = sc.fisica === 'plataforma', W = sc.l * U, H = sc.a * U;
        cena.estado.fundo = hex(sc.cor); cena.estado.pegas = 0;
        cena.estado.gravidade = plat ? { x: 0, y: 1500 } : { x: 0, y: 0 };
        cena.estado.joystick = { modo: 'flutuante', zona: 'esquerda', visivel: true };
        const cm = sc.cam || {}, lm = cm.lim;   // câmera da cena: modo fixo|arrastar|seguir|restrito, zoom, posição fixa e limites (em células)
        cena.estado.camera = { modo: cm.modo || 'restrito', x: cm.fx != null ? (cm.fx + 0.5) * U : W / 2, y: cm.fy != null ? (sc.a - cm.fy - 0.5) * U : H / 2, zoom: cm.zoom > 0 ? cm.zoom : 1.4, seguir: '@ator', suavizar: 6,
          limites: lm ? { x0: lm.x * U, y0: (sc.a - lm.y - lm.h) * U, x1: (lm.x + lm.w) * U, y1: (sc.a - lm.y) * U } : { x0: 0, y0: 0, x1: W, y1: H } };
        const atorId = sc.ator && sc.ator.obj != null ? sc.ator.obj : null;   // ator principal escolhido no editor (null = nenhum: ninguém é controlado)
        for (const [x, y, w, h] of [[W / 2, -20, W + 80, 40], [W / 2, H + 20, W + 80, 40], [-20, H / 2, 40, H + 80], [W + 20, H / 2, 40, H + 80]])
          cena.create({ nome: 'borda', Transform: { x, y }, Body: { forma: 'retangulo', w, h, massa: 0 } });
        let heroi = null; const linhasSolidas = {}, bake = { c: null, g: null, n: 0 };
        // sc.objs (editor novo): lista livre {x,y,w,h,v,...props}; sc.cel (antigo): uma celula = um objeto 1x1
        const lista = sc.objs || Object.keys(sc.cel || {}).map(k => { const [x, y] = k.split(',').map(Number); return Object.assign({ x, y, w: 1, h: 1, v: sc.cel[k] }, (sc.obj && sc.obj[k]) || {}); });
        for (const ob of lista) {
          const cx = ob.x, cy = ob.y, v = ob.v, ow = ob.w || 1, oh = ob.h || 1, mx = Math.max(ow, oh);
          const imgs = dados.imagens || {}, chave = ob.textura != null && imgs[ob.textura] ? ob.textura : v, img = imgs[chave];
          const it = pal[v] || (imgs[v] ? { nome: imgs[v].nome, aba: 'Meus', cor: 0xFFFFFF } : null); if (!it) continue;
          const x = (cx + ow / 2) * U, y = (sc.a - cy - oh / 2) * U, cor = hex(it.cor);
          if (atorId != null && ob.id === atorId) { heroi = { x, y, k: mx, vel: ob.vel, pulo: ob.pulo, img: img ? { chave, l: img.l, a: img.a } : null }; continue; }
          if (ob.visivel === false && !(ob.scripts || []).length && !ob.solido) continue;
          const tile = it.aba === 'Tile', solido = ob.solido !== undefined ? ob.solido : (tile && !!SOLIDOS[it.nome]);
          const scripts = ob.scripts || [], camada = (tile ? 0 : 1) + (ob.camada || 0);
          const kimg = img ? U / Math.max(img.l, img.a) : 1;
          // tiles comuns com imagem viram UMA imagem pré-desenhada da cena (poucas chamadas de desenho, sem frestas entre tiles)
          if (tile && ow === 1 && oh === 1 && ob.visivel !== false && !scripts.length && !(ob.camada || 0) && img && assets.get('a' + chave)) {
            if (!bake.c) { bake.c = document.createElement('canvas'); bake.c.width = W; bake.c.height = H; bake.g = bake.c.getContext('2d'); bake.g.imageSmoothingEnabled = false; }
            bake.g.drawImage(assets.get('a' + chave), cx * U, (sc.a - 1 - cy) * U, U, U); bake.n++;
            if (solido) (linhasSolidas[cy] = linhasSolidas[cy] || []).push(cx);
            continue;
          }
          const forma = img ? { imagem: 'a' + chave, quadroW: img.l, quadroH: img.a, escala: kimg, escalaX: ow, escalaY: oh, suavizar: false } : it.nome === 'Bandeira' ? { forma: 'retangulo', w: 14 * ow, h: 26 * oh } : tile ? { forma: 'retangulo', w: U * ow, h: U * oh } : { forma: 'circulo', raio: (it.nome === 'Moeda' ? 8 : 12) * mx };
          const e = { nome: (ob.nome || it.nome).toLowerCase(), Transform: { x, y }, Sprite: Object.assign({ cor: it.nome === 'Moeda' ? '#F59E0B' : it.nome === 'Bandeira' ? '#F23F43' : cor, camada }, forma) };
          if (ob.visivel === false) { e.Sprite.cor = 'rgba(0,0,0,0)'; if (img) delete e.Sprite.imagem; }
          const corpo = img ? { forma: 'retangulo', w: img.l * kimg * ow, h: img.a * kimg * oh } : tile ? { forma: 'retangulo', w: U * ow, h: U * oh } : it.nome === 'Bandeira' ? { forma: 'retangulo', w: 20 * ow, h: 28 * oh } : { forma: 'circulo', raio: 10 * mx };
          const mesclar = tile && solido && !scripts.length && ow === 1 && oh === 1;   // tiles sólidos comuns viram poucos corpos largos (física leve)
          if (mesclar) (linhasSolidas[cy] = linhasSolidas[cy] || []).push(cx);
          else if (solido) e.Body = Object.assign({ massa: 0 }, corpo);
          else if (scripts.length) e.Body = Object.assign({ massa: scripts.includes('perseguir') ? 1 : 0, sensor: true, camada: 'item', colide: ['jogador'] }, corpo);
          if (scripts.includes('perseguir')) e.Velocity = { vx: 0, vy: 0 };
          if (scripts.length) e.Script = { nome: combinar(scripts), params: { plat, x0: x, fase: (cx * 7 + cy * 13) % 6, vel: ob.movVel } };
          cena.create(e);
        }
        if (bake.n) { assets.registrar('bake:' + sc.nome, bake.c); cena.create({ nome: 'tiles', Transform: { x: W / 2, y: H / 2 }, Sprite: { imagem: 'bake:' + sc.nome, quadroW: W, quadroH: H, escala: 1, suavizar: false, camada: 0 } }); }
        for (const yy of Object.keys(linhasSolidas)) {
          const xs = linhasSolidas[yy].sort((a, b) => a - b); let i = 0;
          while (i < xs.length) { let j = i; while (j + 1 < xs.length && xs[j + 1] === xs[j] + 1) j++;
            const n = j - i + 1; cena.create({ nome: 'solido', Transform: { x: (xs[i] + n / 2) * U, y: (sc.a - Number(yy) - 0.5) * U }, Body: { forma: 'retangulo', w: n * U, h: U, massa: 0 } }); i = j + 1; }
        }
        if (heroi) cena.create({ nome: 'heroi', Transform: { x: heroi.x, y: heroi.y }, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 11 * heroi.k, massa: 1, amortecimento: plat ? 0 : 9, camada: 'jogador' }, Sprite: heroi.img ? { imagem: 'a' + heroi.img.chave, quadroW: heroi.img.l, quadroH: heroi.img.a, escala: 28 * heroi.k / Math.max(heroi.img.l, heroi.img.a), suavizar: false, camada: 3 } : { forma: 'circulo', raio: 12 * heroi.k, cor: '#FFFFFF', camada: 3 }, Script: { nome: 'heroi', params: { plat, vel: heroi.vel, pulo: heroi.pulo } } });
        if (!heroi) cena.estado.joystick.visivel = false;   // sem ator principal ninguém é controlado
        if (heroi) cena.estado.atorPrincipal = 'heroi';   // referência trocável por script
        const h = cena.find('heroi');
        texto('Moedas 0', 70, 24, 18).Script = { nome: 'hud' };
        if (plat && heroi) botao('Pular', L - 70, A - 50, { evento: 'pular' }, 110, 56, 18);
        ativarArrasto(cena.estado.camera, L);   // idempotente; só age enquanto o modo for 'arrastar'
      } });
    }
    engine.registrarCena('fim', { montar() {
      cena.estado.fundo = '#141414'; cena.estado.camera = null;
      texto('Você chegou na bandeira!', L / 2, A / 2 - 50, 28); botao('Jogar de novo', L / 2, A / 2 + 20, { irPara: 'c:' + inicial.nome }); botao('Sair', L / 2, A / 2 + 84, { evento: 'sair' });
    } });
    // depuração (lida pelo app): FPS e tempo de quadro medidos no navegador + tamanho da cena
    const dbg = window.dbg = { fps: 0, ms: 0, max: 0, n: 0, t: performance.now(), t0: performance.now(), pior: 0 };
    (function quadro(t) { const d = t - dbg.t; dbg.t = t; dbg.n++; dbg.ms += d; if (d > dbg.pior) dbg.pior = d;
      if (t - dbg.t0 >= 500) { dbg.fps = Math.round(dbg.n * 1000 / (t - dbg.t0)); dbg.med = +(dbg.ms / dbg.n).toFixed(1); dbg.max = Math.round(dbg.pior); dbg.n = 0; dbg.ms = 0; dbg.pior = 0; dbg.t0 = t; }
      requestAnimationFrame(quadro); })(performance.now());
    window.dbgInfo = () => { const c = window.jogo && window.jogo.cena; return JSON.stringify({ render: window.renderizador, dpr: renderer.dpr, res: renderer.canvas.width + 'x' + renderer.canvas.height, fps: dbg.fps, ms: dbg.med || 0, pior: dbg.max, ent: c ? c.query('Transform').length : 0, corpos: c ? c.query('Body').length : 0, mem: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }); };
    window.sair = () => { try { Sair.postMessage('sair'); } catch (e) {} };
    engine.events.on('sair', window.sair);
    // o botão Pular emite 'pular' com { para: id do botão }; aqui o evento chega ao herói (fila de pulo)
    engine.events.on('pular', () => { const h = engine.scene.find('heroi'); if (h && h.Script && h.Script.params) h.Script.params.fila = 0.15; });
    // qualidade de desenho (resolução do canvas): 3 = nativa, 1.5 = média, 1 = baixa (menos pixels = mais FPS)
    window.definirQualidade = k => { renderer.dprMax = k; renderer.redimensionar(); };
    window.definirQualidade(1.5);   // sem 'pixelated': a ampliação suave do navegador deixa o texto liso (a pixel art já sai nítida no próprio canvas)
    engine.irPara('c:' + inicial.nome); engine.iniciar();
    window.jogo = { engine, get cena() { return engine.scene; } };   // sempre a cena atual
  };
})();
