/* Core · Engine
   Loop de passo fixo (60 Hz). A lógica sempre anda em fatias iguais de 1/60 s; o desenho acontece
   quando o navegador pede. Por quê: física e replays ficam iguais em qualquer aparelho. */
(function (root) {
  const C = root.Core = root.Core || {};
  // Quem "bate o relógio" é o host. Padrão: requestAnimationFrame se existir; senão um temporizador (Node, workers).
  // Outro host (SDL, app nativo) passa seu próprio agendador: { agora(), pedir(fn), cancelar(id) }.
  const agendadorPadrao = () => {
    const raf = typeof requestAnimationFrame === 'function', agora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    return { agora, pedir: fn => (raf ? requestAnimationFrame(fn) : setTimeout(() => fn(agora()), 16)), cancelar: id => (raf ? cancelAnimationFrame(id) : clearTimeout(id)) };
  };
  const SEM_INPUT = () => ({ down: new Set(), pressed: new Set(), released: new Set(), axes: { x: 0, y: 0 }, pointer: { x: 0, y: 0, down: false } });
  class Engine {
    constructor(opts = {}) {
      if (!C.Scene || !C.Events) throw new Error('Core: carregue events.js e scene.js antes de engine.js');
      if (opts.padrao !== false && !(C.Systems && C.Systems.fisica && C.Systems.scripts && C.Systems.controles && C.Systems.ui && C.Systems.animacao && C.Systems.camera)) throw new Error('Core: faltam arquivos de core/systems/ (controles, ui, scripts, fisica, animacao, camera)');
      this.scene = new C.Scene(); this.events = new C.Events();
      this.input = opts.input || null; this.renderer = opts.renderer || null;
      this.dt = 1 / 60; this.acum = 0; this.tempo = 0; this.passos = 0; this.fps = 60;
      this.pausado = false; this.rodando = false;
      // Política de tempo (decisão do motor, não acidente): se o aparelho atrasa, o jogo NÃO tenta recuperar o tempo perdido.
      // Cada quadro simula no máximo maxPassos passos e ignora delta acima de maxDelta; o excedente fica contado em tempoPerdido.
      // Para replays/testes exatos, chame engine.passo() diretamente.
      this.agendador = opts.agendador || agendadorPadrao(); this.maxDelta = opts.maxDelta ?? 0.25; this.maxPassos = opts.maxPassos ?? 5; this.tempoPerdido = 0;
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
      if (this.rodando) return; this.rodando = true; const ag = this.agendador; let ultimo = ag.agora();
      const quadro = agora => {
        if (!this.rodando) return;
        let delta = (agora - ultimo) / 1000; ultimo = agora;
        if (delta > this.maxDelta) { this.tempoPerdido += delta - this.maxDelta; delta = this.maxDelta; }   // aba em segundo plano
        this.fps = this.fps * 0.92 + (1 / Math.max(delta, 1e-4)) * 0.08;
        if (!this.pausado) {
          this.acum += delta; let n = 0;
          while (this.acum >= this.dt && n < this.maxPassos) { this.passo(); this.acum -= this.dt; n++; }
          if (n === this.maxPassos && this.acum >= this.dt) { this.tempoPerdido += this.acum; this.acum = 0; }
        }
        if (this.renderer) this.renderer.desenhar(this.scene, this.pausado ? 1 : this.acum / this.dt, this);
        this._raf = ag.pedir(quadro);
      };
      this._raf = ag.pedir(quadro);
    }
    parar() { this.rodando = false; if (this._raf != null) this.agendador.cancelar(this._raf); }
  }
  C.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
