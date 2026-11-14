/* Adaptador · Player. Roda um jogo exportado numa página sozinha (sem editor): Core.Player.iniciar({ nome, atual, cenas:{nome:cenaJSON}, versao }).
   Cria a tela cheia, renderer Canvas 2D, entrada (teclado/mouse/toque), áudio, dispositivo e armazenamento; mostra um botão "Jogar"
   (o navegador só libera áudio e tela cheia depois de um toque). Erros de script aparecem num aviso discreto e no console. */
(function (root) {
  const C = root.Core = root.Core || {};
  C.Player = {
    engine: null,
    async iniciar(jogo) {
      const doc = document, corpo = doc.body, cenaAtual = jogo.cenas[jogo.atual]; if (!cenaAtual) throw new Error('projeto sem cena inicial');
      const tela = doc.createElement('canvas'); tela.id = 'tela'; tela.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;background:#000;display:block';
      corpo.appendChild(tela);
      const assets = new C.Assets(), imagens = {}; for (const n in jogo.cenas) Object.assign(imagens, (jogo.cenas[n].estado || {}).imagens || {});
      await Promise.all(Object.entries(imagens).map(([n, src]) => new Promise(ok => { const i = new Image(); i.onload = () => { assets.registrar(n, i); ok(); }; i.onerror = ok; i.src = src; })));
      const t = (cenaAtual.estado && cenaAtual.estado.tamanho) || { largura: 800, altura: 450 };
      const renderer = new C.CanvasRenderer(tela, { largura: t.largura, altura: t.altura, fundo: '#000', assets });
      const engine = new C.Engine({ renderer }); this.engine = engine; if (C.Armazem) engine.armazem = C.Armazem.navegador('motor.jogo.' + String(jogo.nome || 'jogo').replace(/[^a-zA-Z0-9_-]/g, '_') + '.');
      C.Serializer.deJSON(engine.scene, JSON.parse(JSON.stringify(cenaAtual)));
      engine.cenas = {}; for (const n in jogo.cenas) engine.registrarCenaJSON(n, JSON.parse(JSON.stringify(jogo.cenas[n])));
      engine.input = new C.Input(tela, renderer); engine.dispositivo = C.Dispositivo || null; engine.audio = C.Audio ? new C.Audio() : null;
      const sons = Object.assign({}, ...Object.values(jogo.cenas).map(c => (c.estado || {}).sons || {}));
      if (engine.audio && Object.keys(sons).length) engine.audio.carregar(sons).catch(() => {});
      engine.events.on('erro-script', d => { try { console.warn('[jogo] erro de script', d); } catch (x) {} });
      const capa = doc.createElement('div'); capa.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;gap:18px;align-items:center;justify-content:center;background:#10161f;color:#fff;font:600 22px system-ui,sans-serif;z-index:10';
      const titulo = doc.createElement('div'); titulo.textContent = jogo.nome || 'Jogo'; const b = doc.createElement('button'); b.type = 'button'; b.textContent = '▶ Jogar';
      b.style.cssText = 'font:600 20px system-ui,sans-serif;padding:14px 36px;border-radius:12px;border:0;background:#4aa3ff;color:#04121f'; capa.append(titulo, b); corpo.appendChild(capa);
      b.addEventListener('click', () => {
        capa.remove(); if (C.Dispositivo && /android|ios/.test(C.Dispositivo.ler('plataforma'))) C.Dispositivo.telaCheia(true);
        engine.iniciar();
      });
      return engine;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
