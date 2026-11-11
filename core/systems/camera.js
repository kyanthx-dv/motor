/* Sistema · camera
   Estado em scene.estado.camera = { x, y, zoom, seguir:'nome', suavizar, limites:{x0,y0,x1,y1} }.
   Sem esse objeto a câmera é fixa (o mundo inteiro na tela). Fica no estado da cena, então é salva junto. */
(function (root) {
  const C = root.Core = root.Core || {}; C.Systems = C.Systems || {};
  C.Systems.camera = function (scene, dt, ctx) {
    const c = scene.estado.camera; if (!c) return;
    c.px = c.x; c.py = c.y;                                               // posição anterior, para interpolar o desenho
    const alvo = c.seguir && scene.find(c.seguir);
    if (alvo && alvo.Transform) { const k = 1 - Math.exp(-(c.suavizar ?? 8) * dt); c.x += (alvo.Transform.x - c.x) * k; c.y += (alvo.Transform.y - c.y) * k; }
    const l = c.limites; if (!l || !(l.x1 > l.x0) || !(l.y1 > l.y0)) return;   // limites sem tamanho não valem
    const hw = ctx.tela.largura / (c.zoom || 1) / 2, hh = ctx.tela.altura / (c.zoom || 1) / 2;
    c.x = l.x1 - l.x0 <= hw * 2 ? (l.x0 + l.x1) / 2 : Math.max(l.x0 + hw, Math.min(l.x1 - hw, c.x));   // mundo menor que a tela: centraliza
    c.y = l.y1 - l.y0 <= hh * 2 ? (l.y0 + l.y1) / 2 : Math.max(l.y0 + hh, Math.min(l.y1 - hh, c.y));
  };
})(typeof window !== 'undefined' ? window : globalThis);
