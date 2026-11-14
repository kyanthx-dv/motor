/* Adaptador · Dispositivo e sistema. O núcleo não conhece aparelho nem relógio: quem o liga é o host (engine.dispositivo = Core.Dispositivo).
   Scripts: ctx.dispositivo.ler('hora'|'minuto'|'segundo'|'dia'|'mes'|'ano'|'diaSemana'|'plataforma'|'tipo'|'toque'|'idioma'|'online'|'largura'|'altura'|'orientacao'|'escuro'|'nucleos')
   e ações: vibrar(ms), telaCheia(sim), info() (tudo de uma vez). Fora de um navegador (Node/testes) tudo devolve valores neutros e as ações não fazem nada. */
(function (root) {
  const C = root.Core = root.Core || {};
  const nav = typeof navigator !== 'undefined' ? navigator : {}, win = typeof window !== 'undefined' ? window : null, doc = typeof document !== 'undefined' ? document : null;
  const plataforma = () => { const u = (nav.userAgent || '') + ' ' + (nav.platform || ''); return /android/i.test(u) ? 'android' : /iphone|ipad|ipod/i.test(u) || (/mac/i.test(u) && nav.maxTouchPoints > 1) ? 'ios' : /win/i.test(u) ? 'windows' : /mac/i.test(u) ? 'mac' : /linux|x11|cros/i.test(u) ? 'linux' : 'outro'; };
  const toque = () => !!(nav.maxTouchPoints > 0 || (win && 'ontouchstart' in win));
  const tipo = () => { const p = plataforma(), t = toque(), menor = win ? Math.min(win.screen.width, win.screen.height) : 1000; return (p === 'android' || p === 'ios') && t ? (menor >= 600 ? 'tablet' : 'celular') : t && menor < 700 ? 'celular' : 'computador'; };
  const media = q => !!(win && win.matchMedia && win.matchMedia(q).matches);
  const CAMPOS = {
    hora: () => new Date().getHours(), minuto: () => new Date().getMinutes(), segundo: () => new Date().getSeconds(),
    dia: () => new Date().getDate(), mes: () => new Date().getMonth() + 1, ano: () => new Date().getFullYear(), diaSemana: () => new Date().getDay(),   // 0 = domingo
    plataforma, tipo, toque, idioma: () => String(nav.language || 'pt').slice(0, 10), online: () => nav.onLine !== false,
    largura: () => win ? win.innerWidth : 0, altura: () => win ? win.innerHeight : 0, orientacao: () => win && win.innerHeight > win.innerWidth ? 'retrato' : 'paisagem',
    escuro: () => media('(prefers-color-scheme: dark)'), nucleos: () => nav.hardwareConcurrency || 1
  };
  C.Dispositivo = {
    campos: Object.keys(CAMPOS),
    ler(campo) { const f = CAMPOS[campo]; return f ? f() : null; },
    info() { const o = {}; for (const k in CAMPOS) o[k] = CAMPOS[k](); return o; },
    vibrar(ms) { const n = Number(ms); if (nav.vibrate && Number.isFinite(n) && n > 0) { try { nav.vibrate(Math.min(n, 2000)); return true; } catch (x) {} } return false; },
    telaCheia(sim) {
      if (!doc) return false;
      try { if (sim && doc.documentElement.requestFullscreen && !doc.fullscreenElement) { doc.documentElement.requestFullscreen().catch(() => {}); return true; } if (!sim && doc.fullscreenElement && doc.exitFullscreen) { doc.exitFullscreen().catch(() => {}); return true; } } catch (x) {}
      return false;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
