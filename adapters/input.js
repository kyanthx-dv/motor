/* Adaptador · Input
   Teclado, mouse e toque viram o mesmo formato. O núcleo nunca vê teclas, só ações:
   poll() -> { down, pressed, released, keys, keysPressed, axes:{x,y}, pointer:{x,y,down}, pointers:[{id,x,y,tx,ty,down,pressed}] }   (pointers = todos os dedos na tela, multitoque)   (keys = teclas livres pelo nome)
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
      this.joystick = { ativo: false, x0: 0, y0: 0, x: 0, y: 0, dx: 0, dy: 0, raio: 56, id: null, modo: 'flutuante', visivel: true, fixo: false, zonaMorta: 0.12, zona: 'base', fx: 0.14, fy: 0.78 };
      this.pointer = { x: 0, y: 0, tx: 0, ty: 0, down: false, ativo: false }; this.pEdge = false; this.ptId = null;   // um ponteiro principal no canvas; botões HTML são independentes
      this.toques = new Map(); this.foco = null; this.txt = ''; this.envios = 0; this.campoEm = null; this.mapa = new Map();
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
      ouvir(window, 'blur', () => { this.toques.clear(); this.keys.clear(); [...this.down].forEach(a => this.pressionar(a, false)); });
      if (canvas.style) { canvas.style.touchAction = 'none'; canvas.style.userSelect = 'none'; canvas.style.webkitUserSelect = 'none'; canvas.style.webkitTapHighlightColor = 'transparent'; }   // sem isso o navegador do celular rouba o gesto (rolagem) e o joystick morre
      ouvir(canvas, 'pointerdown', e => {
        const p = this.local(e), w = this._mundo(p), usados = new Set([...this.toques.values()].map(t => t.id)); let slot = 0; while (usados.has(slot)) slot++;
        this.toques.set(e.pointerId, { id: slot, x: w.x, y: w.y, tx: w.tx, ty: w.ty, down: true, pressed: true, fim: false, tipo: e.pointerType });   // multitoque: cada dedo tem seu id (0, 1, 2...)
        if (this.ptId === null) { this.ptId = e.pointerId; this.atualizarPonteiro(p, true); this.pEdge = true; }   // o 1º dedo é o ponteiro principal (compatível com tudo que já existe)
        if (!this.joystick.ativo && this.podeJoystick(p)) { const j = this.joystick; j.ativo = true; j.id = e.pointerId; if (!j.fixo) { j.x0 = p.x; j.y0 = p.y; } j.x = p.x; j.y = p.y; j.dx = j.dy = 0; if (j.fixo) this._mover(p); try { canvas.setPointerCapture(e.pointerId); } catch (x) {} }   // o joystick pega qualquer dedo dentro da zona, mesmo o 2º
        e.preventDefault();
      });
      ouvir(canvas, 'pointermove', e => {
        const t = this.toques.get(e.pointerId), p = this.local(e); if (t) Object.assign(t, this._mundo(p));
        if (this.ptId === null || e.pointerId === this.ptId) this.atualizarPonteiro(p, this.pointer.down);
        const j = this.joystick; if (!j.ativo || e.pointerId !== j.id) return;
        this._mover(p);
      });
      const fim = e => {
        const t = this.toques.get(e.pointerId); if (t) { t.down = false; t.fim = true; }   // fica mais um quadro na lista para o jogo ver o fim do toque
        const j = this.joystick; if (e.pointerId === j.id) { j.ativo = false; j.dx = j.dy = 0; j.id = null; }
        if (e.pointerId !== this.ptId) return; this.ptId = null; this.pointer.down = false; if (e.pointerType !== 'mouse') this._deixar = true;   // dedo levantou: o 'sobre' dos botões some depois do quadro que viu o toque
      };
      ouvir(canvas, 'pointerup', e => { if (e.pointerType === 'mouse' || e.pointerId === this.ptId || this.ptId === null) this._tocou(e); });   // toque num Campo: abre o teclado (precisa ser dentro do gesto do usuário)
      ouvir(canvas, 'pointerup', fim); ouvir(canvas, 'pointercancel', fim);
    }
    // Campo de texto: um <input> escondido recebe o teclado (celular inclusive); o texto vai para o jogo em poll().texto
    _campoEl() {
      if (this._el) return this._el; if (typeof document === 'undefined') return null;
      const el = document.createElement('input'); el.type = 'text'; el.setAttribute('autocomplete', 'off'); el.setAttribute('autocapitalize', 'off'); el.setAttribute('aria-label', 'campo de texto do jogo');
      Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '1px', height: '1px', opacity: '0', border: '0', padding: '0', fontSize: '16px' });
      el.addEventListener('input', () => { this.txt = el.value; });
      el.addEventListener('keydown', ev => { if (ev.key === 'Enter') { this.envios++; el.blur(); } });
      el.addEventListener('blur', () => { this.foco = null; });
      document.body.appendChild(el); this._el = el; return el;
    }
    _tocou(e) {
      if (!this.campoEm) return; const p = this.local(e), w = this.renderer ? this.renderer.telaParaMundo(p.x, p.y) : p, j = this.renderer && this.renderer.telaParaJanela ? this.renderer.telaParaJanela(p.x, p.y) : p, h = this.campoEm({ x: w.x, y: w.y, tx: j.x, ty: j.y }), el = this._campoEl(); if (!el) return;
      if (!h) { if (this.foco) el.blur(); return; }
      el.type = h.senha ? 'password' : 'text'; el.maxLength = h.max > 0 ? h.max : 524288; el.value = h.valor || ''; this.txt = el.value; this.foco = { id: h.id };
      try { el.focus({ preventScroll: true }); } catch (x) { el.focus(); }
    }
    // zona 'base' (padrão): só pega o toque dentro do raio do joystick (base parada); fora disso é um clique normal.
    // Configuração do joystick virtual (vem da cena: estado.joystick). modo: 'flutuante' (nasce onde o dedo toca), 'fixo' (sempre na mesma posição) ou 'desligado'.
    configurar(c) {
      const j = this.joystick; const semConfig = !c; c = c || {}; const modo = semConfig ? 'desligado' : ['flutuante', 'fixo', 'desligado'].includes(c.modo) ? c.modo : 'flutuante', n = (v, pad, a, b) => (Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : pad);
      j.modo = modo; j.visivel = c.visivel !== false; j.raio = n(c.raio, 56, 20, 200); j.zonaMorta = n(c.zonaMorta, 0.12, 0, 0.9); j.zona = ['base', 'tela', 'esquerda', 'direita'].includes(c.zona) ? c.zona : 'base'; j.fx = n(c.x, 0.14, 0, 1); j.fy = n(c.y, 0.78, 0, 1);
      j.fixo = modo === 'fixo' || j.zona === 'base'; if (modo === 'desligado' && j.ativo) { j.ativo = false; j.dx = j.dy = 0; j.id = null; }
      if (modo !== 'desligado' && !j.ativo) { const r = this.canvas.getBoundingClientRect(); j.x0 = r.width * j.fx; j.y0 = r.height * j.fy; j.x = j.x0; j.y = j.y0; }   // parado: base na posição configurada (também no flutuante)
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
    _mundo(p) { const w = this.renderer ? this.renderer.telaParaMundo(p.x, p.y) : p, j = this.renderer && this.renderer.telaParaJanela ? this.renderer.telaParaJanela(p.x, p.y) : p; return { x: w.x, y: w.y, tx: j.x, ty: j.y }; }
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
      const s = { keys: new Set(this.keys), keysPressed: new Set(this.keysEdge), down: new Set(this.down), pressed: new Set(this.edge), released: new Set(this.soltou), axes: this.eixos(), joystick: this.dadosJoystick(), texto: { foco: !!this.foco, id: this.foco ? this.foco.id : -1, valor: this.txt, envios: this.envios }, pointer: { ...this.pointer, pressed: this.pEdge }, pointers: [...this.toques.values()].map(t => ({ id: t.id, x: t.x, y: t.y, tx: t.tx, ty: t.ty, down: t.down, pressed: t.pressed, ativo: true })) };
      for (const [k, t] of this.toques) { t.pressed = false; if (t.fim) this.toques.delete(k); }
      this.pEdge = false; if (this._deixar) { this.pointer.ativo = false; this._deixar = false; } this.edge.clear(); this.soltou.clear(); this.keysEdge.clear(); return s;
    }
    destruir() {
      for (const { alvo, tipo, fn } of this.listeners) alvo.removeEventListener(tipo, fn);
      this.listeners.length = 0;
      if (this._el) { try { this._el.remove(); } catch (x) {} this._el = null; } this.foco = null;
      this.down.clear(); this.edge.clear(); this.soltou.clear(); this.keys.clear(); this.keysEdge.clear();
      this.joystick.ativo = false; this.joystick.id = null; this.joystick.dx = this.joystick.dy = 0;
      this.ptId = null; this.pointer.down = false; this.toques.clear();
    }
  }
  C.Input = Input;
})(typeof window !== 'undefined' ? window : globalThis);
