/* Exemplo · Aventura: menu → jogo → fim. Usa cenas, botões, camadas de colisão, câmera, sprites e salvar/carregar.
   Pegue as 10 moedas. Fantasmas atravessam árvores (camada própria) mas pegam você. */
(function () {
  const C = Core, L = 800, A = 450, MW = 2200, MH = 1400, TOTAL = 10;
  const tela = document.getElementById('tela'), assets = new C.Assets();
  const folha = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); return c; };
  assets.registrar('heroi', folha(128, 64, g => {
    for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) {
      const x = q * 32, y = r * 32, bob = r === 0 ? [0, -1, 0, -1][q] : [0, -2, 0, -2][q], pe = r === 1 ? [-4, 0, 4, 0][q] : 0;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 16, y + 28, 9, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#3b2a1a'; g.fillRect(x + 10 + pe, y + 24, 5, 4); g.fillRect(x + 17 - pe, y + 24, 5, 4);
      g.fillStyle = '#3b82f6'; g.fillRect(x + 9, y + 12 + bob, 14, 13); g.fillStyle = '#f1c9a5'; g.fillRect(x + 10, y + 3 + bob, 12, 10);
      g.fillStyle = '#222'; g.fillRect(x + 13, y + 7 + bob, 2, 2); g.fillRect(x + 18, y + 7 + bob, 2, 2);
    }
  }));
  assets.registrar('arvore', folha(48, 64, g => {
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(24, 58, 14, 4, 0, 0, 7); g.fill(); g.fillStyle = '#6b4423'; g.fillRect(20, 36, 8, 22);
    g.fillStyle = '#2f7d3a'; for (const [cx, cy, r] of [[24, 22, 16], [14, 30, 11], [34, 30, 11]]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
    g.fillStyle = '#3f9a4b'; g.beginPath(); g.arc(20, 18, 8, 0, 7); g.fill();
  }));
  assets.registrar('moeda', folha(64, 16, g => {   // 4 quadros: a moeda "gira" mudando a largura
    [7, 4, 1.5, 4].forEach((rx, q) => { g.fillStyle = '#f5c518'; g.strokeStyle = '#b8860b'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(q * 16 + 8, 8, rx, 7, 0, 0, 7); g.fill(); g.stroke(); });
  }));
  assets.registrar('fantasma', folha(64, 32, g => {   // 2 quadros: a barra do fantasma ondula
    [0, 1].forEach(q => { const x = q * 32; g.fillStyle = 'rgba(245,245,255,.92)'; g.beginPath(); g.arc(x + 16, 14, 11, Math.PI, 0); g.lineTo(x + 27, 27 - q * 2); g.lineTo(x + 21, 24 + q * 2); g.lineTo(x + 16, 28 - q * 2); g.lineTo(x + 11, 24 + q * 2); g.lineTo(x + 5, 27 - q * 2); g.closePath(); g.fill();
      g.fillStyle = '#222'; g.fillRect(x + 11, 11, 3, 4); g.fillRect(x + 18, 11, 3, 4); });
  }));

  const renderer = new C.CanvasRenderer(tela, { largura: L, altura: A, fundo: '#2f6b3f', assets });
  const input = new C.Input(tela, renderer), engine = new C.Engine({ renderer, input }), cena = engine.scene;
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---------- scripts ---------- */
  engine.registrarScript('heroi', { atualizar(e) {
    const v = e.Velocity; e.Animacao.atual = Math.hypot(v.vx, v.vy) > 25 ? 'andar' : 'parado'; if (Math.abs(v.vx) > 10) e.Sprite.espelhar = v.vx < 0;
  } });
  engine.registrarScript('moeda', { eventos: { gatilho(e, d, ctx) {
    cena.destroy(e.id); const m = cena.estado.moedas; m.pegas++; if (m.pegas >= m.total) ctx.engine.irPara('fim', { venceu: true });
  } } });
  engine.registrarScript('fantasma', {
    atualizar(e) {
      const h = cena.find('heroi'); if (!h) return; const dx = h.Transform.x - e.Transform.x, dy = h.Transform.y - e.Transform.y, d = Math.hypot(dx, dy) || 1, v = e.Script.params.vel;
      e.Velocity.vx = dx / d * v; e.Velocity.vy = dy / d * v; e.Sprite.espelhar = dx < 0;
    },
    eventos: { gatilho(e, d, ctx) { ctx.engine.irPara('fim', { venceu: false }); } }
  });
  engine.registrarScript('hud', { atualizar(e) { const m = cena.estado.moedas; if (m) e.Sprite.rotulo = 'Moedas ' + m.pegas + '/' + m.total; } });

  /* ---------- peças de interface ---------- */
  const botao = (texto, x, y, acao, w = 220, h = 52, tam = 22) => cena.create({ nome: 'botao', Transform: { x, y }, Botao: { acao },
    Sprite: { fixo: true, forma: 'retangulo', w, h, cor: '#ffffff', corSobre: '#ffe28a', borda: '#1f2937', rotulo: texto, corTexto: '#1f2937', tamanhoTexto: tam, camada: 10 } });
  const texto = (t, x, y, tam, cor = '#fff', nome = 'texto') => cena.create({ nome, Transform: { x, y },
    Sprite: { fixo: true, forma: 'retangulo', w: 1, h: 1, cor: 'rgba(0,0,0,0)', rotulo: t, tamanhoTexto: tam, corTexto: cor, camada: 9 } });

  /* ---------- cenas ---------- */
  engine.registrarCena('menu', { montar() {
    cena.estado.fundo = '#2f6b3f';
    texto('AVENTURA', 400, 120, 58); texto('Pegue as ' + TOTAL + ' moedas e fuja dos fantasmas', 400, 185, 20, '#d1fae5');
    botao('Jogar', 400, 270, { irPara: 'jogo' }); texto('Setas ou WASD, ou arraste na tela', 400, 340, 16, '#d1fae5');
  } });
  engine.registrarCena('jogo', { montar() {
    const r = rng(11); cena.estado.fundo = '#78b265'; cena.estado.moedas = { pegas: 0, total: TOTAL };
    cena.estado.camera = { x: MW / 2, y: MH / 2, zoom: 1.5, seguir: 'heroi', suavizar: 6, limites: { x0: 0, y0: 0, x1: MW, y1: MH } };
    for (let i = 0; i < 240; i++) cena.create({ nome: 'flor', Transform: { x: r() * MW, y: r() * MH }, Sprite: { forma: 'circulo', raio: 2.5, cor: ['#f6e05e', '#fff', '#f687b3'][i % 3], camada: -1 } });
    for (const [x, y, w, h] of [[MW / 2, -20, MW + 80, 40], [MW / 2, MH + 20, MW + 80, 40], [-20, MH / 2, 40, MH + 80], [MW + 20, MH / 2, 40, MH + 80]])
      cena.create({ nome: 'muro', Transform: { x, y }, Body: { forma: 'retangulo', w, h, massa: 0 } });
    for (let i = 0; i < 60; i++) {
      const x = 100 + r() * (MW - 200), y = 100 + r() * (MH - 200); if (Math.hypot(x - MW / 2, y - MH / 2) < 180) continue;
      cena.create({ nome: 'arvore', Transform: { x, y }, Body: { forma: 'circulo', raio: 10, massa: 0, camada: 'cenario' },
        Sprite: { imagem: 'arvore', quadroW: 48, quadroH: 64, escala: 2, offY: -52, ordenarY: true, camada: 1 } });
    }
    for (let i = 0; i < TOTAL; i++) cena.create({ nome: 'moeda', Transform: { x: 120 + r() * (MW - 240), y: 120 + r() * (MH - 240) },
      Body: { forma: 'circulo', raio: 12, massa: 0, sensor: true, camada: 'item', colide: ['jogador'] },
      Sprite: { imagem: 'moeda', quadroW: 16, quadroH: 16, escala: 2, ordenarY: true, camada: 1 },
      Animacao: { atual: 'girar', animacoes: { girar: { linha: 0, quadros: 4, fps: 8 } } }, Script: { nome: 'moeda' } });
    for (const [x, y] of [[300, 250], [MW - 300, MH - 250]]) cena.create({ nome: 'fantasma', Transform: { x, y }, Velocity: { vx: 0, vy: 0 },
      Body: { forma: 'circulo', raio: 12, massa: 1, sensor: true, camada: 'fantasma', colide: ['jogador'] },   // não colide com árvores: elas não estão na lista
      Sprite: { imagem: 'fantasma', quadroW: 32, quadroH: 32, escala: 2, offY: -10, ordenarY: true, camada: 2 },
      Animacao: { atual: 'voar', animacoes: { voar: { linha: 0, quadros: 2, fps: 4 } } }, Script: { nome: 'fantasma', params: { vel: 85 } } });
    cena.create({ nome: 'heroi', Transform: { x: MW / 2, y: MH / 2 }, Velocity: { vx: 0, vy: 0 },
      Body: { forma: 'circulo', raio: 9, massa: 2, amortecimento: 9, camada: 'jogador' }, Controller: { aceleracao: 2600, velMax: 175 },
      Sprite: { imagem: 'heroi', quadroW: 32, quadroH: 32, escala: 2, offY: -24, ordenarY: true, camada: 1 },
      Animacao: { atual: 'parado', animacoes: { parado: { linha: 0, quadros: 4, fps: 4 }, andar: { linha: 1, quadros: 4, fps: 9 } } }, Script: { nome: 'heroi' } });
    texto('Moedas 0/' + TOTAL, 90, 26, 20, '#fff', 'hud').Script = { nome: 'hud' };
    botao('Menu', 740, 26, { irPara: 'menu' }, 90, 34, 16);
  } });
  engine.registrarCena('fim', { montar(en, d) {
    cena.estado.fundo = d.venceu ? '#2f6b3f' : '#4a2530';
    texto(d.venceu ? 'Você venceu!' : 'Os fantasmas pegaram você', 400, 130, 46); botao('Jogar de novo', 400, 250, { irPara: 'jogo' }); botao('Menu', 400, 320, { irPara: 'menu' });
  } });

  /* ---------- página ---------- */
  const $ = id => document.getElementById(id), KEY = 'engine-aventura-save';
  const aviso = t => { const el = $('aviso'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 1600); };
  $('b-salvar').addEventListener('click', () => { try { localStorage.setItem(KEY, JSON.stringify(C.Serializer.paraJSON(cena))); aviso('Jogo salvo'); } catch (e) { aviso('Não foi possível salvar'); } });
  $('b-carregar').addEventListener('click', () => { try { const raw = localStorage.getItem(KEY); if (!raw) return aviso('Nada salvo ainda'); C.Serializer.deJSON(cena, JSON.parse(raw)); aviso('Jogo carregado'); } catch (e) { aviso('Save inválido'); } });
  $('b-debug').addEventListener('click', () => { renderer.debug = !renderer.debug; });
  if (C.Depurador) new C.Depurador(engine, renderer, tela);
  engine.irPara('menu'); engine.iniciar();
  window.jogo = { engine, cena, renderer, input };
})();
