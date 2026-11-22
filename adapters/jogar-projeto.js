/* Executa um projeto do editor de celular (JSON do app) com a engine real.
   window.iniciarProjeto({ projeto: {nome, ori, cenas:[{nome, fisica, l, a, cor, ini, cel:{"x,y": indice}}]}, paleta:[{nome, aba, cor}] })
   Origem das celulas: embaixo-esquerda. Cada celula = 32 px. */
(function () {
  const C = Core, U = 32;
  const hex = n => '#' + (n & 0xFFFFFF).toString(16).padStart(6, '0');
  window.iniciarProjeto = function (dados) {
    const proj = dados.projeto, pal = dados.paleta || [];
    const retrato = proj.ori === 'retrato';
    const L = retrato ? 450 : 800, A = retrato ? 800 : 450;
    const tela = document.getElementById('tela');
    const ajustar = () => { const k = Math.min(innerWidth / L, innerHeight / A); tela.style.width = L * k + 'px'; tela.style.height = A * k + 'px'; };
    addEventListener('resize', ajustar); ajustar();
    const renderer = new C.CanvasRenderer(tela, { largura: L, altura: A, fundo: '#141414', assets: new C.Assets() });
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
    engine.registrarScript('moeda', { eventos: { gatilho(e, d, ctx) { cena.destroy(e.id); cena.estado.pegas = (cena.estado.pegas || 0) + 1; } } });
    engine.registrarScript('bandeira', { eventos: { gatilho(e, d, ctx) { ctx.engine.irPara('fim'); } } });
    engine.registrarScript('hud', { atualizar(e) { e.Sprite.rotulo = 'Moedas ' + (cena.estado.pegas || 0); } });
    engine.registrarScript('inimigo', {
      atualizar(e) { const h = cena.find('heroi'); if (!h) return; const dx = h.Transform.x - e.Transform.x, dy = h.Transform.y - e.Transform.y, d = Math.hypot(dx, dy) || 1; if (d > 260) { e.Velocity.vx = 0; e.Velocity.vy = 0; return; } e.Velocity.vx = dx / d * 60; e.Velocity.vy = e.Script.params.plat ? 0 : dy / d * 60; },
      eventos: { gatilho() { reiniciar(); } }
    });

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
        for (const k of Object.keys(sc.cel)) {
          const [cx, cy] = k.split(',').map(Number), it = pal[sc.cel[k]]; if (!it) continue;
          const x = cx * U + U / 2, y = (sc.a - 1 - cy) * U + U / 2, cor = hex(it.cor);
          if (it.aba === 'Tile') {
            const e = { nome: it.nome.toLowerCase(), Transform: { x, y }, Sprite: { forma: 'retangulo', w: U, h: U, cor, camada: 0 } };
            if (SOLIDOS[it.nome]) e.Body = { forma: 'retangulo', w: U, h: U, massa: 0 };
            cena.create(e);
          } else if (it.nome === 'Herói') heroi = { x, y };
          else if (it.nome === 'Moeda') cena.create({ nome: 'moeda', Transform: { x, y }, Body: { forma: 'circulo', raio: 10, massa: 0, sensor: true, camada: 'item', colide: ['jogador'] }, Sprite: { forma: 'circulo', raio: 8, cor: '#F59E0B', camada: 1 }, Script: { nome: 'moeda' } });
          else if (it.nome === 'Bandeira') cena.create({ nome: 'bandeira', Transform: { x, y }, Body: { forma: 'retangulo', w: 20, h: 28, massa: 0, sensor: true, camada: 'item', colide: ['jogador'] }, Sprite: { forma: 'retangulo', w: 14, h: 26, cor: '#F23F43', camada: 1 }, Script: { nome: 'bandeira' } });
          else if (it.nome === 'Slime' || it.nome === 'Fantasma') cena.create({ nome: 'inimigo', Transform: { x, y }, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 10, massa: 1, sensor: true, camada: 'inimigo', colide: ['jogador'] }, Sprite: { forma: 'circulo', raio: 11, cor, camada: 2 }, Script: { nome: 'inimigo', params: { plat } } });
          else cena.create({ nome: it.nome.toLowerCase(), Transform: { x, y }, Sprite: { forma: 'circulo', raio: 12, cor, camada: 1 } });
        }
        if (heroi) cena.create({ nome: 'heroi', Transform: heroi, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 11, massa: 1, amortecimento: plat ? 0 : 9, camada: 'jogador' }, Sprite: { forma: 'circulo', raio: 12, cor: '#FFFFFF', camada: 3 }, Script: { nome: 'heroi', params: { plat } } });
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
