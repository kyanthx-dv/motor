/* Sistema · fisica
   Corpos: círculo ({raio}), retângulo ({w,h}, centrado no Transform, sem rotação) e polígono convexo ({forma:'poligono', pontos:[[x,y],...]} relativos ao Transform).
   massa 0 = corpo fixo (parede). sensor:true = não empurra ninguém, só avisa (evento 'gatilho').
   Gravidade opcional em scene.estado.gravidade = { x, y } (px/s²). */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  const VEL_MAX = 1600;      // teto de velocidade (os subpassos garantem a detecção mesmo perto dele)
  const REPOUSO = 25;        // abaixo disso não quica: evita tremedeira de objeto parado
  const ITERACOES = 3;       // repete a resolução para empilhamentos ficarem estáveis
  const forma = b => b.forma || (b.raio ? 'circulo' : 'retangulo');
  const invMassa = e => (e.Body.massa > 0 ? 1 / e.Body.massa : 0);
  // Camadas: Body.camada (nome, padrão 'padrao') e Body.colide (lista de camadas; sem lista = todas).
  // Só colidem se cada um aceita a camada do outro.
  const colidem = (a, b) => { const ca = a.Body.colide, cb = b.Body.colide; return (!ca || ca.includes(b.Body.camada || 'padrao')) && (!cb || cb.includes(a.Body.camada || 'padrao')); };
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
  // Polígono convexo (e retângulo/círculo contra polígono) por eixos separadores (SAT). Normal aponta de a para b.
  const cantos = e => { const b = e.Body, t = e.Transform; if (forma(b) === 'poligono') return b.pontos.map(q => [t.x + q[0], t.y + q[1]]); const hw = b.w / 2, hh = b.h / 2; return [[t.x - hw, t.y - hh], [t.x + hw, t.y - hh], [t.x + hw, t.y + hh], [t.x - hw, t.y + hh]]; };
  function forma2(e) {
    if (forma(e.Body) === 'circulo') return { c: [e.Transform.x, e.Transform.y], r: e.Body.raio };
    const P = cantos(e); let sx = 0, sy = 0; for (const q of P) { sx += q[0]; sy += q[1]; } return { P, c: [sx / P.length, sy / P.length] };
  }
  const proj = (S, nx, ny) => { if (S.r !== undefined) { const m = S.c[0] * nx + S.c[1] * ny; return [m - S.r, m + S.r]; } let lo = Infinity, hi = -Infinity; for (const q of S.P) { const d = q[0] * nx + q[1] * ny; if (d < lo) lo = d; if (d > hi) hi = d; } return [lo, hi]; };
  function eixosDe(S, outro, lista) {
    if (S.P) for (let i = 0; i < S.P.length; i++) { const p = S.P[i], q = S.P[(i + 1) % S.P.length], ex = q[0] - p[0], ey = q[1] - p[1], l = Math.hypot(ex, ey); if (l > 1e-9) lista.push([ey / l, -ex / l]); }
    else if (outro.P) { let md = Infinity, mq = null; for (const q of outro.P) { const d = Math.hypot(q[0] - S.c[0], q[1] - S.c[1]); if (d < md) { md = d; mq = q; } } if (md > 1e-9) lista.push([(mq[0] - S.c[0]) / md, (mq[1] - S.c[1]) / md]); }
  }
  function sat(a, b) {
    const A = forma2(a), B = forma2(b), eixos = []; eixosDe(A, B, eixos); eixosDe(B, A, eixos);
    let prof = Infinity, nx = 1, ny = 0;
    for (const [x, y] of eixos) {
      const pa = proj(A, x, y), pb = proj(B, x, y), ov = Math.min(pa[1] - pb[0], pb[1] - pa[0]);
      if (ov <= 0) return null; if (ov < prof) { prof = ov; nx = x; ny = y; }
    }
    if ((B.c[0] - A.c[0]) * nx + (B.c[1] - A.c[1]) * ny < 0) { nx = -nx; ny = -ny; }
    return { nx, ny, prof };
  }
  // Largura/altura da caixa e alcance (distância máxima ao centro) de qualquer corpo.
  function medidas(b) {
    if (forma(b) === 'circulo') return { fino: 2 * b.raio, alc: b.raio };
    if (forma(b) === 'poligono') { let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, al = 0; for (const q of b.pontos) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); al = Math.max(al, Math.hypot(q[0], q[1])); } return { fino: Math.min(x1 - x0, y1 - y0), alc: al }; }
    return { fino: Math.min(b.w, b.h), alc: Math.hypot(b.w, b.h) / 2 };
  }
  function testar(a, b) {
    const fa = forma(a.Body), fb = forma(b.Body);
    if (fa === 'poligono' || fb === 'poligono') return sat(a, b);
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

  // O passo é dividido em subpassos para que ninguém ande, num subpasso, mais que METADE da menor dimensão de qualquer corpo
  // (parede e sensor sem Velocity contam). Garantia: sem tunneling até VEL_MAX com corpos de menor dimensão >= 2 px (teto de MAX_SUB subpassos).
  // A gravidade entra na conta (a velocidade cresce durante o passo). Eventos saem uma vez por par a cada passo.
  const MAX_SUB = 32;
  C.Systems.fisica = function (scene, dt, ctx) {
    let vmax = 0, fino = Infinity;
    for (const e of scene.query('Transform', 'Body')) { const b = e.Body; fino = Math.min(fino, medidas(b).fino); }
    const g = scene.estado.gravidade || { x: 0, y: 0 }, dg = Math.hypot(g.x || 0, g.y || 0) * dt;
    for (const e of scene.query('Transform', 'Velocity', 'Body')) if (invMassa(e) > 0) vmax = Math.max(vmax, Math.hypot(e.Velocity.vx, e.Velocity.vy) + dg);
    vmax = Math.min(vmax, VEL_MAX);
    const passo = Math.max(1, Math.min(8, fino / 2));
    const n = Math.min(MAX_SUB, Math.max(1, Math.ceil(vmax * dt / passo))), vistos = new Set();
    for (let i = 0; i < n; i++) subpasso(scene, dt / n, ctx, vistos);
  };
  function subpasso(scene, dt, ctx, vistos) {
    const g = scene.estado.gravidade || { x: 0, y: 0 };
    const avisar = (nome, para, outro) => { const k = nome + para + ':' + outro; if (!vistos.has(k)) { vistos.add(k); ctx.events.emit(nome, { para, outro }); } };
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
    const alcance = corpos.map(e => medidas(e.Body).alc);
    for (let it = 0; it < ITERACOES; it++) {
      for (let i = 0; i < corpos.length; i++) {
        for (let k = i + 1; k < corpos.length; k++) {
          const a = corpos[i], b = corpos[k];
          if (invMassa(a) === 0 && invMassa(b) === 0) continue;
          if (a.Body.sensor && b.Body.sensor) continue;
          if (!colidem(a, b)) continue;
          if (Math.abs(a.Transform.x - b.Transform.x) > alcance[i] + alcance[k] || Math.abs(a.Transform.y - b.Transform.y) > alcance[i] + alcance[k]) continue;
          const m = testar(a, b); if (!m) continue;
          if (a.Body.sensor || b.Body.sensor) {
            if (a.Body.sensor) avisar('gatilho', a.id, b.id);
            if (b.Body.sensor) avisar('gatilho', b.id, a.id);
            continue;
          }
          resolver(a, b, m);
          avisar('colisao', a.id, b.id); avisar('colisao', b.id, a.id);
        }
      }
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
