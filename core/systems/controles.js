/* Sistema · controles
   Entidades com Controller + Velocity aceleram conforme os eixos do Input. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  C.Systems.controles = function (scene, dt, ctx) {
    const ax = ctx.input.axes;
    for (const e of scene.query('Controller', 'Velocity')) {
      const c = e.Controller, v = e.Velocity, acc = c.aceleracao || 1500, vm = c.velMax || 300;
      v.vx += ax.x * acc * dt; v.vy += ax.y * acc * dt;
      const s = Math.hypot(v.vx, v.vy);
      if (s > vm) { v.vx *= vm / s; v.vy *= vm / s; }      // limita a velocidade sem mudar a direção
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
