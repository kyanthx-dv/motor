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
      // Código de jogo pode falhar: o erro é isolado (as outras entidades seguem), contado e avisado uma vez por script/fase.
      const tentar = (fase, fn) => { try { fn(); } catch (x) { falhou(ctx, e, s.nome, fase, x); } };
      if (!s.iniciado) { s.iniciado = true; s.estado = s.estado || {}; s.params = s.params || {}; if (def.iniciar) tentar('iniciar', () => def.iniciar(e, ctx)); }
      if (def.atualizar) tentar('atualizar', () => def.atualizar(e, dt, ctx));
    }
  };
  function falhou(ctx, e, nome, fase, x) {
    const en = ctx.engine; en.errosScript = (en.errosScript || 0) + 1;
    ctx.events.emit('erro-script', { entidade: e.id, script: nome, fase, mensagem: String(x && x.message || x) });
    en._avisosScript = en._avisosScript || new Set(); const k = nome + ':' + fase;
    if (!en._avisosScript.has(k)) { en._avisosScript.add(k); if (typeof console !== 'undefined') console.warn('[Core] erro no script "' + nome + '" (' + fase + ') na entidade ' + e.id + ': ' + (x && x.message || x)); }
  }
})(typeof window !== 'undefined' ? window : globalThis);
