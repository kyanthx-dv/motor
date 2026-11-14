/* Sistema · efeitos (opcional): tremer a câmera, fade de tela e partículas. Estado de execução em scene.efeitos (não é salvo).
   C.Efeitos.tremer(scene, forca, dur)  ·  C.Efeitos.fade(scene, cor, de, para, dur)  ·  C.Efeitos.particulas(scene, x, y, {n, cor, tamanho, vel, vida, gravidade, espalhar})
   Partículas são entidades "_particula" (Sprite + Particula); no máximo 400 ao mesmo tempo. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  const MAX_PART = 400, num = (v, pad, min, max) => (Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : pad);
  const ef = scene => scene.efeitos || (scene.efeitos = { tx: 0, ty: 0, tremor: null, fade: null });
  C.Efeitos = {
    tremer(scene, forca, dur) { ef(scene).tremor = { forca: num(forca, 6, 0, 80), dur: num(dur, 0.3, 0.02, 10), t: 0 }; },
    fade(scene, cor, de, para, dur) { const d = num(dur, 0.5, 0, 60), a = num(de, 0, 0, 1), b = num(para, 1, 0, 1); ef(scene).fade = { cor: typeof cor === 'string' && cor.length < 40 ? cor : '#000', alpha: a, de: a, para: b, dur: d, t: 0 }; },
    particulas(scene, x, y, o) {
      o = o || {}; const rest = MAX_PART - scene.query('Particula').length; const n = Math.max(0, Math.min(num(o.n, 12, 0, 200), rest)), vel = num(o.vel, 120, 0, 2000), vida = num(o.vida, 0.6, 0.05, 20);
      for (let i = 0; i < n; i++) {
        const a = o.espalhar === 'cima' ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6 : Math.random() * Math.PI * 2, v = vel * (0.4 + Math.random() * 0.6), tam = num(o.tamanho, 4, 0.5, 100);
        scene.create({ nome: '_particula', Transform: { x, y }, Sprite: { forma: 'circulo', raio: tam, cor: typeof o.cor === 'string' ? o.cor : '#ffd400', camada: 50 }, Particula: { vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: num(o.gravidade, 0, -5000, 5000), vida, t: 0, raio0: tam } });
      }
      return n;
    }
  };
  C.Systems.efeitos = function (scene, dt) {
    const E = scene.efeitos;
    if (E) {
      if (E.tremor) { const T = E.tremor; T.t += dt; if (T.t >= T.dur) { E.tremor = null; E.tx = E.ty = 0; } else { const k = T.forca * (1 - T.t / T.dur); E.tx = (Math.random() * 2 - 1) * k; E.ty = (Math.random() * 2 - 1) * k; } }
      if (E.fade) { const F = E.fade; F.t += dt; const k = F.dur > 0 ? Math.min(1, F.t / F.dur) : 1; F.alpha = F.de + (F.para - F.de) * k; if (k >= 1 && F.para === 0) E.fade = null; }
    }
    for (const e of scene.query('Particula', 'Transform', 'Sprite')) {
      const p = e.Particula; p.t += dt; if (p.t >= p.vida) { scene.destroy(e.id); continue; }
      p.vy += p.g * dt; e.Transform.x += p.vx * dt; e.Transform.y += p.vy * dt; const r = 1 - p.t / p.vida; e.Sprite.raio = Math.max(0.3, p.raio0 * r); e.Sprite.opacidade = r;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
