/* Core · Serializer
   Cena <-> JSON. O campo "formato" permite migrar saves antigos quando a estrutura mudar. */
(function (root) {
  const C = root.Core = root.Core || {};
  const S = C.Serializer = {
    FORMATO: 1,
    // migracoes[n] converte um save do formato n para n+1
    migracoes: {},
    // Campos de runtime (só para interpolar o desenho) nunca vão para o save.
    paraJSON(scene) {
      const entidades = [];
      for (const e of scene.entities.values()) {
        const c = JSON.parse(JSON.stringify(e));
        if (c.Transform) { delete c.Transform.px; delete c.Transform.py; }
        entidades.push(c);
      }
      const estado = JSON.parse(JSON.stringify(scene.estado));
      if (estado.camera) { delete estado.camera.px; delete estado.camera.py; }
      return { formato: S.FORMATO, estado, entidades };
    },
    deJSON(scene, dados) {
      if (!dados || typeof dados !== 'object' || !Array.isArray(dados.entidades)) throw new Error('save inválido');
      let d = JSON.parse(JSON.stringify(dados)), v = d.formato === undefined ? 1 : d.formato;
      if (!Number.isInteger(v) || v < 1) throw new Error('formato de save inválido: ' + v);
      if (v > S.FORMATO) throw new Error('save de uma versão mais nova do núcleo');
      for (let guarda = 0; v < S.FORMATO; guarda++) {          // cada migração precisa AVANÇAR o formato; senão erro (nunca laço infinito)
        const m = S.migracoes[v]; if (!m || guarda > 100) throw new Error('sem migração do formato ' + v);
        d = m(d); if (!d || !Number.isInteger(d.formato) || d.formato <= v) throw new Error('migração do formato ' + v + ' não avançou o formato');
        v = d.formato;
      }
      const ids = d.entidades.map(e => e && e.id).filter(id => id != null);     // valida ANTES de limpar a cena: save ruim não destrói o jogo atual
      if (new Set(ids).size !== ids.length) throw new Error('save com ids de entidade duplicados');
      scene.clear();
      scene.estado = d.estado || {};
      for (const e of d.entidades) scene.create(e);
      return scene;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
