/* Sistema · tiles (opcional). Mapa de tiles: componente Tiles { tamanho, colunas, linhas, paleta:[{cor, solido?, imagem?}], dados:[0|k], acima? }
   com Transform no canto superior esquerdo. Na primeira vez que roda, cria colisores estáticos (um retângulo por sequência horizontal
   de células sólidas) e marca Tiles.gerado. Os colisores são entidades "_tile" com a etiqueta "solido".
   C.Tiles.em(e, x, y) lê a célula do mundo; C.Tiles.definir(e, x, y, k) pinta (e refaz os colisores se já gerados). */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  const celula = (e, x, y) => { const T = e.Tiles, c = Math.floor((x - e.Transform.x) / T.tamanho), r = Math.floor((y - e.Transform.y) / T.tamanho); return c < 0 || r < 0 || c >= T.colunas || r >= T.linhas ? -1 : r * T.colunas + c; };
  function colisores(scene, e) {
    const T = e.Tiles, t = e.Transform, S = T.tamanho;
    for (const o of [...scene.entities.values()]) if (o.nome === '_tile' && o.Tile && o.Tile.dono === e.id) scene.destroy(o.id);
    for (let r = 0; r < T.linhas; r++) {
      let c = 0;
      while (c < T.colunas) {
        const sol = k => k > 0 && T.paleta[k - 1].solido;
        if (!sol(T.dados[r * T.colunas + c])) { c++; continue; }
        let c1 = c; while (c1 < T.colunas && sol(T.dados[r * T.colunas + c1])) c1++;
        scene.create({ nome: '_tile', Tile: { dono: e.id }, Transform: { x: t.x + (c + c1) * S / 2, y: t.y + (r + .5) * S }, Body: { forma: 'retangulo', w: (c1 - c) * S, h: S, massa: 0, elasticidade: 0 }, Etiquetas: ['solido'] });
        c = c1;
      }
    }
    T.gerado = true;
  }
  C.Tiles = {
    em(e, x, y) { const i = celula(e, x, y); return i < 0 ? 0 : e.Tiles.dados[i]; },
    definir(scene, e, x, y, k) {
      const i = celula(e, x, y); if (i < 0) return false;
      if (!Number.isInteger(k) || k < 0 || k > e.Tiles.paleta.length) throw new RangeError('tile ' + k + ' fora da paleta');
      e.Tiles.dados[i] = k; if (e.Tiles.gerado) colisores(scene, e); return true;
    },
    colisores
  };
  C.Systems.tiles = function (scene) { for (const e of scene.query('Transform', 'Tiles')) if (!e.Tiles.gerado) colisores(scene, e); };
})(typeof window !== 'undefined' ? window : globalThis);
