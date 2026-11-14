/* Adaptador · Input
   Teclado, mouse e toque viram o mesmo formato. O núcleo nunca vê teclas, só ações:
   poll() -> { down, pressed, released, keys, keysPressed, axes:{x,y}, pointer:{x,y,down} }   (keys = teclas livres pelo nome)
   "pressed" vale só no passo em que a ação foi apertada (borda de subida). */
(function (root) {
  const C = root.Core = root.Core || {};
  const TECLAS = {
    esquerda: ['arrowleft', 'a'], direita: ['arrowright', 'd'], cima: ['arrowup', 'w'], baixo: ['arrowdown', 's'],
    acao: [' ', 'enter', 'j', 'k']
  };
  class Input {
    constructor(canvas, renderer, teclas) {
      this.canvas = canvas; this.renderer = renderer; this.teclas = teclas || TECLAS;
      this.listeners = [];
      this.down = new Set(); this.edge = new Set(); this.soltou = new Set(); this.keys = new Set(); this.keysEdge = new Set();
      this.joystick = { ativo: false, x0: 0, y0: 0, x: 0, y: 0, dx: 0, dy: 0, raio: 56, id: null, modo: 'flutuante', visivel: true, fixo: false, zonaMorta: 0.12, zona: 'tela', fx: 0.14, fy: 0.78 };
      this.pointer = { x: 0, y: 0, tx: 0, ty: 0, down: false, ativo: false }; this.pEdge = false; this.ptId = null;   // um ponteiro principal no canvas; botões HTML são independentes
      this.mapa = new Map();
      for (const a in this.teclas) for (const k of this.teclas[a]) this.mapa.set(k, a);
      const ouvir = (alvo, tipo, fn) => { alvo.addEventListener(tipo, fn); this.listeners.push({ alvo, tipo, fn }); };
      const digitando = e => { const t = e.target && e.target.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'; };
      // Teclas livres: qualquer tecla pelo nome (e.key em minúsculas: 'z', ' ', 'arrowup'). Só registra; só bloqueia o navegador nas teclas mapeadas.
      ouvir(window, 'keydown', e => {
        if (digitando(e)) return; const k = e.key.toLowerCase(); if (!this.keys.has(k)) { this.keys.add(k); this.keysEdge.add(k); }
        const a = this.mapa.get(k); if (!a) return;
        e.preventDefault(); this.pressionar(a, true);
      });
      ouvir(window, 'keyup', e => { const k = e.key.toLowerCase(); this.keys.delete(k); const a = this.mapa.get(k); if (a) this.pressionar(a, false); });
      ouvir(window, 'blur', () => { this.keys.clear(); [...this.down].forEach(a => this.pressionar(a, false)); });
      if (canvas.style) { canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none'; canvas.style.webkitUserSelect = 'none'; canvas.style.webkitTapHighlightColor = 'transparent'; }   // sem isso o navegador do celular rouba o gesto (rolagem) e o joystick morre
      ouvir(canvas, 'pointerdown', e => {
        if (this.ptId !== null) { e.preventDefault(); return; }       // 2º dedo no canvas é ignorado: não corrompe o estado do 1º
        this.ptId = e.pointerId; const p = this.local(e); this.atualizarPonteiro(p, true); this.pEdge = true;
        if (e.pointerType === 'touch' && !this.joystick.ativo && this.podeJoystick(p)) { const j = this.joystick; j.ativo = true; j.id = e.pointerId; if (!j.fixo) { j.x0 = p.x; j.y0 = p.y; } j.x = p.x; j.y = p.y; j.dx = j.dy = 0; if (j.fixo) this._mover(p); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} }
        e.preventDefault();
      });
      ouvir(canvas, 'pointermove', e => {
        if (this.ptId !== null && e.pointerId !== this.ptId) return;
        const p = this.local(e); this.atualizarPonteiro(p, this.pointer.down);
        const j = this.joystick; if (!j.ativo || e.pointerId !== j.id) return;
        this._mover(p);
      });
      const fim = e => { if (e.pointerId !== this.ptId) return; const j = this.joystick; j.ativo = false; j.dx = j.dy = 0; j.id = null; this.ptId = null; this.pointer.down = false; };
      ouvir(canvas, 'pointerup', fim); ouvir(canvas, 'pointercancel', fim);
    }
    // Configuração do joystick virtual (vem da cena: estado.joystick). modo: 'flutuante' (nasce onde o dedo toca), 'fixo' (sempre na mesma posição) ou 'desligado'.
    configurar(c) {
      const j = this.joystick; c = c || {}; const modo = ['flutuante', 'fixo', 'desligado'].includes(c.modo) ? c.modo : 'flutuante', n = (v, pad, a, b) => (Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : pad);
      j.modo = modo; j.visivel = c.visivel !== false; j.raio = n(c.raio, 56, 20, 200); j.zonaMorta = n(c.zonaMorta, 0.12, 0, 0.9); j.zona = ['tela', 'esquerda', 'direita'].includes(c.zona) ? c.zona : 'tela'; j.fx = n(c.x, 0.14, 0, 1); j.fy = n(c.y, 0.78, 0, 1);
      j.fixo = modo === 'fixo'; if (modo === 'desligado' && j.ativo) { j.ativo = false; j.dx = j.dy = 0; j.id = null; }
      if (j.fixo) { const r = this.canvas.getBoundingClientRect(); j.x0 = r.width * j.fx; j.y0 = r.height * j.fy; if (!j.ativo) { j.x = j.x0; j.y = j.y0; } }
    }
    podeJoystick(p) {
      const j = this.joystick; if (j.modo === 'desligado') return false; const r = this.canvas.getBoundingClientRect();
      if (j.fixo) return Math.hypot(p.x - j.x0, p.y - j.y0) <= j.raio * 1.8;
      return j.zona === 'esquerda' ? p.x < r.width / 2 : j.zona === 'direita' ? p.x >= r.width / 2 : true;
    }
    _mover(p) {
      const j = this.joystick; j.x = p.x; j.y = p.y; let dx = (p.x - j.x0) / j.raio, dy = (p.y - j.y0) / j.raio; const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; } j.dx = dx; j.dy = dy;
    }
    local(e) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    atualizarPonteiro(p, down) { const w = this.renderer ? this.renderer.telaParaMundo(p.x, p.y) : p; this.pointer.x = w.x; this.pointer.y = w.y; this.pointer.down = down; this.pointer.ativo = true;
      const j = this.renderer && this.renderer.telaParaJanela ? this.renderer.telaParaJanela(p.x, p.y) : p; this.pointer.tx = j.x; this.pointer.ty = j.y; }
    // também serve para botões virtuais na tela (celular)
    pressionar(acao, v) {
      if (v) { if (!this.down.has(acao)) { this.down.add(acao); this.edge.add(acao); } }
      else if (this.down.has(acao)) { this.down.delete(acao); this.soltou.add(acao); }
    }
    eixos() {
      let x = (this.down.has('direita') ? 1 : 0) - (this.down.has('esquerda') ? 1 : 0), y = (this.down.has('baixo') ? 1 : 0) - (this.down.has('cima') ? 1 : 0);
      const j = this.joystick;
      if (j.ativo && j.modo !== 'desligado') { const m = Math.hypot(j.dx, j.dy); if (m > j.zonaMorta) { x += j.dx; y += j.dy; } }   // zona morta do joystick
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      return { x, y };
    }
    // Dados do joystick para scripts (ctx.input.joystick): dx/dy de -1 a 1, forca de 0 a 1 (0 dentro da zona morta), angulo em graus (0 = direita, 90 = baixo).
    dadosJoystick() {
      const j = this.joystick, f = j.ativo ? Math.min(1, Math.hypot(j.dx, j.dy)) : 0, v = f > j.zonaMorta;
      return { ativo: j.ativo && v, dx: v ? j.dx : 0, dy: v ? j.dy : 0, forca: v ? f : 0, angulo: v ? Math.atan2(j.dy, j.dx) * 180 / Math.PI : 0, modo: j.modo };
    }
    poll() {
      const s = { keys: new Set(this.keys), keysPressed: new Set(this.keysEdge), down: new Set(this.down), pressed: new Set(this.edge), released: new Set(this.soltou), axes: this.eixos(), joystick: this.dadosJoystick(), pointer: { ...this.pointer, pressed: this.pEdge } };
      this.pEdge = false; this.edge.clear(); this.soltou.clear(); this.keysEdge.clear(); return s;
    }
    destruir() {
      for (const { alvo, tipo, fn } of this.listeners) alvo.removeEventListener(tipo, fn);
      this.listeners.length = 0;
      this.down.clear(); this.edge.clear(); this.soltou.clear(); this.keys.clear(); this.keysEdge.clear();
      this.joystick.ativo = false; this.joystick.id = null; this.joystick.dx = this.joystick.dy = 0;
      this.ptId = null; this.pointer.down = false;
    }
  }
  C.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);
