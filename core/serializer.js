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
      const vs = d.estado && d.estado.vars;
      if (vs !== undefined) {
        if (!isObj(vs)) throw new Error('save inválido: estado.vars precisa ser um objeto');
        for (const k in vs) if (!C.Variaveis.NOME.test(k) || !C.Variaveis.tipoDe(vs[k])) throw new Error('save inválido: variável "' + k + '" com nome ou valor inválido');
      }
      const sc = d.estado && d.estado.scripts;
      if (sc !== undefined) {
        if (!isObj(sc)) throw new Error('save inválido: estado.scripts precisa ser um objeto');
        for (const k in sc) if (!C.Variaveis.NOME.test(k) || !isObj(sc[k]) || typeof sc[k].fonte !== 'string' || sc[k].fonte.length > 50000 || (sc[k].blocos !== undefined && (!Array.isArray(sc[k].blocos) || JSON.stringify(sc[k].blocos).length > 200000))) throw new Error('save inválido: script "' + k + '" (nome inválido ou fonte ausente/grande demais)');
      }
      const tam = d.estado && d.estado.tamanho; if (tam !== undefined && (!isObj(tam) || !(tam.largura >= 100 && tam.largura <= 10000) || !(tam.altura >= 100 && tam.altura <= 10000))) throw new Error('save inválido: estado.tamanho precisa de largura e altura entre 100 e 10000');
      const ls = d.estado && d.estado.listas;
      if (ls !== undefined) {
        if (!isObj(ls) || Object.keys(ls).length > 50) throw new Error('save inválido: estado.listas precisa ser um objeto com até 50 listas');
        for (const [n, arr] of Object.entries(ls)) {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) throw new Error('save inválido: nome de lista "' + n.slice(0, 30) + '"');
          if (!Array.isArray(arr) || arr.length > 1000 || !arr.every(C.Listas ? C.Listas.itemOk : (v => typeof v !== 'object'))) throw new Error('save inválido: lista "' + n + '" (até 1000 itens: número, texto ou verdadeiro/falso)');
        }
      }
      const ims = d.estado && d.estado.imagens;
      if (ims !== undefined) {
        if (!isObj(ims) || Object.keys(ims).length > 30) throw new Error('save inválido: estado.imagens precisa ser um objeto com até 30 imagens');
        for (const [n, v] of Object.entries(ims)) if (n.length < 1 || n.length > 40 || typeof v !== 'string' || !/^data:image\/(png|jpeg|webp|gif);base64,/.test(v) || v.length > 600000) throw new Error('save inválido: imagem "' + n.slice(0, 40) + '" inválida ou grande demais');
      }
      const sns = d.estado && d.estado.sons;
      if (sns !== undefined) {
        if (!isObj(sns) || Object.keys(sns).length > 10) throw new Error('save inválido: estado.sons precisa ser um objeto com até 10 sons');
        for (const [n, v] of Object.entries(sns)) if (n.length < 1 || n.length > 40 || typeof v !== 'string' || !/^data:audio\/(mpeg|mp3|ogg|wav|x-wav|webm|mp4|aac);base64,/.test(v) || v.length > 700000) throw new Error('save inválido: som "' + n.slice(0, 40) + '" inválido ou grande demais');
      }
      const jc = d.estado && d.estado.joystick;
      if (jc !== undefined) {
        if (!isObj(jc) || (jc.modo !== undefined && !['flutuante', 'fixo', 'desligado'].includes(jc.modo)) || (jc.zona !== undefined && !['tela', 'esquerda', 'direita'].includes(jc.zona)) || (jc.visivel !== undefined && typeof jc.visivel !== 'boolean')) throw new Error('save inválido: estado.joystick (modo flutuante/fixo/desligado, zona tela/esquerda/direita, visivel verdadeiro/falso)');
        for (const [k, a, b] of [['x', 0, 1], ['y', 0, 1], ['raio', 20, 200], ['zonaMorta', 0, 0.9]]) if (jc[k] !== undefined && !(Number.isFinite(jc[k]) && jc[k] >= a && jc[k] <= b)) throw new Error('save inválido: estado.joystick.' + k + ' fora de ' + a + '–' + b);
      }
      const cam = d.estado && d.estado.camera; if (cam !== undefined && (!isObj(cam) || (cam.zoom !== undefined && !(isFinite(cam.zoom) && cam.zoom > 0)))) throw new Error('save inválido: estado.camera (zoom precisa ser > 0)');
      const tmp = new C.Scene(); tmp.estado = d.estado || {};
      d.entidades.forEach((e, i) => {
        if (!isObj(e)) throw new Error('save inválido: entidade #' + i + ' não é um objeto');
        tmp.create(e);                                           // valida id (inteiro, único) e componentes
      });
      for (const e of tmp.entities.values()) if (e.Pai) {   // referências de pai: existem e não formam ciclo
        if (!tmp.entities.has(e.Pai.id)) throw new Error('save inválido: entidade "' + (e.nome || e.id) + '" tem um pai que não existe (id ' + e.Pai.id + ')');
        if (tmp.descendeDe(tmp.entities.get(e.Pai.id), e)) throw new Error('save inválido: ciclo de pais em "' + (e.nome || e.id) + '"');
      }
      scene.entities = tmp.entities; scene.nextId = tmp.nextId; scene.estado = tmp.estado; scene._remover = new Set();
      return scene;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
