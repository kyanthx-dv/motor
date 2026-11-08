/* Core · Engine
   Loop de passo fixo (60 Hz). A lógica sempre anda em fatias iguais de 1/60 s; o desenho acontece
   quando o navegador pede. Por quê: física e replays ficam iguais em qualquer aparelho. */
(function (root) {
  const C = root.Core = root.Core || {};
  const SEM_INPUT = () => ({ down: new Set(), pressed: new Set(), released: new Set(), axes: { x: 0, y: 0 }, pointer: { x: 0, y: 0, down: false } });
  class Engine {
    constructor(opts = {}) {
      this.scene = new C.Scene(); this.events = new C.Events();
      this.input = opts.input || null; this.renderer = opts.renderer || null;
      this.dt = 1 / 60; this.acum = 0; this.tempo = 0; this.passos = 0; this.fps = 60;
      this.pausado = false; this.rodando = false;
      this.scripts = {}; this.systems = []; this.cenas = {}; this._proxima = null; this._emPasso = false;
      this.ctx = { engine: this, scene: this.scene, events: this.events, input: SEM_INPUT(), dt: this.dt, tela: { largura: 800, altura: 450 } };
      if (opts.padrao !== false) {                       // ordem importa: entrada → scripts → física
        this.usar('controles', C.Systems.controles); this.usar('ui', C.Systems.ui); this.usar('scripts', C.Systems.scripts); this.usar('fisica', C.Systems.fisica);
        this.usar('animacao', C.Systems.animacao); this.usar('camera', C.Systems.camera);
      }
      // Eventos com { para: id } vão para o script da entidade (def.eventos[nome])
      this.events.on('*', (d, nome) => {
        if (!d || d.para == null) return;
        const e = this.scene.get(d.para); if (!e || !e.Script) return;
        const def = this.scripts[e.Script.nome], h = def && def.eventos && def.eventos[nome];
        if (h) h(e, d, this.ctx);
      });
    }
    // Cenas (telas do jogo): registrarCena('menu', { montar(engine, dados) { ... } }); irPara('menu', dados).
    // Trocar no meio de um passo é seguro: a troca acontece quando o passo termina.
    registrarCena(nome, def) { this.cenas[nome] = def; return this; }
    irPara(nome, dados) {
      if (!this.cenas[nome]) throw new Error('cena não registrada: ' + nome);
      this._proxima = { nome, dados: dados || {} };
      if (!this._emPasso) this._aplicarCena();
    }
    _aplicarCena() {
      const { nome, dados } = this._proxima; this._proxima = null;
      this.scene.clear(); this.events.fila.length = 0; this.scene.estado.cena = nome;   // o nome da cena é salvo junto
      this.cenas[nome].montar(this, dados);
    }
    usar(nome, fn) { this.systems.push({ nome, fn }); return this; }
    registrarScript(nome, def) { this.scripts[nome] = def; return this; }
    // Um passo de lógica. Público de propósito: testes e replays chamam direto.
    passo(dt = this.dt) {
      const ctx = this.ctx; ctx.dt = dt;
      ctx.tela = this.renderer ? { largura: this.renderer.largura, altura: this.renderer.altura } : { largura: 800, altura: 450 };
      ctx.input = this.input ? this.input.poll() : SEM_INPUT();
      for (const e of this.scene.query('Transform')) { e.Transform.px = e.Transform.x; e.Transform.py = e.Transform.y; }
      this._emPasso = true;
      try { for (const s of this.systems) s.fn(this.scene, dt, ctx); this.events.flush(); this.scene.flush(); }
      finally { this._emPasso = false; }
      if (this._proxima) this._aplicarCena();
      this.tempo += dt; this.passos++;
    }
    iniciar() {
      if (this.rodando) return; this.rodando = true; let ultimo = performance.now();
      const quadro = agora => {
        if (!this.rodando) return;
        let delta = (agora - ultimo) / 1000; ultimo = agora; if (delta > 0.25) delta = 0.25;   // aba em segundo plano
        this.fps = this.fps * 0.92 + (1 / Math.max(delta, 1e-4)) * 0.08;
        if (!this.pausado) {
          this.acum += delta; let n = 0;
          while (this.acum >= this.dt && n < 5) { this.passo(); this.acum -= this.dt; n++; }
          if (n === 5) this.acum = 0;                    // não tenta "recuperar" tempo perdido
        }
        if (this.renderer) this.renderer.desenhar(this.scene, this.pausado ? 1 : this.acum / this.dt, this);
        this._raf = requestAnimationFrame(quadro);
      };
      this._raf = requestAnimationFrame(quadro);
    }
    parar() { this.rodando = false; if (this._raf) cancelAnimationFrame(this._raf); }
  }
  C.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
