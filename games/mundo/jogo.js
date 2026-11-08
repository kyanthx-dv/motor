/* Exemplo · Mundo (câmera + sprites animados). Imagens geradas por código, sem arquivos. */
(function () {
  const C = Core, L = 800, A = 450, MW = 2400, MH = 1500;
  const tela = document.getElementById('tela'), assets = new C.Assets();
  function folha(w, h, desenhar) { const c = document.createElement('canvas'); c.width = w; c.height = h; desenhar(c.getContext('2d')); return c; }
  // herói: 4 colunas (quadros) x 2 linhas (0 = parado, 1 = andando), cada quadro 32x32
  assets.registrar('heroi', folha(128, 64, g => {
    for (let r = 0; r < 2; r++) for (let q = 0; q < 4; q++) {
      const x = q * 32, y = r * 32, bob = r === 0 ? [0, -1, 0, -1][q] : [0, -2, 0, -2][q], pe = r === 1 ? [-4, 0, 4, 0][q] : 0;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x + 16, y + 28, 9, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#3b2a1a'; g.fillRect(x + 10 + pe, y + 24, 5, 4); g.fillRect(x + 17 - pe, y + 24, 5, 4);
      g.fillStyle = '#3b82f6'; g.fillRect(x + 9, y + 12 + bob, 14, 13);
      g.fillStyle = '#f1c9a5'; g.fillRect(x + 10, y + 3 + bob, 12, 10);
      g.fillStyle = '#222'; g.fillRect(x + 13, y + 7 + bob, 2, 2); g.fillRect(x + 18, y + 7 + bob, 2, 2);
    }
  }));
  assets.registrar('arvore', folha(48, 64, g => {
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(24, 58, 14, 4, 0, 0, 7); g.fill();
    g.fillStyle = '#6b4423'; g.fillRect(20, 36, 8, 22);
    g.fillStyle = '#2f7d3a'; for (const [cx, cy, r] of [[24, 22, 16], [14, 30, 11], [34, 30, 11]]) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); }
    g.fillStyle = '#3f9a4b'; g.beginPath(); g.arc(20, 18, 8, 0, 7); g.fill();
  }));

  const renderer = new C.CanvasRenderer(tela, { largura: L, altura: A, fundo: '#78b265', assets });
  const input = new C.Input(tela, renderer), engine = new C.Engine({ renderer, input }), cena = engine.scene;
  engine.registrarScript('heroi', {
    atualizar(e) {
      const v = e.Velocity, rapido = Math.hypot(v.vx, v.vy) > 25;
      e.Animacao.atual = rapido ? 'andar' : 'parado';
      if (Math.abs(v.vx) > 10) e.Sprite.espelhar = v.vx < 0;
    }
  });
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function montar() {
    cena.clear(); const r = rng(7);
    cena.estado = { camera: { x: MW / 2, y: MH / 2, zoom: 1.5, seguir: 'heroi', suavizar: 6, limites: { x0: 0, y0: 0, x1: MW, y1: MH } } };
    for (let i = 0; i < 260; i++) cena.create({ nome: 'flor', Transform: { x: r() * MW, y: r() * MH }, Sprite: { forma: 'circulo', raio: 2.5, cor: ['#f6e05e', '#fff', '#f687b3'][i % 3], camada: -1 } });
    for (const [x, y, w, h] of [[MW / 2, -20, MW + 80, 40], [MW / 2, MH + 20, MW + 80, 40], [-20, MH / 2, 40, MH + 80], [MW + 20, MH / 2, 40, MH + 80]])
      cena.create({ nome: 'muro', Transform: { x, y }, Body: { forma: 'retangulo', w, h, massa: 0 } });
    for (let i = 0; i < 70; i++) {
      const x = 100 + r() * (MW - 200), y = 100 + r() * (MH - 200); if (Math.hypot(x - MW / 2, y - MH / 2) < 160) continue;
      cena.create({ nome: 'arvore', Transform: { x, y }, Body: { forma: 'circulo', raio: 10, massa: 0 },
        Sprite: { imagem: 'arvore', quadroW: 48, quadroH: 64, escala: 2, offY: -52, ordenarY: true, camada: 1 } });
    }
    cena.create({ nome: 'heroi', Transform: { x: MW / 2, y: MH / 2 }, Velocity: { vx: 0, vy: 0 },
      Body: { forma: 'circulo', raio: 9, massa: 2, amortecimento: 9 }, Controller: { aceleracao: 2600, velMax: 170 },
      Sprite: { imagem: 'heroi', quadroW: 32, quadroH: 32, escala: 2, offY: -24, ordenarY: true, camada: 1 },
      Animacao: { atual: 'parado', animacoes: { parado: { linha: 0, quadros: 4, fps: 4 }, andar: { linha: 1, quadros: 4, fps: 9 } } }, Script: { nome: 'heroi' } });
  }
  const $ = id => document.getElementById(id), zoom = f => { const c = cena.estado.camera; c.zoom = Math.max(0.6, Math.min(3, c.zoom * f)); };
  $('b-reiniciar').addEventListener('click', montar);
  $('b-mais').addEventListener('click', () => zoom(1.25)); $('b-menos').addEventListener('click', () => zoom(0.8));
  $('b-debug').addEventListener('click', () => { renderer.debug = !renderer.debug; });
  tela.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });
  montar(); engine.iniciar();
  window.jogo = { engine, cena, renderer, input, montar };
})();
