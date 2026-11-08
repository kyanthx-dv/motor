/* Adaptador · Input
   Teclado, mouse e toque viram o mesmo formato. O núcleo nunca vê teclas, só ações:
   poll() -> { down, pressed, released, axes:{x,y}, pointer:{x,y,down} }
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
      this.down = new Set(); this.edge = new Set(); this.soltou = new Set();
      this.joystick = { ativo: false, x0: 0, y0: 0, x: 0, y: 0, dx: 0, dy: 0, raio: 56, id: null };
      this.pointer = { x: 0, y: 0, tx: 0, ty: 0, down: false }; this.pEdge = false; this.ptId = null;   // um ponteiro principal no canvas; botões HTML são independentes
      this.mapa = new Map();
      for (const a in this.teclas) for (const k of this.teclas[a]) this.mapa.set(k, a);
      const ouvir = (alvo, tipo, fn) => { alvo.addEventListener(tipo, fn); this.listeners.push({ alvo, tipo, fn }); };
      const digitando = e => { const t = e.target && e.target.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'; };
      ouvir(window, 'keydown', e => {
        if (digitando(e)) return; const a = this.mapa.get(e.key.toLowerCase()); if (!a) return;
        e.preventDefault(); this.pressionar(a, true);
      });
      ouvir(window, 'keyup', e => { const a = this.mapa.get(e.key.toLowerCase()); if (a) this.pressionar(a, false); });
      ouvir(window, 'blur', () => { [...this.down].forEach(a => this.pressionar(a, false)); });
      ouvir(canvas, 'pointerdown', e => {
        if (this.ptId !== null) { e.preventDefault(); return; }       // 2º dedo no canvas é ignorado: não corrompe o estado do 1º
        this.ptId = e.pointerId; const p = this.local(e); this.atualizarPonteiro(p, true); this.pEdge = true;
        if (!this.joystick.ativo) { const j = this.joystick; j.ativo = true; j.id = e.pointerId; j.x0 = j.x = p.x; j.y0 = j.y = p.y; j.dx = j.dy = 0; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} }
        e.preventDefault();
      });
      ouvir(canvas, 'pointermove', e => {
        if (this.ptId !== null && e.pointerId !== this.ptId) return;
        const p = this.local(e); this.atualizarPonteiro(p, this.pointer.down);
        const j = this.joystick; if (!j.ativo || e.pointerId !== j.id) return;
        j.x = p.x; j.y = p.y; let dx = (p.x - j.x0) / j.raio, dy = (p.y - j.y0) / j.raio; const m = Math.hypot(dx, dy);
        if (m > 1) { dx /= m; dy /= m; }
        j.dx = dx; j.dy = dy;
      });
      const fim = e => { if (e.pointerId !== this.ptId) return; const j = this.joystick; j.ativo = false; j.dx = j.dy = 0; j.id = null; this.ptId = null; this.pointer.down = false; };
      ouvir(canvas, 'pointerup', fim); ouvir(canvas, 'pointercancel', fim);
    }
    local(e) { const r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    atualizarPonteiro(p, down) { const w = this.renderer ? this.renderer.telaParaMundo(p.x, p.y) : p; this.pointer.x = w.x; this.pointer.y = w.y; this.pointer.down = down;
      const j = this.renderer && this.renderer.telaParaJanela ? this.renderer.telaParaJanela(p.x, p.y) : p; this.pointer.tx = j.x; this.pointer.ty = j.y; }
    // também serve para botões virtuais na tela (celular)
    pressionar(acao, v) {
      if (v) { if (!this.down.has(acao)) { this.down.add(acao); this.edge.add(acao); } }
      else if (this.down.has(acao)) { this.down.delete(acao); this.soltou.add(acao); }
    }
    eixos() {
      let x = (this.down.has('direita') ? 1 : 0) - (this.down.has('esquerda') ? 1 : 0), y = (this.down.has('baixo') ? 1 : 0) - (this.down.has('cima') ? 1 : 0);
      const j = this.joystick;
      if (j.ativo) { const m = Math.hypot(j.dx, j.dy); if (m > 0.12) { x += j.dx; y += j.dy; } }   // zona morta do joystick
      const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
      return { x, y };
    }
    poll() {
      const s = { down: new Set(this.down), pressed: new Set(this.edge), released: new Set(this.soltou), axes: this.eixos(), pointer: { ...this.pointer, pressed: this.pEdge } };
      this.pEdge = false; this.edge.clear(); this.soltou.clear(); return s;
    }
    destruir() {
      for (const { alvo, tipo, fn } of this.listeners) alvo.removeEventListener(tipo, fn);
      this.listeners.length = 0;
      this.down.clear(); this.edge.clear(); this.soltou.clear();
      this.joystick.ativo = false; this.joystick.id = null; this.joystick.dx = this.joystick.dy = 0;
      this.ptId = null; this.pointer.down = false;
    }
  }
  C.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);
