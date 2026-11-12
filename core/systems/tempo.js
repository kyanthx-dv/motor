/* Sistema · tempo (opcional). ctx.depois(segundos, fn) e ctx.tween(alvo, campo, valor, duracao, curva).
   Tudo roda no relógio do jogo (dt fixo): pausar pausa os temporizadores. Reiniciar o jogo ou trocar de cena cancela tudo.
   Por quê: "esperar N segundos" e "mudar aos poucos" sem bloquear o loop e sem setTimeout (que não respeita pausa nem Play/Parar). */
(function (root) {
  const C = root.Core = root.Core || {};
  const CURVAS = { linear: t => t, entrada: t => t * t, saida: t => t * (2 - t), suave: t => t * t * (3 - 2 * t) };
  const MAX = 5000;
  C.Tempo = {
    CURVAS,
    instalar(eng) {
      eng.agenda = []; eng.tweens = [];
      eng.ctx.depois = (seg, fn) => {
        if (typeof seg !== 'number' || !isFinite(seg) || seg < 0) throw new RangeError('depois(segundos, fn): segundos precisa ser um número finito >= 0');
        if (typeof fn !== 'function') throw new TypeError('depois(segundos, fn): fn precisa ser uma função');
        if (eng.agenda.length >= MAX) throw new RangeError('depois: limite de ' + MAX + ' temporizadores ativos');
        eng.agenda.push({ resta: seg, fn });
      };
      eng.ctx.tween = (alvo, campo, valor, dur, curva, fim) => {
        if (!alvo || typeof alvo !== 'object') throw new TypeError('tween: alvo precisa ser um objeto');
        if (typeof alvo[campo] !== 'number') throw new TypeError('tween: "' + campo + '" precisa ser numérico no alvo');
        if (typeof valor !== 'number' || !isFinite(valor)) throw new RangeError('tween: valor precisa ser um número finito');
        if (typeof dur !== 'number' || !isFinite(dur) || dur < 0) throw new RangeError('tween: duração precisa ser um número finito >= 0');
        const f = CURVAS[curva || 'linear']; if (!f) throw new RangeError('tween: curva desconhecida "' + curva + '" (use ' + Object.keys(CURVAS).join(', ') + ')');
        eng.tweens = eng.tweens.filter(t => !(t.alvo === alvo && t.campo === campo));   // um tween novo no mesmo campo substitui o antigo
        if (dur === 0) { alvo[campo] = valor; if (fim) eng.agenda.push({ resta: 0, fn: fim }); return; }
        if (eng.tweens.length >= MAX) throw new RangeError('tween: limite de ' + MAX + ' animações ativas');
        eng.tweens.push({ alvo, campo, de: alvo[campo], para: valor, dur, t: 0, f, fim });
      };
    },
    limpar(eng) { if (eng.agenda) { eng.agenda.length = 0; eng.tweens.length = 0; } }
  };
  const seguro = (ctx, fn) => { try { fn(); } catch (x) { ctx.events.emit('erro-script', { entidade: null, script: '(esperar/tween)', fase: 'depois', mensagem: String(x && x.message || x) }); } };
  C.Systems = C.Systems || {};
  C.Systems.tempo = function (scene, dt, ctx) {
    const eng = ctx.engine; if (!eng.agenda) return;
    const prontos = []; eng.agenda = eng.agenda.filter(a => { a.resta -= dt; if (a.resta <= 1e-9) { prontos.push(a.fn); return false; } return true; });
    const acabou = [];
    for (const t of eng.tweens) { t.t = Math.min(t.dur, t.t + dt); const k = t.t / t.dur; t.alvo[t.campo] = t.de + (t.para - t.de) * (k >= 1 ? 1 : t.f(k)); if (k >= 1) acabou.push(t); }
    if (acabou.length) { eng.tweens = eng.tweens.filter(t => !acabou.includes(t)); for (const t of acabou) if (t.fim) prontos.push(t.fim); }
    for (const fn of prontos) seguro(ctx, fn);
  };
})(typeof window !== 'undefined' ? window : globalThis);
