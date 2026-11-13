/* Adaptador · CanvasRenderer
   Desenha a cena num <canvas> 2D. Só LÊ a cena. O mundo tem uma "janela" lógica fixa (largura x altura) encaixada
   na tela com faixas laterais. Com scene.estado.camera, a janela passeia pelo mundo (zoom e seguir entidade).
   Sprite: { cor, borda, forma, raio, w, h, camada, ordenarY, rotulo,
             imagem, quadroW, quadroH, escala, offX, offY, espelhar, suavizar }  (imagem usa Animacao se existir) */
(function (root) {
  const C = root.Core = root.Core || {};
  class CanvasRenderer {
    // Caixa aproximada de uma entidade (usada pelo depurador para clicar e destacar). Prefere a imagem do Sprite, depois o Body.
    static limitesDe(e) {
      const b = e.Body, s = e.Sprite || {};
      if (e.Tiles && !e.Sprite && !e.Body) { const T = e.Tiles; return { hw: T.colunas * T.tamanho / 2, hh: T.linhas * T.tamanho / 2, ox: T.colunas * T.tamanho / 2, oy: T.linhas * T.tamanho / 2 }; }
      if (s.imagem) { const k = s.escala || 1; return { hw: (s.quadroW || 32) * k / 2, hh: (s.quadroH || 32) * k / 2, ox: s.offX || 0, oy: s.offY || 0 }; }
      if (b) { const c = b.forma === 'circulo' || (!b.forma && b.raio !== undefined); return c ? { hw: b.raio, hh: b.raio, ox: 0, oy: 0 } : { hw: b.w / 2, hh: b.h / 2, ox: 0, oy: 0 }; }
      const f = s.forma || (s.raio ? 'circulo' : 'retangulo');
      return f === 'retangulo' ? { hw: (s.w ?? 20) / 2, hh: (s.h ?? 20) / 2, ox: 0, oy: 0 } : { hw: s.raio ?? 10, hh: s.raio ?? 10, ox: 0, oy: 0 };
    }
    constructor(canvas, op = {}) {
      this.canvas = canvas; this.g = canvas.getContext('2d'); this.assets = op.assets || null;
      this.largura = op.largura || 800; this.altura = op.altura || 450; this.fundo = op.fundo || '#2f7d4f';
      this.debug = false; this.dpr = 1; this.esc = 1; this.ox = 0; this.oy = 0; this.cam = { cx: this.largura / 2, cy: this.altura / 2, z: 1 };
      this.redimensionar();
      this._aoRedimensionar = () => this.redimensionar();
      if (typeof ResizeObserver !== 'undefined') { this._ro = new ResizeObserver(this._aoRedimensionar); this._ro.observe(canvas); }
      else window.addEventListener('resize', this._aoRedimensionar);
    }
    destruir() { if (this._ro) this._ro.disconnect(); else window.removeEventListener('resize', this._aoRedimensionar); }
    redimensionar() {
      const r = this.canvas.getBoundingClientRect(); this.dpr = Math.min(window.devicePixelRatio || 1, 3);
      this.canvas.width = Math.max(1, Math.round(r.width * this.dpr)); this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
      this.esc = Math.min(r.width / this.largura, r.height / this.altura) || 1;
      this.ox = (r.width - this.largura * this.esc) / 2; this.oy = (r.height - this.altura * this.esc) / 2;
    }
    _guias(g, scene, L, A, W, H, d) {
      const k = this.esc, ox = this.ox, oy = this.oy;
      g.lineWidth = 1 / k;
      if (this.grade) {
        let passo = 10; for (const p of [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]) { passo = p; if (p * k >= 36) break; }
        const x0 = Math.floor((-ox / k) / passo) * passo, x1 = (W - ox) / k, y0 = Math.floor((-oy / k) / passo) * passo, y1 = (H - oy) / k;
        g.strokeStyle = 'rgba(255,255,255,.10)'; g.beginPath();
        for (let x = x0; x <= x1; x += passo) { g.moveTo(x, y0); g.lineTo(x, y1); }
        for (let y = y0; y <= y1; y += passo) { g.moveTo(x0, y); g.lineTo(x1, y); }
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(0, y0); g.lineTo(0, y1); g.moveTo(x0, 0); g.lineTo(x1, 0); g.stroke();
        g.save(); g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = 'rgba(230,236,245,.75)'; g.font = '10px ui-monospace,monospace'; g.textBaseline = 'top';
        g.textAlign = 'left'; for (let x = x0; x <= x1; x += passo) g.fillText(String(x), ox + x * k + 3, 3);
        for (let y = y0; y <= y1; y += passo) g.fillText(String(y), 3, oy + y * k + 3);
        g.restore();
      }
      g.strokeStyle = '#6ea8ff'; g.lineWidth = 2 / k; g.strokeRect(0, 0, L, A);
      const cam = scene.estado.camera;
      if (cam) {
        const z = cam.zoom || 1, w = L / z, h = A / z; g.strokeStyle = '#37d6c4'; g.setLineDash([8 / k, 5 / k]); g.strokeRect(cam.x - w / 2, cam.y - h / 2, w, h); g.setLineDash([]);
        g.save(); g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = '#37d6c4'; g.font = '11px system-ui'; g.textBaseline = 'bottom'; g.fillText('câmera do jogo', ox + (cam.x - w / 2) * k + 4, oy + (cam.y - h / 2) * k - 3); g.restore();
      }
    }
    // tela (px CSS no canvas) -> mundo, já considerando a câmera
    telaParaMundo(x, y) {
      const c = this.cam, lx = (x - this.ox) / this.esc, ly = (y - this.oy) / this.esc;
      return { x: (lx - this.largura / 2) / c.z + c.cx, y: (ly - this.altura / 2) / c.z + c.cy };
    }
    // tela -> coordenadas da janela do jogo (sem câmera), para interface
    telaParaJanela(x, y) { return { x: (x - this.ox) / this.esc, y: (y - this.oy) / this.esc }; }
    // Vista do editor (só com o motor parado): a cena aparece como um retângulo num espaço maior, com pan e zoom.
    ajustarVista() { const r = this.canvas.getBoundingClientRect(), m = 60; this.vista = { cx: this.largura / 2, cy: this.altura / 2, z: Math.max(0.05, Math.min((r.width - m) / this.largura, (r.height - m) / this.altura)) }; }
    desenhar(scene, alpha, eng) {
      const tm = scene.estado.tamanho;
      if (tm && tm.largura > 0 && tm.altura > 0 && (tm.largura !== this.largura || tm.altura !== this.altura)) { this.largura = tm.largura; this.altura = tm.altura; this.redimensionar(); if (this.vista) this.ajustarVista(); }
      const V = this.vista, g = this.g, d = this.dpr, L = this.largura, A = this.altura;
      const W = this.canvas.width / d, H = this.canvas.height / d;
      if (V) { this.esc = V.z; this.ox = W / 2 - V.cx * V.z; this.oy = H / 2 - V.cy * V.z; }
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (V) { g.fillStyle = '#0e1319'; g.fillRect(0, 0, this.canvas.width, this.canvas.height); }
      g.setTransform(d * this.esc, 0, 0, d * this.esc, d * this.ox, d * this.oy);
      g.fillStyle = scene.estado.fundo || this.fundo; g.fillRect(0, 0, L, A);
      g.save(); if (!V) { g.beginPath(); g.rect(0, 0, L, A); g.clip(); }
      // câmera: interpola entre o passo anterior e o atual
      const cam = scene.estado.camera; let z = 1, cx = L / 2, cy = A / 2;
      if (cam) { z = cam.zoom || 1; cx = cam.px === undefined ? cam.x : cam.px + (cam.x - cam.px) * alpha; cy = cam.py === undefined ? cam.y : cam.py + (cam.y - cam.py) * alpha; }
      if (V) { z = 1; cx = L / 2; cy = A / 2; }
      this.cam = { cx, cy, z };
      g.setTransform(d * this.esc * z, 0, 0, d * this.esc * z, d * (this.ox + this.esc * (L / 2 - cx * z)), d * (this.oy + this.esc * (A / 2 - cy * z)));
      const meioW = V ? W / V.z / 2 + Math.abs(this.ox / V.z) + L : L / z / 2, meioH = V ? 1e9 : A / z / 2;
      const ord = (a, b) => (a.Sprite.camada || 0) - (b.Sprite.camada || 0) || (a.Sprite.ordenarY ? a.Transform.y : 0) - (b.Sprite.ordenarY ? b.Transform.y : 0) || a.id - b.id;
      const todos = scene.query('Transform', 'Sprite').sort(ord);
      const pintar = (e, cx, cy, meioW, meioH) => {
        const s = e.Sprite; if (s.invisivel) return;
        const t = e.Transform, b = e.Body || {};
        const x = t.px === undefined ? t.x : t.px + (t.x - t.px) * alpha, y = t.py === undefined ? t.y : t.py + (t.y - t.py) * alpha;
        const img = s.imagem && this.assets && this.assets.get(s.imagem);
        if (img) {
          const fw = s.quadroW || img.width, fh = s.quadroH || img.height, k = s.escala || 1, a = e.Animacao || {};
          if (Math.abs(x - cx) - fw * k / 2 > meioW || Math.abs(y - cy) - fh * k / 2 > meioH) return;          // fora da tela: não desenha
          g.save(); g.translate(x, y); if (s.espelhar) g.scale(-1, 1); if (t.rot) g.rotate(t.rot);
          g.imageSmoothingEnabled = !!s.suavizar;
          g.drawImage(img, (a.quadro || 0) * fw, (a.linha || 0) * fh, fw, fh, -fw * k / 2 + (s.offX || 0), -fh * k / 2 + (s.offY || 0), fw * k, fh * k);
          g.restore(); return;
        }
        const f = s.forma || b.forma || (s.raio || b.raio ? 'circulo' : 'retangulo');
        const raio = s.raio ?? b.raio ?? 10, w = s.w ?? b.w ?? 20, h = s.h ?? b.h ?? 20;
        const hx = f === 'retangulo' ? w / 2 : raio, hy = f === 'retangulo' ? h / 2 : raio;
        if (Math.abs(x - cx) - hx > meioW || Math.abs(y - cy) - hy > meioH) return;
        g.lineWidth = s.larguraBorda || 2; g.beginPath();
        if (f === 'circulo' || f === 'anel') g.arc(x, y, raio, 0, Math.PI * 2); else g.rect(x - w / 2, y - h / 2, w, h);
        if (f === 'anel') { g.strokeStyle = s.cor || '#fff'; g.stroke(); }
        else { g.fillStyle = (e.Botao && e.Botao.sobre && s.corSobre) || s.cor || '#ccc'; g.fill(); if (s.borda) { g.strokeStyle = s.borda; g.stroke(); } }
        if (s.rotulo) { g.fillStyle = s.corTexto || '#fff'; g.font = '600 ' + (s.tamanhoTexto || 14) + 'px ' + (s.fonte || 'system-ui,sans-serif'); g.textAlign = s.alinhar || 'center'; g.textBaseline = 'middle'; const tx = s.alinhar === 'left' ? x - w / 2 + 8 : s.alinhar === 'right' ? x + w / 2 - 8 : x; g.fillText(s.rotulo, tx, y); }
      };
      const vx0 = V ? -this.ox / V.z : cx - L / z / 2, vx1 = V ? (W - this.ox) / V.z : cx + L / z / 2, vy0 = V ? -this.oy / V.z : cy - A / z / 2, vy1 = V ? (H - this.oy) / V.z : cy + A / z / 2;
      const mapas = acima => { for (const e of scene.query('Transform', 'Tiles')) { if (!!e.Tiles.acima !== acima) continue; const T = e.Tiles, S = T.tamanho, t = e.Transform;
        const c0 = Math.max(0, Math.floor((vx0 - t.x) / S)), c1 = Math.min(T.colunas - 1, Math.floor((vx1 - t.x) / S)), r0 = Math.max(0, Math.floor((vy0 - t.y) / S)), r1 = Math.min(T.linhas - 1, Math.floor((vy1 - t.y) / S));
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const k = T.dados[r * T.colunas + c]; if (!k) continue; const p = T.paleta[k - 1], img = p.imagem && this.assets && this.assets.get(p.imagem);
          if (img) { g.imageSmoothingEnabled = false; g.drawImage(img, t.x + c * S, t.y + r * S, S, S); } else { g.fillStyle = p.cor; g.fillRect(t.x + c * S, t.y + r * S, S + .5, S + .5); } } } };
      mapas(false);
      for (const e of todos) if (V || !e.Sprite.fixo) pintar(e, cx, cy, V ? 1e9 : L / z / 2, V ? 1e9 : A / z / 2);
      mapas(true);
      if (this.selecionada != null) {
        const e = scene.get(this.selecionada);
        if (e && e.Transform) {
          const l = CanvasRenderer.limitesDe(e); g.strokeStyle = '#ffd400'; g.lineWidth = 2.5 / z; g.setLineDash([6 / z, 4 / z]);
          g.strokeRect(e.Transform.x + l.ox - l.hw, e.Transform.y + l.oy - l.hh, l.hw * 2, l.hh * 2); g.setLineDash([]);
        }
      }
      if (this.debug) {
        g.strokeStyle = '#ff3b6b'; g.lineWidth = 1.5 / z;
        for (const e of scene.query('Transform', 'Body')) {
          const t = e.Transform, b = e.Body; g.setLineDash(b.sensor ? [5, 4] : []); g.beginPath();
          if (b.forma === 'circulo' || (!b.forma && b.raio)) g.arc(t.x, t.y, b.raio, 0, Math.PI * 2); else g.rect(t.x - b.w / 2, t.y - b.h / 2, b.w, b.h);
          g.stroke();
        }
        g.setLineDash([]);
      }
      if (V) this._guias(g, scene, L, A, W, H, d);
      g.restore();
      if (V) return;
      // interface: sprites com fixo:true ficam na janela, sem câmera
      g.save(); g.setTransform(d * this.esc, 0, 0, d * this.esc, d * this.ox, d * this.oy); g.beginPath(); g.rect(0, 0, L, A); g.clip();
      for (const e of todos) if (e.Sprite.fixo) pintar(e, L / 2, A / 2, L / 2, A / 2);
      g.restore();
      // camada de tela (px CSS): joystick virtual e depuração
      g.setTransform(d, 0, 0, d, 0, 0);
      const j = eng && eng.input && eng.input.joystick;
      if (j && j.ativo) {
        g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(j.x0, j.y0, j.raio, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(j.x0 + j.dx * j.raio, j.y0 + j.dy * j.raio, 22, 0, Math.PI * 2); g.fill();
      }
      if (this.debug && eng) {
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(8, 8, 190, 22); g.fillStyle = '#fff'; g.font = '12px ui-monospace,monospace'; g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(Math.round(eng.fps) + ' fps · ' + scene.entities.size + ' entidades · passo ' + eng.passos, 14, 19);
      }
    }
  }
  C.CanvasRenderer = CanvasRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
