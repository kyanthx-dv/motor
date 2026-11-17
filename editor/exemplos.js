/* Editor · projetos de exemplo, montados com os MESMOS blocos que o usuário tem (nada de código escondido).
   Servem de ponto de partida e de teste: se o exemplo roda, os blocos bastam para um jogo pequeno. */
(function (root) {
  const E = root.EditorBlocos, X = root.EditorExemplos = {};
  const num = v => ({ k: 'num', v }), txt = v => ({ k: 'txt', v }), bl = (t, ex) => Object.assign(E.novo(t), ex || {});
  const script = blocos => ({ blocos, fonte: E.gerar(blocos) });
  const seOutro = (nome, f) => bl('se', { c: { k: 'cmp', a: { k: 'outro' }, op: '=', b: txt(nome) }, f, s: [] });

  // Pega-moedas: anda com as setas/WASD; moedas aparecem sozinhas; bomba reinicia o jogo.
  X.pegaMoedas = function () {
    const parede = (nome, x, y, w, h) => ({ nome, Transform: { x, y }, Body: { forma: 'retangulo', w, h, massa: 0, elasticidade: 0.3 }, Sprite: { cor: '#4a5d75' } });
    const scripts = {
      moeda: script([{ t: 'evento_gatilho', f: [seOutro('jogador', [bl('var_somar', { var: 'pontos', v: num(1) }), bl('som', { som: 'moeda' }), bl('remover')])] }]),
      bomba: script([{ t: 'evento_gatilho', f: [seOutro('jogador', [bl('som', { som: 'explosao' }), bl('reiniciar')])] }]),
      placar: script([{ t: 'evento_quadro', f: [bl('texto', { a: txt('Pontos: '), b: { k: 'var', n: 'pontos' } })] }]),
      gerador: script([{ t: 'evento_quadro', f: [
        bl('temporizador', { v: num(1), f: [bl('criar', { nome: 'moeda', tam: num(10), vx: { k: 'rand', min: 50, max: 750 }, vy: { k: 'rand', min: 50, max: 400 }, cor: '#ffd23f', tipo: 'sensor', script: 'moeda' })] }),
        bl('temporizador', { v: num(3), f: [bl('criar', { nome: 'bomba', tam: num(14), vx: { k: 'rand', min: 50, max: 750 }, vy: { k: 'rand', min: 50, max: 400 }, cor: '#ff4d4d', tipo: 'sensor', script: 'bomba' })] })
      ] }])
    };
    return {
      formato: root.Core.Serializer.FORMATO,
      estado: { vars: { pontos: 0 }, scripts },
      entidades: [
        parede('parede-cima', 400, 8, 800, 16), parede('parede-baixo', 400, 442, 800, 16), parede('parede-esq', 8, 225, 16, 450), parede('parede-dir', 792, 225, 16, 450),
        { nome: 'jogador', Transform: { x: 400, y: 225 }, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 16, massa: 1, elasticidade: 0.1, amortecimento: 4 }, Sprite: { forma: 'circulo', raio: 16, cor: '#4aa3ff' }, Controller: { aceleracao: 1800, velMax: 280 } },
        { nome: 'placar', Transform: { x: 100, y: 30 }, Sprite: { w: 170, h: 34, cor: 'rgba(0,0,0,.45)', rotulo: 'Pontos: 0', corTexto: '#ffffff', tamanhoTexto: 20, fixo: true }, Script: { nome: 'placar' } },
        { nome: 'gerador', Transform: { x: 0, y: 0 }, Script: { nome: 'gerador' } }
      ]
    };
  };
  // Mini-RPG: monta o jogo com os MODELOS de RPG (diálogo, inventário, vida) + scripts de código + um script de cena.
  X.miniRpg = function () {
    const parede = (nome, x, y, w, h) => ({ nome, Transform: { x, y }, Body: { forma: 'retangulo', w, h, massa: 0, elasticidade: 0.3 }, Sprite: { cor: '#4a5d75' } });
    const nomeDe = (ctx, id) => { const o = ctx.scene.get(id); return o && o.nome; };
    const scripts = {
      aldeao: { fonte: 'var falou = false;\nvar eventos = { gatilho: function (e, d, ctx) {\n  var o = ctx.scene.get(d.outro); if (!falou && o && o.nome === "jogador") { falou = true; ctx.events.emit("dialogo-abrir", { id: "inicio" }); }\n} };\n' },
      pocao: { fonte: 'var eventos = { gatilho: function (e, d, ctx) {\n  var o = ctx.scene.get(d.outro); if (o && o.nome === "jogador" && !e.Script.estado.pego) { e.Script.estado.pego = true; ctx.events.emit("inv-adicionar", { item: "pocao", qtd: 1 }); ctx.scene.destroy(e.id); }\n} };\n' },
      slime: { fonte: 'function atualizar(e, dt, ctx) {\n  var j = ctx.scene.find("jogador"); if (!j) return;\n  var dx = j.Transform.x - e.Transform.x, dy = j.Transform.y - e.Transform.y, d = Math.hypot(dx, dy) || 1;\n  e.Transform.x += dx / d * 40 * dt; e.Transform.y += dy / d * 40 * dt;\n}\nvar eventos = { gatilho: function (e, d, ctx) {\n  var o = ctx.scene.get(d.outro); if (o && o.nome === "jogador") ctx.events.emit("dano", { qtd: 1 });\n} };\n' },
      regras: { fonte: '// SCRIPT DE CENA: roda sem objeto. Aqui: ao morrer, recomeça o jogo.\nvar ligado = false;\nfunction iniciar(e, ctx) {\n  if (ligado) return; ligado = true;\n  ctx.events.on("morreu", function () { ctx.engine.reiniciar(); });\n}\n' }
    };
    const M = root.EditorModelos, ents = [
      parede('parede-cima', 400, 8, 800, 16), parede('parede-baixo', 400, 442, 800, 16), parede('parede-esq', 8, 225, 16, 450), parede('parede-dir', 792, 225, 16, 450),
      { nome: 'jogador', Transform: { x: 400, y: 225 }, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 16, massa: 1, elasticidade: 0.1, amortecimento: 4 }, Sprite: { forma: 'circulo', raio: 16, cor: '#4aa3ff' }, Controller: { aceleracao: 1800, velMax: 240 } },
      { nome: 'aldeao', Transform: { x: 160, y: 150 }, Body: { forma: 'retangulo', w: 56, h: 56, massa: 0, sensor: true }, Sprite: { forma: 'circulo', raio: 18, cor: '#f59e0b' }, Script: { nome: 'aldeao' } },
      { nome: 'slime', Transform: { x: 650, y: 330 }, Body: { forma: 'circulo', raio: 14, massa: 0, sensor: true }, Sprite: { forma: 'circulo', raio: 14, cor: '#22c55e' }, Script: { nome: 'slime' } },
      { nome: 'pocao 1', Transform: { x: 300, y: 330 }, Body: { forma: 'circulo', raio: 10, massa: 0, sensor: true }, Sprite: { forma: 'circulo', raio: 8, cor: '#ef4444' }, Script: { nome: 'pocao' } },
      { nome: 'pocao 2', Transform: { x: 560, y: 110 }, Body: { forma: 'circulo', raio: 10, massa: 0, sensor: true }, Sprite: { forma: 'circulo', raio: 8, cor: '#ef4444' }, Script: { nome: 'pocao' } },
      { nome: 'joystick', Transform: { x: 112, y: 351 }, Joystick: { modo: 'flutuante', visivel: true, raio: 56, zonaMorta: 0.12, zona: 'base' } }
    ];
    let proximo = 100; for (const k of ['dialogo', 'inventario', 'vida']) { const m = M.definicao(k); scripts[m.ctl] = { fonte: m.script }; const l = M.entidades(k, proximo); proximo += l.length; ents.push(...l); }
    return { formato: root.Core.Serializer.FORMATO, estado: { scripts, scriptsCena: ['regras'] }, entidades: ents };
  };
  X.lista = { 'Pega-moedas': X.pegaMoedas, 'Mini-RPG': X.miniRpg };
})(typeof window !== 'undefined' ? window : globalThis);
