/* Sistema · hierarquia
   Entidade com Pai = { id, dx, dy } segue o pai: Transform = Transform do pai + (dx, dy). Por padrão só posição. Com Pai.girar:true o filho também gira com o pai: o deslocamento (dx, dy) é rotacionado por Transform.rot do pai e Transform.rot do filho = rot do pai + Pai.rot (extra, opcional).
   Serve para anexar sensores/armas/efeitos/UI a um objeto. Filhos com Body dinâmico são sobrescritos: use sensores ou objetos sem física.
   Roda antes e depois da física, então o filho nunca fica um quadro atrasado. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  // Ordem dos pais primeiro (profundidade). Ciclos são ignorados com segurança.
  function profundidade(scene, e) { let n = 0, x = e; const visto = new Set(); while (x && x.Pai && !visto.has(x.id)) { visto.add(x.id); x = scene.get(x.Pai.id); n++; if (n > 64) return Infinity; } return x && x.Pai ? Infinity : n; }
  C.Systems.hierarquia = function (scene) {
    const filhos = scene.query('Pai', 'Transform'); if (!filhos.length) return;
    const lista = filhos.map(e => [profundidade(scene, e), e]).filter(([d]) => d !== Infinity).sort((a, b) => a[0] - b[0]);
    for (const [, e] of lista) {
      const p = scene.get(e.Pai.id); if (!p || !p.Transform) continue;
      const t = e.Transform, pt = p.Transform; let dx = e.Pai.dx || 0, dy = e.Pai.dy || 0;
      if (e.Pai.girar) { const a = pt.rot || 0, c = Math.cos(a), sn = Math.sin(a), rx = dx * c - dy * sn, ry = dx * sn + dy * c; dx = rx; dy = ry; t.rot = a + (e.Pai.rot || 0); }
      t.px = (pt.px === undefined ? pt.x : pt.px) + dx; t.py = (pt.py === undefined ? pt.y : pt.py) + dy;   // desenho interpolado acompanha o pai
      t.x = pt.x + dx; t.y = pt.y + dy;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
