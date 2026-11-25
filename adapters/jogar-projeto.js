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
    const ajustar = () => { const k = Math.min(innerWidth / L, innerHeight / A); tela.style.width = L * k + 'px'; tela.style.height = A * k + 'px'; };
    addEventListener('resize', ajustar); ajustar();
    const assets = new C.Assets();
    // desenhos do usuario (PNG em data URL) viram imagens da engine: nome 'a<valor da celula>'
    const manifesto = {};
    for (const [v, im] of Object.entries(dados.imagens || {})) manifesto['a' + v] = im.png;
    try { await assets.carregar(manifesto); } catch (e) { console.error(String(e)); }
    const renderer = new C.CanvasRenderer(tela, { largura: L, altura: A, fundo: '#141414', assets });
    const input = new C.Input(tela, renderer), engine = new C.Engine({ renderer, input }), cena = engine.scene;
    const texto = (t, x, y, tam, cor = '#fff') => cena.create({ nome: 'texto', Transform: { x, y }, Sprite: { fixo: true, forma: 'retangulo', w: 1, h: 1, cor: 'rgba(0,0,0,0)', rotulo: t, tamanhoTexto: tam, corTexto: cor, camada: 9 } });
    const botao = (t, x, y, acao, w = 200, h = 48, tam = 20) => cena.create({ nome: 'botao', Transform: { x, y }, Botao: { acao }, Sprite: { fixo: true, forma: 'retangulo', w, h, cor: '#1D9BF0', corSobre: '#4db3f5', rotulo: t, corTexto: '#ffffff', tamanhoTexto: tam, camada: 10 } });

    const inicial = (proj.cenas.find(c => c.ini) || proj.cenas[0]);
    const reiniciar = () => engine.irPara('c:' + inicial.nome);

    engine.registrarScript('heroi', {
      atualizar(e, dt, ctx) {
        const ax = ctx.input.axes, v = e.Velocity, p = e.Script.params, vel = 170;
        if (p.plat) { v.vx = ax.x * vel; if (ax.y < -0.6 && Math.abs(v.vy) < 8) v.vy = -520; }
        else { v.vx = ax.x * vel; v.vy = ax.y * vel; }
        if (Math.abs(v.vx) > 5) e.Sprite.espelhar = v.vx < 0;
      },
      eventos: { pular(e) { if (e.Script.params.plat && Math.abs(e.Velocity.vy) < 8) e.Velocity.vy = -520; } }
    });
    // comportamentos anexaveis (ids iguais aos do app); um objeto pode ter varios
    const defs = {
      coletavel: { eventos: { gatilho(e) { cena.destroy(e.id); cena.estado.pegas = (cena.estado.pegas || 0) + 1; } } },
      vitoria: { eventos: { gatilho(e, d, ctx) { ctx.engine.irPara('fim'); } } },
      perigo: { eventos: { gatilho() { reiniciar(); } } },
      perseguir: { atualizar(e) { const h = cena.find('heroi'); if (!h || !e.Velocity) return; const dx = h.Transform.x - e.Transform.x, dy = h.Transform.y - e.Transform.y, d = Math.hypot(dx, dy) || 1; if (d > 260) { e.Velocity.vx = 0; e.Velocity.vy = 0; return; } e.Velocity.vx = dx / d * 60; e.Velocity.vy = e.Script.params.plat ? 0 : dy / d * 60; } },
      patrulha: { atualizar(e) { const p = e.Script.params; e.Transform.x = p.x0 + Math.sin(performance.now() / 1000 * 1.5 + p.fase) * 48; } }
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
    for (const sc of proj.cenas) {
      engine.registrarCena('c:' + sc.nome, { montar() {
        const plat = sc.fisica === 'plataforma', W = sc.l * U, H = sc.a * U;
        cena.estado.fundo = hex(sc.cor); cena.estado.pegas = 0;
        cena.estado.gravidade = plat ? { x: 0, y: 1500 } : { x: 0, y: 0 };
        cena.estado.joystick = { modo: 'flutuante', zona: 'esquerda', visivel: true };
        cena.estado.camera = { x: W / 2, y: H / 2, zoom: 1.4, seguir: 'heroi', suavizar: 6, limites: { x0: 0, y0: 0, x1: W, y1: H } };
        for (const [x, y, w, h] of [[W / 2, -20, W + 80, 40], [W / 2, H + 20, W + 80, 40], [-20, H / 2, 40, H + 80], [W + 20, H / 2, 40, H + 80]])
          cena.create({ nome: 'borda', Transform: { x, y }, Body: { forma: 'retangulo', w, h, massa: 0 } });
        let heroi = null;
        // sc.objs (editor novo): lista livre {x,y,w,h,v,...props}; sc.cel (antigo): uma celula = um objeto 1x1
        const lista = sc.objs || Object.keys(sc.cel || {}).map(k => { const [x, y] = k.split(',').map(Number); return Object.assign({ x, y, w: 1, h: 1, v: sc.cel[k] }, (sc.obj && sc.obj[k]) || {}); });
        for (const ob of lista) {
          const cx = ob.x, cy = ob.y, v = ob.v, ow = ob.w || 1, oh = ob.h || 1, mx = Math.max(ow, oh);
          const imgs = dados.imagens || {}, chave = ob.textura != null && imgs[ob.textura] ? ob.textura : v, img = imgs[chave];
          const it = pal[v] || (imgs[v] ? { nome: imgs[v].nome, aba: 'Meus', cor: 0xFFFFFF } : null); if (!it) continue;
          const x = (cx + ow / 2) * U, y = (sc.a - cy - oh / 2) * U, cor = hex(it.cor);
          if (it.nome === 'Herói') { heroi = { x, y, img: img ? { chave, l: img.l, a: img.a } : null }; continue; }
          if (ob.visivel === false && !(ob.scripts || []).length && !ob.solido) continue;
          const tile = it.aba === 'Tile', solido = ob.solido !== undefined ? ob.solido : (tile && !!SOLIDOS[it.nome]);
          const scripts = ob.scripts || [], camada = (tile ? 0 : 1) + (ob.camada || 0);
          const kimg = img ? U / Math.max(img.l, img.a) : 1;
          const forma = img ? { imagem: 'a' + chave, quadroW: img.l, quadroH: img.a, escala: kimg, escalaX: ow, escalaY: oh, suavizar: false } : it.nome === 'Bandeira' ? { forma: 'retangulo', w: 14 * ow, h: 26 * oh } : tile ? { forma: 'retangulo', w: U * ow, h: U * oh } : { forma: 'circulo', raio: (it.nome === 'Moeda' ? 8 : 12) * mx };
          const e = { nome: (ob.nome || it.nome).toLowerCase(), Transform: { x, y }, Sprite: Object.assign({ cor: it.nome === 'Moeda' ? '#F59E0B' : it.nome === 'Bandeira' ? '#F23F43' : cor, camada }, forma) };
          if (ob.visivel === false) { e.Sprite.cor = 'rgba(0,0,0,0)'; if (img) delete e.Sprite.imagem; }
          const corpo = img ? { forma: 'retangulo', w: img.l * kimg * ow, h: img.a * kimg * oh } : tile ? { forma: 'retangulo', w: U * ow, h: U * oh } : it.nome === 'Bandeira' ? { forma: 'retangulo', w: 20 * ow, h: 28 * oh } : { forma: 'circulo', raio: 10 * mx };
          if (solido) e.Body = Object.assign({ massa: 0 }, corpo);
          else if (scripts.length) e.Body = Object.assign({ massa: scripts.includes('perseguir') ? 1 : 0, sensor: true, camada: 'item', colide: ['jogador'] }, corpo);
          if (scripts.includes('perseguir')) e.Velocity = { vx: 0, vy: 0 };
          if (scripts.length) e.Script = { nome: combinar(scripts), params: { plat, x0: x, fase: (cx * 7 + cy * 13) % 6 } };
          cena.create(e);
        }
        if (heroi) cena.create({ nome: 'heroi', Transform: { x: heroi.x, y: heroi.y }, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 11, massa: 1, amortecimento: plat ? 0 : 9, camada: 'jogador' }, Sprite: heroi.img ? { imagem: 'a' + heroi.img.chave, quadroW: heroi.img.l, quadroH: heroi.img.a, escala: 28 / Math.max(heroi.img.l, heroi.img.a), suavizar: false, camada: 3 } : { forma: 'circulo', raio: 12, cor: '#FFFFFF', camada: 3 }, Script: { nome: 'heroi', params: { plat } } });
        const h = cena.find('heroi');
        texto('Moedas 0', 70, 24, 18).Script = { nome: 'hud' };
        botao('Sair', L - 50, 24, { evento: 'sair' }, 70, 32, 14);
        if (plat) botao('Pular', L - 70, A - 50, { evento: 'pular' }, 110, 56, 18);
        if (!h) texto('Falta o Herói neste mapa', L / 2, A / 2, 22, '#F59E0B');
      } });
    }
    engine.registrarCena('fim', { montar() {
      cena.estado.fundo = '#141414'; cena.estado.camera = null;
      texto('Você chegou na bandeira!', L / 2, A / 2 - 50, 28); botao('Jogar de novo', L / 2, A / 2 + 20, { irPara: 'c:' + inicial.nome }); botao('Sair', L / 2, A / 2 + 84, { evento: 'sair' });
    } });
    window.sair = () => { try { Sair.postMessage('sair'); } catch (e) {} };
    engine.events.on('sair', window.sair);
    engine.irPara('c:' + inicial.nome); engine.iniciar();
    window.jogo = { engine, cena };
  };
})();
