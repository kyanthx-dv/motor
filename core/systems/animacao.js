/* Sistema · animacao
   Componente Animacao: { atual, animacoes:{ nome:{ linha, quadros, fps, repetir } } }.
   Só avança números (tempo, quadro, linha). Quem escolhe a imagem é o renderizador. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  C.Systems.animacao = function (scene, dt) {
    for (const e of scene.query('Animacao')) {
      const a = e.Animacao, def = a.animacoes && a.animacoes[a.atual]; if (!def) continue;
      if (a._ult !== a.atual) { a._ult = a.atual; a.tempo = 0; }        // trocou de animação: recomeça
      a.tempo = (a.tempo || 0) + dt; a.linha = def.linha || 0;
      const n = def.quadros || 1, q = Math.floor(a.tempo * (def.fps || 8));
      a.quadro = def.repetir === false ? Math.min(q, n - 1) : q % n;
      a.terminou = def.repetir === false && q >= n - 1;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
