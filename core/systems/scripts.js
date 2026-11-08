/* Sistema · scripts
   Lógica de jogo por entidade. O componente Script guarda só dados: { nome, params, estado }.
   O código mora em engine.registrarScript(nome, { iniciar, atualizar, eventos }).
   Por quê: assim a cena salva em JSON continua válida, e o código é religado pelo nome. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  C.Systems.scripts = function (scene, dt, ctx) {
    for (const e of scene.query('Script')) {
      const s = e.Script, def = ctx.engine.scripts[s.nome];
      if (!def) continue;
      if (!s.iniciado) { s.iniciado = true; s.estado = s.estado || {}; s.params = s.params || {}; if (def.iniciar) def.iniciar(e, ctx); }
      if (def.atualizar) def.atualizar(e, dt, ctx);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
