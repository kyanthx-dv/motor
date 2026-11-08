/* Sistema · fisica
   Corpos: círculo ({raio}) e retângulo ({w,h}, centrado no Transform, sem rotação).
   massa 0 = corpo fixo (parede). sensor:true = não empurra ninguém, só avisa (evento 'gatilho').
   Gravidade opcional em scene.estado.gravidade = { x, y } (px/s²). */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  const VEL_MAX = 1600;      // limite para um corpo não atravessar paredes de uma vez
  const REPOUSO = 25;        // abaixo disso não quica: evita tremedeira de objeto parado
  const ITERACOES = 3;       // repete a resolução para empilhamentos ficarem estáveis
  const forma = b => b.forma || (b.raio ? 'circulo' : 'retangulo');
  const invMassa = e => (e.Body.massa > 0 ? 1 / e.Body.massa : 0);
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

  function circCirc(a, b) {
    const dx = b.Transform.x - a.Transform.x, dy = b.Transform.y - a.Transform.y, r = a.Body.raio + b.Body.raio, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return null;
    const d = Math.sqrt(d2);
    return d === 0 ? { nx: 1, ny: 0, prof: r } : { nx: dx / d, ny: dy / d, prof: r - d };
  }
  function rectRect(a, b) {
    const dx = b.Transform.x - a.Transform.x, dy = b.Transform.y - a.Transform.y;
    const px = (a.Body.w + b.Body.w) / 2 - Math.abs(dx), py = (a.Body.h + b.Body.h) / 2 - Math.abs(dy);
    if (px <= 0 || py <= 0) return null;
    return px < py ? { nx: Math.sign(dx) || 1, ny: 0, prof: px } : { nx: 0, ny: Math.sign(dy) || 1, prof: py };
  }
  // a = círculo, b = retângulo. Normal aponta de a para b.
  function circRect(a, b) {
    const ax = a.Transform.x, ay = a.Transform.y, r = a.Body.raio, bx = b.Transform.x, by = b.Transform.y, hw = b.Body.w / 2, hh = b.Body.h / 2;
    const cx = limitar(ax, bx - hw, bx + hw), cy = limitar(ay, by - hh, by + hh);
    const dx = cx - ax, dy = cy - ay, d2 = dx * dx + dy * dy;
    if (d2 > r * r) return null;
    if (d2 > 0) { const d = Math.sqrt(d2); return { nx: dx / d, ny: dy / d, prof: r - d }; }
    // centro do círculo dentro do retângulo: sai pela face mais próxima
    const esq = ax - (bx - hw), dir = (bx + hw) - ax, topo = ay - (by - hh), base = (by + hh) - ay, m = Math.min(esq, dir, topo, base);
    if (m === esq) return { nx: 1, ny: 0, prof: m + r };
    if (m === dir) return { nx: -1, ny: 0, prof: m + r };
    if (m === topo) return { nx: 0, ny: 1, prof: m + r };
    return { nx: 0, ny: -1, prof: m + r };
  }
  function testar(a, b) {
    const fa = forma(a.Body), fb = forma(b.Body);
    if (fa === 'circulo' && fb === 'circulo') return circCirc(a, b);
    if (fa === 'circulo') return circRect(a, b);
    if (fb === 'circulo') { const m = circRect(b, a); return m && { nx: -m.nx, ny: -m.ny, prof: m.prof }; }
    return rectRect(a, b);
  }
  function resolver(a, b, m) {
    const ia = invMassa(a), ib = invMassa(b), soma = ia + ib; if (soma === 0) return;
    const corr = Math.max(m.prof - 0.01, 0) / soma * 0.8;                 // empurra para fora (correção de posição)
    a.Transform.x -= m.nx * corr * ia; a.Transform.y -= m.ny * corr * ia;
    b.Transform.x += m.nx * corr * ib; b.Transform.y += m.ny * corr * ib;
    const va = a.Velocity || { vx: 0, vy: 0 }, vb = b.Velocity || { vx: 0, vy: 0 };
    const rv = (vb.vx - va.vx) * m.nx + (vb.vy - va.vy) * m.ny;
    if (rv > 0) return;                                                    // já estão se afastando
    const el = Math.abs(rv) < REPOUSO ? 0 : Math.min(a.Body.elasticidade ?? 0.3, b.Body.elasticidade ?? 0.3);
    const j = -(1 + el) * rv / soma;
    if (ia > 0 && a.Velocity) { va.vx -= j * ia * m.nx; va.vy -= j * ia * m.ny; }
    if (ib > 0 && b.Velocity) { vb.vx += j * ib * m.nx; vb.vy += j * ib * m.ny; }
  }

  C.Systems.fisica = function (scene, dt, ctx) {
    const g = scene.estado.gravidade || { x: 0, y: 0 };
    // 1) mover
    for (const e of scene.query('Transform', 'Velocity')) {
      const v = e.Velocity, t = e.Transform;
      if (e.Body) {
        if (invMassa(e) === 0) continue;                                   // corpo fixo não se move
        if (!e.Body.semGravidade) { v.vx += g.x * dt; v.vy += g.y * dt; }
        const f = 1 / (1 + (e.Body.amortecimento || 0) * dt);              // atrito do ar/chão
        v.vx *= f; v.vy *= f;
      }
      const s = Math.hypot(v.vx, v.vy); if (s > VEL_MAX) { v.vx *= VEL_MAX / s; v.vy *= VEL_MAX / s; }
      t.x += v.vx * dt; t.y += v.vy * dt;
    }
    // 2) colidir
    const corpos = scene.query('Transform', 'Body');
    const alcance = corpos.map(e => (forma(e.Body) === 'circulo' ? e.Body.raio : Math.hypot(e.Body.w, e.Body.h) / 2));
    for (let it = 0; it < ITERACOES; it++) {
      for (let i = 0; i < corpos.length; i++) {
        for (let k = i + 1; k < corpos.length; k++) {
          const a = corpos[i], b = corpos[k];
          if (invMassa(a) === 0 && invMassa(b) === 0) continue;
          if (a.Body.sensor && b.Body.sensor) continue;
          if (Math.abs(a.Transform.x - b.Transform.x) > alcance[i] + alcance[k] || Math.abs(a.Transform.y - b.Transform.y) > alcance[i] + alcance[k]) continue;
          const m = testar(a, b); if (!m) continue;
          if (a.Body.sensor || b.Body.sensor) {
            if (it === 0) {
              if (a.Body.sensor) ctx.events.emit('gatilho', { para: a.id, outro: b.id });
              if (b.Body.sensor) ctx.events.emit('gatilho', { para: b.id, outro: a.id });
            }
            continue;
          }
          resolver(a, b, m);
          if (it === 0) { ctx.events.emit('colisao', { para: a.id, outro: b.id }); ctx.events.emit('colisao', { para: b.id, outro: a.id }); }
        }
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
