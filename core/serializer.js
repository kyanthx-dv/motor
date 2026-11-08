/* Core · Serializer
   Cena <-> JSON. O campo "formato" permite migrar saves antigos quando a estrutura mudar. */
(function (root) {
  const C = root.Core = root.Core || {};
  const S = C.Serializer = {
    FORMATO: 1,
    // migracoes[n] converte um save do formato n para n+1
    migracoes: {},
    paraJSON(scene) {
      const entidades = [];
      for (const e of scene.entities.values()) {
        const c = JSON.parse(JSON.stringify(e));
        if (c.Transform) { delete c.Transform.px; delete c.Transform.py; }   // px/py são só para interpolar o desenho
        entidades.push(c);
      }
      return { formato: S.FORMATO, estado: JSON.parse(JSON.stringify(scene.estado)), entidades };
    },
    deJSON(scene, dados) {
      if (!dados || typeof dados !== 'object' || !Array.isArray(dados.entidades)) throw new Error('save inválido');
      let d = JSON.parse(JSON.stringify(dados)), v = d.formato || 1;
      if (v > S.FORMATO) throw new Error('save de uma versão mais nova do núcleo');
      while (v < S.FORMATO) { const m = S.migracoes[v]; if (!m) throw new Error('sem migração do formato ' + v); d = m(d); v = d.formato; }
      scene.clear();
      scene.estado = d.estado || {};
      for (const e of d.entidades) scene.create(e);
      return scene;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
