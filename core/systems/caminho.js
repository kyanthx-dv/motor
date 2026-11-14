/* Sistema · caminho (opcional). Pathfinding A* numa grade de Tiles (células com paleta[k-1].solido são paredes) e seguidor de rota.
   C.Caminho.achar(scene, de, para, {mapa?, raio?}) → [{x,y},...] em coordenadas do mundo (ou null se não há caminho).
   C.Caminho.ir(scene, e, x, y, vel, opcoes) → true/false: calcula e põe Rota {pontos, i, vel} na entidade; o sistema a move até chegar.
   Ao chegar emite 'chegou' {para: id} (vai para eventos.chegou do script). C.Caminho.parar(e) cancela. Limite: 20000 nós por busca. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  const MAX_NOS = 20000, SQ2 = Math.SQRT2;
  const mapaDe = (scene, o) => (o && o.mapa) || scene.query('Transform', 'Tiles')[0] || null;
  const bloqueada = (T, c, r) => { if (c < 0 || r < 0 || c >= T.colunas || r >= T.linhas) return true; const k = T.dados[r * T.colunas + c]; return k > 0 && !!T.paleta[k - 1].solido; };
  function livreEm(m, x, y, raio) {   // o ponto (com folga raio) não toca parede
    const T = m.Tiles, S = T.tamanho, ox = m.Transform.x, oy = m.Transform.y, pts = raio > 0 ? [[0, 0], [raio, 0], [-raio, 0], [0, raio], [0, -raio]] : [[0, 0]];
    for (const [dx, dy] of pts) if (bloqueada(T, Math.floor((x + dx - ox) / S), Math.floor((y + dy - oy) / S))) return false; return true;
  }
  function visivel(m, a, b, raio) {
    const S = m.Tiles.tamanho, d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / (S / 4)));
    for (let i = 1; i < n; i++) if (!livreEm(m, a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n, raio)) return false; return true;
  }
  class Heap { constructor() { this.a = []; } get n() { return this.a.length; }
    push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, t = a[0], u = a.pop(); if (a.length) { a[0] = u; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return t; } }
  function achar(scene, de, para, opcoes) {
    const m = mapaDe(scene, opcoes); if (!m || !de || !para || !Number.isFinite(de.x + de.y + para.x + para.y)) return null;
    const T = m.Tiles, S = T.tamanho, raio = (opcoes && opcoes.raio) || 0, cel = (x, y) => [Math.floor((x - m.Transform.x) / S), Math.floor((y - m.Transform.y) / S)];
    let [c0, r0] = cel(de.x, de.y), [c1, r1] = cel(para.x, para.y);
    if (bloqueada(T, c0, r0)) return null;
    if (bloqueada(T, c1, r1)) {   // destino em parede: usa a célula livre mais próxima (até 3 células)
      let melhor = null, md = Infinity; for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) if (!bloqueada(T, c1 + dc, r1 + dr)) { const d = dc * dc + dr * dr; if (d < md) { md = d; melhor = [c1 + dc, r1 + dr]; } }
      if (!melhor) return null; [c1, r1] = melhor; para = { x: m.Transform.x + (c1 + .5) * S, y: m.Transform.y + (r1 + .5) * S };
    }
    const id = (c, r) => r * T.colunas + c, g = new Map(), pai = new Map(), fechado = new Set(), h = new Heap();
    const heur = (c, r) => { const dx = Math.abs(c - c1), dy = Math.abs(r - r1); return (dx + dy) + (SQ2 - 2) * Math.min(dx, dy); };
    g.set(id(c0, r0), 0); h.push({ c: c0, r: r0, f: heur(c0, r0) }); let nos = 0, fim = null;
    while (h.n) {
      const cur = h.pop(), k = id(cur.c, cur.r); if (fechado.has(k)) continue; fechado.add(k);
      if (cur.c === c1 && cur.r === r1) { fim = k; break; } if (++nos > MAX_NOS) return null;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue; const nc = cur.c + dc, nr = cur.r + dr; if (bloqueada(T, nc, nr)) continue;
        if (dc && dr && (bloqueada(T, cur.c + dc, cur.r) || bloqueada(T, cur.c, cur.r + dr))) continue;   // não corta quina
        const nk = id(nc, nr); if (fechado.has(nk)) continue; const ng = g.get(k) + (dc && dr ? SQ2 : 1);
        if (!g.has(nk) || ng < g.get(nk)) { g.set(nk, ng); pai.set(nk, k); h.push({ c: nc, r: nr, f: ng + heur(nc, nr) }); }
      }
    }
    if (fim === null) return null;
    const celulas = []; for (let k = fim; k !== undefined; k = pai.get(k)) celulas.push({ x: m.Transform.x + ((k % T.colunas) + .5) * S, y: m.Transform.y + (Math.floor(k / T.colunas) + .5) * S });
    celulas.reverse(); celulas[0] = { x: de.x, y: de.y }; celulas[celulas.length - 1] = { x: para.x, y: para.y };
    const rota = [celulas[0]]; let a = 0;   // alisa: do ponto atual, vai ao mais distante que se enxerga em linha reta
    while (a < celulas.length - 1) { let b = celulas.length - 1; while (b > a + 1 && !visivel(m, celulas[a], celulas[b], raio)) b--; rota.push(celulas[b]); a = b; }
    return rota.slice(1);
  }
  const Caminho = {
    achar,
    ir(scene, e, x, y, vel, opcoes) {
      if (!e || !e.Transform) return false; const r = achar(scene, e.Transform, { x, y }, opcoes); if (!r) return false;
      if (!(vel > 0)) vel = 100; e.Rota = { pontos: r, i: 0, vel }; if (!e.Velocity) e.Velocity = { vx: 0, vy: 0 }; return true;
    },
    parar(e) { if (e && e.Rota) { delete e.Rota; if (e.Velocity) { e.Velocity.vx = 0; e.Velocity.vy = 0; } } }
  };
  C.Caminho = Caminho;
  C.Systems.caminho = function (scene, dt, ctx) {
    for (const e of scene.query('Transform', 'Rota')) {
      const R = e.Rota, t = e.Transform, v = e.Velocity || (e.Velocity = { vx: 0, vy: 0 });
      while (R.i < R.pontos.length) { const p = R.pontos[R.i]; if (Math.hypot(p.x - t.x, p.y - t.y) <= Math.max(2, R.vel * dt)) R.i++; else break; }
      if (R.i >= R.pontos.length) { delete e.Rota; v.vx = 0; v.vy = 0; if (ctx && ctx.events) ctx.events.emit('chegou', { para: e.id }); continue; }
      const p = R.pontos[R.i], d = Math.hypot(p.x - t.x, p.y - t.y); v.vx = (p.x - t.x) / d * R.vel; v.vy = (p.y - t.y) / d * R.vel;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
