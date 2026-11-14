/* Adaptador · PixiRenderer (WebGL via PixiJS). Desenha o MUNDO do jogo numa tela WebGL por cima da tela 2D;
   a tela 2D continua dona de entrada, HUD (joystick, depuração) e das fórmulas de câmera (herda de CanvasRenderer).
   Uso: const r = await Core.PixiRenderer.criar(canvas2d, opcoes)  → null se WebGL/Pixi não estiver disponível.
   Só para jogar (o editor usa Canvas 2D por causa das guias). Limitação: sem sombra de botão e sem espelhar formas. */
(function (root) {
  const C = root.Core = root.Core || {};
  const cor = (P, v, pad) => { try { const c = new P.Color(v || pad); return { color: c.toNumber(), alpha: c.alpha }; } catch (x) { return { color: 0xcccccc, alpha: 1 }; } };
  class PixiRenderer extends C.CanvasRenderer {
    static carregarBiblioteca(url) {
      if (root.PIXI) return Promise.resolve(root.PIXI);
      return new Promise((ok, erro) => { const s = document.createElement('script'); s.src = url; s.onload = () => root.PIXI ? ok(root.PIXI) : erro(new Error('PixiJS não carregou')); s.onerror = () => erro(new Error('não achei ' + url)); document.head.appendChild(s); });
    }
    static async criar(canvas, op = {}) {
      try {
        const P = await PixiRenderer.carregarBiblioteca(op.pixiUrl || '../adapters/vendor/pixi.min.js');
        const gl = document.createElement('canvas'); gl.className = 'tela-gl'; gl.setAttribute('aria-hidden', 'true');
        gl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:none';
        canvas.parentElement.insertBefore(gl, canvas.nextSibling);
        const app = new P.Application();
        await app.init({ canvas: gl, width: 300, height: 150, resolution: 1, autoDensity: false, backgroundAlpha: 0, antialias: true, preference: 'webgl', autoStart: false });
        if (!app.renderer || app.renderer.name !== 'webgl') { app.destroy(false); gl.remove(); return null; }
        return new PixiRenderer(canvas, op, P, app, gl);
      } catch (x) { PixiRenderer.ultimoErro = x; return null; }
    }
    constructor(canvas, op, P, app, gl) {
      super(canvas, op); this.P = P; this.app = app; this.gl = gl; this.mundoExterno = (sc, al, z, cx, cy) => this._mundo(sc, al, z, cx, cy);
      this.itens = new Map(); this.texs = new Map(); this.textos = new Map(); this.camadaTiles = new Map();
      const st = app.stage; this.fundoG = new P.Graphics(); this.mundo = new P.Container(); this.mundo.sortableChildren = true; this.ui = new P.Container(); this.ui.sortableChildren = true; this.mascara = new P.Graphics();
      this.raiz = new P.Container(); this.fadeG = new P.Graphics(); this.raiz.addChild(this.fundoG, this.mundo, this.fadeG, this.ui, this.mascara); this.raiz.mask = this.mascara; st.addChild(this.raiz);
      this.redimensionar();
    }
    ligar(sim) { this.gl.style.display = sim ? 'block' : 'none'; this.gl.style.zIndex = '0'; this.canvas.style.position = sim ? 'relative' : ''; this.canvas.style.zIndex = sim ? '1' : ''; }   // a tela 2D (HUD, fade) fica POR CIMA do WebGL
    destruir() { super.destruir(); try { this.app.destroy(false, { children: true }); } catch (x) {} this.gl.remove(); }
    redimensionar() {
      super.redimensionar(); if (!this.app) return;
      const r = this.canvas.getBoundingClientRect(); this.app.renderer.resolution = this.dpr; this.app.renderer.resize(Math.max(1, r.width), Math.max(1, r.height));
      this.gl.width = this.canvas.width; this.gl.height = this.canvas.height;
    }
    _tex(nome, col, lin, fw, fh) {
      const k = nome + '|' + col + '|' + lin + '|' + fw + '|' + fh, P = this.P; let t = this.texs.get(k); if (t) return t;
      const img = this.assets && this.assets.get(nome); if (!img) return null;
      let base = this.texs.get('base|' + nome); if (!base) { base = P.Texture.from(img); this.texs.set('base|' + nome, base); }
      t = new P.Texture({ source: base.source, frame: new P.Rectangle(Math.min(col * fw, Math.max(0, img.width - 1)), Math.min(lin * fh, Math.max(0, img.height - 1)), Math.max(1, Math.min(fw, img.width - col * fw)), Math.max(1, Math.min(fh, img.height - lin * fh))) });
      this.texs.set(k, t); return t;
    }
    _item(id, pai) { let it = this.itens.get(id); if (!it) { it = { c: new this.P.Container(), g: null, sp: null, tx: null, chave: '', pai: null }; this.itens.set(id, it); } if (it.pai !== pai) { pai.addChild(it.c); it.pai = pai; } return it; }
    _forma(it, s, b, e) {
      const P = this.P, f = s.forma || b.forma || (s.raio || b.raio ? 'circulo' : 'retangulo'), raio = s.raio ?? b.raio ?? 10, w = s.w ?? b.w ?? 20, h = s.h ?? b.h ?? 20, B = e.Botao;
      const fill = (B && B.apertado && (s.corApertado || s.corSobre)) || (B && B.sobre && s.corSobre) || s.cor || '#ccc';
      const pg = f === 'poligono' ? (s.pontos || b.pontos || []) : null;
      const ch = [f, raio, w, h, fill, s.borda, s.larguraBorda, s.arredondar, pg && pg.join()].join('|');
      if (ch === it.chave) return; it.chave = ch;
      if (!it.g) { it.g = new P.Graphics(); it.c.addChildAt(it.g, 0); } const g = it.g; g.clear();
      if (f === 'circulo' || f === 'anel') g.circle(0, 0, raio); else if (pg) g.poly(pg.flat()); else if (s.arredondar > 0) g.roundRect(-w / 2, -h / 2, w, h, Math.min(s.arredondar, w / 2, h / 2)); else g.rect(-w / 2, -h / 2, w, h);
      const lw = s.larguraBorda || 2;
      if (f === 'anel') g.stroke({ width: lw, ...cor(P, s.cor, '#fff') });
      else { g.fill(cor(P, fill, '#ccc')); if (s.borda) g.stroke({ width: lw, ...cor(P, s.borda, '#fff') }); }
    }
    _texto(it, s, w) {
      const P = this.P; if (!s.rotulo) { if (it.tx) it.tx.visible = false; return; }
      const ch = [s.rotulo, s.corTexto, s.tamanhoTexto, s.fonte, s.alinhar].join('|');
      if (!it.tx) { it.tx = new P.Text({ text: '' }); it.tx.anchor.set(0.5); it.c.addChild(it.tx); it.txChave = ''; }
      if (ch !== it.txChave) { it.txChave = ch; it.tx.text = String(s.rotulo); it.tx.style = { fill: s.corTexto || '#fff', fontSize: s.tamanhoTexto || 14, fontWeight: '600', fontFamily: s.fonte || 'system-ui, sans-serif' }; }
      it.tx.visible = true; const al = s.alinhar; it.tx.anchor.x = al === 'left' ? 0 : al === 'right' ? 1 : 0.5; it.tx.x = al === 'left' ? -w / 2 + 8 : al === 'right' ? w / 2 - 8 : 0;
    }
    _tiles(sc, vistos) {
      const P = this.P;
      for (const e of sc.query('Transform', 'Tiles')) {
        const T = e.Tiles, t = e.Transform, id = 't' + e.id; vistos.add(id);
        let it = this.camadaTiles.get(id); if (!it) { it = { c: new P.Container(), chave: '' }; this.camadaTiles.set(id, it); }
        const alvo = this.mundo; if (it.c.parent !== alvo) alvo.addChild(it.c);
        it.c.zIndex = T.acima ? 1e9 : -1e9; it.c.position.set(t.x, t.y);
        const ch = T.tamanho + '|' + T.colunas + '|' + T.dados.join('') + '|' + JSON.stringify(T.paleta);
        if (ch === it.chave) continue; it.chave = ch; it.c.removeChildren().forEach(x => x.destroy());
        const g = new P.Graphics(), S = T.tamanho; it.c.addChild(g);
        for (let i = 0; i < T.dados.length; i++) {
          const k = T.dados[i]; if (!k) continue; const pal = T.paleta[k - 1], c = i % T.colunas, r = Math.floor(i / T.colunas), tex = pal.imagem && this._tex(pal.imagem, 0, 0, 1e6, 1e6);
          if (tex) { const sp = new P.Sprite(tex); sp.x = c * S; sp.y = r * S; sp.width = S; sp.height = S; it.c.addChild(sp); }
          else g.rect(c * S, r * S, S + .5, S + .5).fill(cor(P, pal.cor, '#888'));
        }
      }
    }
    _mundo(sc, alpha, z, cx, cy) {
      const P = this.P, L = this.largura, A = this.altura, esc = this.esc, ox = this.ox, oy = this.oy, vistos = new Set();
      this.fundoG.clear().rect(ox, oy, L * esc, A * esc).fill(cor(P, sc.estado.fundo || this.fundo, '#2f7d4f'));
      this.mascara.clear().rect(ox, oy, L * esc, A * esc).fill(0xffffff);
      const FD = sc.efeitos && sc.efeitos.fade; this.fadeG.clear(); if (FD && FD.alpha > 0.001) { const c = cor(P, FD.cor, '#000'); this.fadeG.rect(ox, oy, L * esc, A * esc).fill({ color: c.color, alpha: Math.min(1, FD.alpha) }); }   // fade fica abaixo da interface
      this.mundo.scale.set(esc * z); this.mundo.position.set(ox + esc * (L / 2 - cx * z), oy + esc * (A / 2 - cy * z));
      this.ui.scale.set(esc); this.ui.position.set(ox, oy);
      this._tiles(sc, vistos);
      const lista = sc.query('Transform', 'Sprite').sort((a, b) => (a.Sprite.camada || 0) - (b.Sprite.camada || 0) || (a.Sprite.ordenarY ? a.Transform.y : 0) - (b.Sprite.ordenarY ? b.Transform.y : 0) || a.id - b.id);
      lista.forEach((e, rank) => {
        const s = e.Sprite, t = e.Transform, b = e.Body || {}, id = 's' + e.id; vistos.add(id);
        const it = this._item(id, s.fixo ? this.ui : this.mundo); it.c.zIndex = rank; it.c.visible = !s.invisivel; it.c.alpha = s.opacidade === undefined ? 1 : Math.max(0, Math.min(1, s.opacidade)); if (s.invisivel) return;
        it.c.position.set(t.px === undefined ? t.x : t.px + (t.x - t.px) * alpha, t.py === undefined ? t.y : t.py + (t.y - t.py) * alpha); it.c.rotation = t.rot || 0;
        const img = s.imagem && this.assets && this.assets.get(s.imagem);
        if (img) {
          const fw = s.quadroW || img.width, fh = s.quadroH || img.height, k = s.escala || 1, a = e.Animacao || {}, tex = this._tex(s.imagem, a.quadro || 0, a.linha || 0, fw, fh);
          if (it.g) it.g.visible = false; if (!tex) return;
          tex.source.scaleMode = s.suavizar ? 'linear' : 'nearest';
          if (!it.sp) { it.sp = new P.Sprite(tex); it.sp.anchor.set(0.5); it.c.addChildAt(it.sp, 0); } it.sp.visible = true; it.sp.texture = tex;
          it.sp.scale.set((s.espelhar ? -1 : 1) * k, k); it.sp.position.set(s.offX || 0, s.offY || 0); this._texto(it, s, fw * k); return;
        }
        if (it.sp) it.sp.visible = false; if (it.g) it.g.visible = true;
        this._forma(it, s, b, e); this._texto(it, s, s.w ?? b.w ?? 20);
      });
      for (const [id, it] of this.itens) if (!vistos.has(id) && !lista.some(e => 's' + e.id === id)) { it.c.destroy({ children: true }); this.itens.delete(id); }
      for (const [id, it] of this.camadaTiles) if (!vistos.has(id)) { it.c.destroy({ children: true }); this.camadaTiles.delete(id); }
      this.app.renderer.render(this.app.stage);
    }
  }
  C.PixiRenderer = PixiRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
