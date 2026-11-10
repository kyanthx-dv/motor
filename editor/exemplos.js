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
  X.lista = { 'Pega-moedas': X.pegaMoedas };
})(typeof window !== 'undefined' ? window : globalThis);
