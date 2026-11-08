/* Exemplo · Mini Futebol
   Tudo aqui é "jogo", não "núcleo": cena, scripts e interface. O núcleo (core/) não sabe que isto é futebol. */
(function () {
  const C = Core, L = 800, A = 450;
  const tela = document.getElementById('tela');
  const renderer = new C.CanvasRenderer(tela, { largura: L, altura: A, fundo: '#2f7d4f' });
  const input = new C.Input(tela, renderer);
  const engine = new C.Engine({ renderer, input });
  const cena = engine.scene;

  /* ---------- scripts ---------- */
  function chutar(e, forca, alvoDir) {
    const bola = cena.find('bola'); if (!bola) return false;
    const dx = bola.Transform.x - e.Transform.x, dy = bola.Transform.y - e.Transform.y, d = Math.hypot(dx, dy);
    if (d > e.Body.raio + bola.Body.raio + 16) return false;
    let nx = dx / (d || 1), ny = dy / (d || 1);
    if (alvoDir) { nx = nx * 0.4 + alvoDir.x * 0.6; ny = ny * 0.4 + alvoDir.y * 0.6; const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m; }
    bola.Velocity.vx += nx * forca; bola.Velocity.vy += ny * forca; return true;
  }
  engine.registrarScript('jogador', {
    atualizar(e, dt, ctx) { if (ctx.input.pressed.has('acao')) chutar(e, 560); }
  });
  engine.registrarScript('ia', {
    atualizar(e, dt, ctx) {
      const bola = cena.find('bola'); if (!bola) return;
      const p = e.Script.params, s = e.Script.estado, T = e.Transform, B = bola.Transform;
      s.espera = Math.max(0, (s.espera || 0) - dt);
      // fica do lado direito da bola para empurrá-la para o gol da esquerda; se estiver do lado errado, contorna
      let tx = B.x + 30, ty = B.y;
      if (T.x < B.x + 10) { tx = B.x + 70; ty = B.y + (T.y < B.y ? -60 : 60); }
      const dx = tx - T.x, dy = ty - T.y, d = Math.hypot(dx, dy) || 1;
      e.Velocity.vx += dx / d * p.aceleracao * dt; e.Velocity.vy += dy / d * p.aceleracao * dt;
      const v = Math.hypot(e.Velocity.vx, e.Velocity.vy); if (v > p.velMax) { e.Velocity.vx *= p.velMax / v; e.Velocity.vy *= p.velMax / v; }
      if (s.espera === 0 && T.x > B.x && chutar(e, 430, { x: -1, y: (225 - B.y) / 225 })) s.espera = 0.7;
    }
  });
  engine.registrarScript('gol', {
    eventos: {
      gatilho(e, d, ctx) {
        const alvo = cena.get(d.outro); if (!alvo || alvo.nome !== 'bola') return;
        const p = cena.estado.placar; if (e.Script.params.lado === 'esq') p.oponente++; else p.jogador++;
        cena.estado.golEm = ctx.engine.tempo;
        for (const o of cena.query('Spawn', 'Transform')) {
          o.Transform.x = o.Transform.px = o.Spawn.x; o.Transform.y = o.Transform.py = o.Spawn.y;
          if (o.Velocity) o.Velocity.vx = o.Velocity.vy = 0;
        }
      }
    }
  });

  /* ---------- cena ---------- */
  const parede = (x, y, w, h) => ({ Transform: { x, y }, Body: { forma: 'retangulo', w, h, massa: 0, elasticidade: 0.8 }, Sprite: { cor: '#1f5a39', camada: 1 } });
  function montar() {
    cena.clear(); cena.estado = { placar: { jogador: 0, oponente: 0 }, golEm: -99 };
    // marcações do campo (só desenho)
    cena.create({ nome: 'linha', Transform: { x: 400, y: 225 }, Sprite: { forma: 'retangulo', w: 3, h: 370, cor: 'rgba(255,255,255,.45)', camada: -2 } });
    cena.create({ nome: 'circulo-central', Transform: { x: 400, y: 225 }, Sprite: { forma: 'anel', raio: 62, cor: 'rgba(255,255,255,.45)', larguraBorda: 3, camada: -2 } });
    // paredes (o gol é uma abertura de 140 px em cada lado)
    cena.create({ nome: 'parede', ...parede(400, 20, 800, 40) });
    cena.create({ nome: 'parede', ...parede(400, 430, 800, 40) });
    for (const x of [20, 780]) { cena.create({ nome: 'parede', ...parede(x, 97.5, 40, 115) }); cena.create({ nome: 'parede', ...parede(x, 352.5, 40, 115) }); }
    for (const x of [-10, 810]) cena.create({ nome: 'fundo-gol', Transform: { x, y: 225 }, Body: { forma: 'retangulo', w: 20, h: 140, massa: 0 } });
    // gols: sensores atrás da linha. Disparam quando o CENTRO da bola cruza a linha.
    cena.create({ nome: 'gol_esq', Transform: { x: 13, y: 225 }, Body: { forma: 'retangulo', w: 26, h: 140, massa: 0, sensor: true }, Sprite: { cor: 'rgba(255,255,255,.22)', camada: 0 }, Script: { nome: 'gol', params: { lado: 'esq' } } });
    cena.create({ nome: 'gol_dir', Transform: { x: 787, y: 225 }, Body: { forma: 'retangulo', w: 26, h: 140, massa: 0, sensor: true }, Sprite: { cor: 'rgba(255,255,255,.22)', camada: 0 }, Script: { nome: 'gol', params: { lado: 'dir' } } });
    // bola e jogadores
    cena.create({ nome: 'bola', Transform: { x: 400, y: 225 }, Velocity: { vx: 0, vy: 0 }, Spawn: { x: 400, y: 225 },
      Body: { forma: 'circulo', raio: 14, massa: 1, elasticidade: 0.9, amortecimento: 0.8 }, Sprite: { cor: '#f8fafc', borda: '#1f2937', camada: 3 } });
    cena.create({ nome: 'jogador', Transform: { x: 150, y: 225 }, Velocity: { vx: 0, vy: 0 }, Spawn: { x: 150, y: 225 },
      Body: { forma: 'circulo', raio: 18, massa: 3, elasticidade: 0.5, amortecimento: 4 }, Sprite: { cor: '#3b82f6', borda: '#fff', camada: 4 },
      Controller: { aceleracao: 2600, velMax: 260 }, Script: { nome: 'jogador' } });
    cena.create({ nome: 'oponente', Transform: { x: 650, y: 225 }, Velocity: { vx: 0, vy: 0 }, Spawn: { x: 650, y: 225 },
      Body: { forma: 'circulo', raio: 18, massa: 3, elasticidade: 0.5, amortecimento: 4 }, Sprite: { cor: '#ef4444', borda: '#fff', camada: 4 },
      Script: { nome: 'ia', params: { aceleracao: 1500, velMax: 205 } } });
  }

  /* ---------- interface ---------- */
  const $ = id => document.getElementById(id), KEY = 'engine-futebol-save';
  const placar = $('placar'), flash = $('flash');
  setInterval(() => {
    const p = cena.estado.placar; if (p) placar.textContent = p.jogador + '  ×  ' + p.oponente;
    const dt = engine.tempo - (cena.estado.golEm ?? -99); flash.hidden = !(dt >= 0 && dt < 1.1);
  }, 100);
  $('b-reiniciar').addEventListener('click', montar);
  $('b-pausar').addEventListener('click', e => { engine.pausado = !engine.pausado; e.currentTarget.textContent = engine.pausado ? 'Continuar' : 'Pausar'; });
  $('b-debug').addEventListener('click', () => { renderer.debug = !renderer.debug; });
  const aviso = t => { const el = $('aviso'); el.textContent = t; el.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(() => el.hidden = true, 1600); };
  $('b-salvar').addEventListener('click', () => { try { localStorage.setItem(KEY, JSON.stringify(C.Serializer.paraJSON(cena))); aviso('Jogo salvo'); } catch (e) { aviso('Não foi possível salvar'); } });
  $('b-carregar').addEventListener('click', () => {
    try { const raw = localStorage.getItem(KEY); if (!raw) return aviso('Nada salvo ainda'); C.Serializer.deJSON(cena, JSON.parse(raw)); aviso('Jogo carregado'); } catch (e) { aviso('Save inválido'); }
  });
  const chute = $('b-chute'), solta = () => input.pressionar('acao', false);
  chute.addEventListener('pointerdown', e => { input.pressionar('acao', true); e.preventDefault(); });
  chute.addEventListener('pointerup', solta); chute.addEventListener('pointerleave', solta); chute.addEventListener('pointercancel', solta);

  if (C.Depurador) new C.Depurador(engine, renderer, tela);
  montar(); engine.iniciar();
  window.jogo = { engine, cena, renderer, input, montar };      // acesso pelo console do navegador
})();
