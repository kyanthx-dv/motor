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
        d = m(d); if (!d || d.formato !== v + 1) throw new Error('migração do formato ' + v + ' não avançou exatamente para ' + (v + 1));   // exige v+1: pular versão deixaria uma migração sem rodar
        v = d.formato;
      }
      const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
      if (d.estado !== undefined && !isObj(d.estado)) throw new Error('save inválido: "estado" precisa ser um objeto');
      // Transacional: monta tudo numa cena temporária. Só se TUDO for válido troca a cena atual; save ruim nunca destrói o jogo.
      const cam = d.estado && d.estado.camera; if (cam !== undefined && (!isObj(cam) || (cam.zoom !== undefined && !(isFinite(cam.zoom) && cam.zoom > 0)))) throw new Error('save inválido: estado.camera (zoom precisa ser > 0)');
      const tmp = new C.Scene(); tmp.estado = d.estado || {};
      d.entidades.forEach((e, i) => {
        if (!isObj(e)) throw new Error('save inválido: entidade #' + i + ' não é um objeto');
        tmp.create(e);                                           // valida id (inteiro, único) e componentes
      });
      scene.entities = tmp.entities; scene.nextId = tmp.nextId; scene.estado = tmp.estado; scene._remover = new Set();
      return scene;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
