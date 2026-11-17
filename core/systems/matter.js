/* Plugin de física Matter.js (opcional): corpos que giram, empilham e se ligam por juntas.
   Só roda quando a biblioteca Matter existe (adapters/vendor/matter.min.js) E há entidades com o componente Corpo.
   Corpo : { tipo:'dinamico'|'estatico', forma:'retangulo'|'circulo', w, h, raio, densidade, atrito, elasticidade, amortecimento, rotacaoFixa }
   Junta : { com:'nome do outro objeto', tipo:'pino'|'mola', comprimento, rigidez 0-1, amortecimento, ax, ay, bx, by }  (âncoras relativas a cada objeto)
   cena  : estado.matter = { gravidadeX, gravidadeY }  (padrão 0 e 1)
   Eventos: "colisao" {para, outro} (igual à física normal). Scripts: ctx.matter.forca(e,fx,fy) · .velocidade(e,vx,vy) · .ler(e) */
(function (root) {
  const C = root.Core; if (!C) return;
  const lib = () => root.Matter;
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  function criar(L, e) {
    const K = e.Corpo, T = e.Transform, S = e.Sprite || {}, x = T.x, y = T.y;
    const opc = { isStatic: K.tipo === 'estatico', density: num(K.densidade, 0.001), friction: num(K.atrito, 0.1), restitution: num(K.elasticidade, 0), frictionAir: num(K.amortecimento, 0.01), angle: num(T.rot, 0), plugin: { eid: e.id } };
    const circ = K.forma === 'circulo' || (!K.forma && K.raio !== undefined);
    const b = circ ? L.Bodies.circle(x, y, Math.max(1, num(K.raio, num(S.raio, 16))), opc) : L.Bodies.rectangle(x, y, Math.max(1, num(K.w, num(S.w, 32))), Math.max(1, num(K.h, num(S.h, 32))), opc);
    if (K.rotacaoFixa) L.Body.setInertia(b, Infinity);
    return b;
  }
  C.Systems.matter = function (scene, dt, ctx) {
    const L = lib(), com = L ? scene.query('Transform', 'Corpo') : [];
    let st = scene._matter;
    if (!L || !com.length) { scene._matter = null; return; }
    if (!st) {
      const eng = L.Engine.create(); st = scene._matter = { eng, mapa: new Map(), ult: new Map(), juntas: new Map() };
      L.Events.on(eng, 'collisionStart', ev => { for (const p of ev.pairs) { const a = p.bodyA.plugin && p.bodyA.plugin.eid, b = p.bodyB.plugin && p.bodyB.plugin.eid; if (a !== undefined && b !== undefined) { ctx.events.emit('colisao', { para: a, outro: b }); ctx.events.emit('colisao', { para: b, outro: a }); } } });
    }
    const g = scene.estado.matter || {}; st.eng.gravity.x = num(g.gravidadeX, 0); st.eng.gravity.y = num(g.gravidadeY, 1);
    const vivos = new Set();
    for (const e of com) {
      vivos.add(e.id); let b = st.mapa.get(e.id), u = st.ult.get(e.id);
      if (!b) { b = criar(L, e); st.mapa.set(e.id, b); L.Composite.add(st.eng.world, b); st.ult.set(e.id, { x: e.Transform.x, y: e.Transform.y, r: num(e.Transform.rot, 0) }); continue; }
      if (Math.abs(e.Transform.x - u.x) > 1e-6 || Math.abs(e.Transform.y - u.y) > 1e-6) { L.Body.setPosition(b, { x: e.Transform.x, y: e.Transform.y }); L.Body.setVelocity(b, { x: 0, y: 0 }); }   // um script teletransportou o objeto
      if (Math.abs(num(e.Transform.rot, 0) - u.r) > 1e-6) { L.Body.setAngle(b, num(e.Transform.rot, 0)); L.Body.setAngularVelocity(b, 0); }
      if (b.isStatic !== (e.Corpo.tipo === 'estatico')) L.Body.setStatic(b, e.Corpo.tipo === 'estatico');
    }
    for (const [id, b] of [...st.mapa]) if (!vivos.has(id)) { L.Composite.remove(st.eng.world, b); st.mapa.delete(id); st.ult.delete(id); }
    // juntas (uma por objeto que tem o componente Junta)
    const donos = new Set();
    for (const e of scene.query('Junta', 'Corpo')) {
      donos.add(e.id); const J = e.Junta, alvo = scene.find(J.com), A = st.mapa.get(e.id), B = alvo && st.mapa.get(alvo.id), chave = st.juntas.get(e.id);
      if (!A || !B) { if (chave) { L.Composite.remove(st.eng.world, chave.c); st.juntas.delete(e.id); } continue; }
      const assin = [alvo.id, J.tipo, J.comprimento, J.rigidez, J.amortecimento, J.ax, J.ay, J.bx, J.by].join('|');
      if (chave && chave.assin === assin) continue;
      if (chave) L.Composite.remove(st.eng.world, chave.c);
      const mola = J.tipo === 'mola', c = L.Constraint.create({ bodyA: A, bodyB: B, pointA: { x: num(J.ax, 0), y: num(J.ay, 0) }, pointB: { x: num(J.bx, 0), y: num(J.by, 0) }, stiffness: num(J.rigidez, mola ? 0.05 : 1), damping: num(J.amortecimento, mola ? 0.05 : 0), length: J.comprimento === undefined ? (mola ? undefined : 0) : num(J.comprimento, 0) });
      L.Composite.add(st.eng.world, c); st.juntas.set(e.id, { c, assin });
    }
    for (const [id, ch] of [...st.juntas]) if (!donos.has(id)) { L.Composite.remove(st.eng.world, ch.c); st.juntas.delete(id); }
    L.Engine.update(st.eng, dt * 1000);
    for (const [id, b] of st.mapa) { const e = scene.get(id); if (!e) continue; e.Transform.x = b.position.x; e.Transform.y = b.position.y; if (!e.Corpo.rotacaoFixa) e.Transform.rot = b.angle; st.ult.set(id, { x: e.Transform.x, y: e.Transform.y, r: num(e.Transform.rot, 0) }); }
  };
  // API para scripts: ctx.matter
  C.MatterApi = {
    para(scene) {
      const corpo = e => { const st = scene._matter; return st && e && st.mapa.get(e.id); };
      return {
        forca(e, fx, fy) { const b = corpo(e); if (b) lib().Body.applyForce(b, b.position, { x: num(fx, 0) * 0.001, y: num(fy, 0) * 0.001 }); },
        velocidade(e, vx, vy) { const b = corpo(e); if (b) lib().Body.setVelocity(b, { x: num(vx, 0), y: num(vy, 0) }); },
        ler(e) { const b = corpo(e); return b ? { vx: b.velocity.x, vy: b.velocity.y, giro: b.angularVelocity } : null; }
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
