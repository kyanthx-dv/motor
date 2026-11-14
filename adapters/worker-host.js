/* Adaptador · WorkerHost. Roda o MOTOR INTEIRO (física, scripts do jogo) num Web Worker; a página só desenha, ouve entrada e toca som.
   Um script com laço infinito trava o worker, não a página: o vigia (3 s sem quadros) encerra o worker e oferece "Reiniciar".
   Scripts também ficam sem acesso à página (document, localStorage, cookies). A cada passo o worker manda um retrato da cena
   (entidades, câmera, efeitos, variáveis); a página o desenha com o CanvasRenderer de sempre. Armazém, áudio e dispositivo viram mensagens.
   Uso: new Core.WorkerHost({ codigo, jogo, tela, renderer, input, audio, armazem, prefixo }).iniciar()  — `codigo` = fonte do motor (núcleo + adaptadores). */
(function (root) {
  const C = root.Core = root.Core || {};

  // ===== roda DENTRO do worker (é enviada como texto; não use variáveis de fora) =====
  function trabalhador() {
    const C = self.Core; let engine = null, cur = null, pend = null, info = {}, arm = new Map();
    const post = (t, d) => { try { self.postMessage(Object.assign({ t }, d)); } catch (x) { self.postMessage({ t: 'erro', texto: 'não deu para enviar ' + t + ': ' + (x && x.message) }); } };
    const novoPend = () => ({ pressed: new Set(), keysPressed: new Set(), released: new Set(), ptr: false });
    const stub = {
      largura: 800, altura: 450,
      desenhar(scene, alpha, eng) {
        const tm = scene.estado.tamanho; if (tm && tm.largura > 0 && tm.altura > 0) { this.largura = tm.largura; this.altura = tm.altura; }
        const est = Object.assign({}, scene.estado); delete est.scripts; delete est.imagens; delete est.sons; delete est.listas; delete est.vars;
        post('frame', { e: [...scene.entities.values()], est, ef: scene.efeitos, vars: Object.assign({}, eng.vars._v), fps: eng.fps, passos: eng.passos, rodando: eng.rodando });
      }
    };
    const agendador = { agora: () => performance.now(), pedir: fn => setTimeout(() => fn(performance.now()), 16), cancelar: id => clearTimeout(id) };
    const armazem = { get: k => (arm.has(k) ? arm.get(k) : null), set: (k, v) => { arm.set(k, String(v)); post('arm', { op: 'set', k, v: String(v) }); }, remove: k => { arm.delete(k); post('arm', { op: 'remove', k }); }, has: k => arm.has(k) };
    const audio = new Proxy({}, { get: (o, m) => (m === 'disponivel' ? true : m === 'then' ? undefined : (...a) => { post('audio', { m, a }); return true; }) });
    const HORA = ['hora', 'minuto', 'segundo', 'dia', 'mes', 'ano', 'diaSemana'];
    const dispositivo = { campos: [], ler: c => (HORA.includes(c) || !(c in info) ? C.Dispositivo.ler(c) : info[c]), info: () => Object.assign({}, info), vibrar: ms => { post('dev', { m: 'vibrar', a: [ms] }); return true; }, telaCheia: s => { post('dev', { m: 'telaCheia', a: [s] }); return true; } };
    const SEM = () => ({ keys: new Set(), keysPressed: new Set(), down: new Set(), pressed: new Set(), released: new Set(), axes: { x: 0, y: 0 }, pointer: { x: 0, y: 0, tx: 0, ty: 0, down: false, pressed: false } });
    const input = {
      joystick: { ativo: false }, poll() {
        const s = cur ? { keys: new Set(cur.keys), keysPressed: pend.keysPressed, down: new Set(cur.down), pressed: pend.pressed, released: pend.released, axes: cur.axes, joystick: cur.joystick, pointer: Object.assign({}, cur.pointer, { pressed: pend.ptr }) } : SEM();
        pend = novoPend(); return s;
      }
    };
    pend = novoPend();
    self.onmessage = ev => {
      const m = ev.data;
      if (m.t === 'init') {
        try {
          info = m.info || {}; for (const k in (m.armazem || {})) arm.set(k, m.armazem[k]);
          const tm = (m.jogo.cenas[m.jogo.atual].estado || {}).tamanho; if (tm) { stub.largura = tm.largura; stub.altura = tm.altura; }
          engine = new C.Engine({ renderer: stub, agendador }); engine.armazem = armazem; engine.audio = audio; engine.dispositivo = dispositivo; engine.input = input;
          C.Serializer.deJSON(engine.scene, JSON.parse(JSON.stringify(m.jogo.cenas[m.jogo.atual])));
          engine.cenas = {}; for (const n in m.jogo.cenas) engine.registrarCenaJSON(n, JSON.parse(JSON.stringify(m.jogo.cenas[n])));
          engine.events.on('saida', d => post('saida', { d })); engine.events.on('erro-script', d => post('erro', { texto: JSON.stringify(d).slice(0, 400) }));
          engine.iniciar(); post('pronto', { erros: engine.errosScripts || [] });
        } catch (x) { post('erro', { texto: 'falha ao iniciar: ' + (x && x.message), fatal: true }); }
      } else if (m.t === 'input') {
        cur = m.s; for (const k of ['pressed', 'keysPressed', 'released']) for (const x of m.s[k]) pend[k].add(x); if (m.s.pointer.pressed) pend.ptr = true;
      } else if (m.t === 'info') info = m.info;
    };
    post('vivo', {});
  }

  class WorkerHost {
    constructor(o) { Object.assign(this, o); this.limite = o.limite || 3000; this.worker = null; this.ultimo = 0; this.pronto = false; this.travado = false; this.snap = null; this.vars = {}; this.erros = []; this.saidas = [];
      this.scene = new C.Scene(); this.fake = { fps: 60, passos: 0, input: this.input, debug: false };
      const self = this;
      this.engine = { get rodando() { return !!self.pronto && !self.travado; }, scene: this.scene, vars: { ler: n => self.vars[n], existe: n => n in self.vars }, get errosScripts() { return self.erros; }, events: new C.Events() };
    }
    _info() { return C.Dispositivo ? C.Dispositivo.info() : {}; }
    _criar() {
      const fonte = this.codigo + '\n;\n(' + trabalhador.toString() + ')();', url = URL.createObjectURL(new Blob([fonte], { type: 'text/javascript' })); this.worker = new Worker(url); URL.revokeObjectURL(url);
      this.pronto = false; this.travado = false; this.ultimo = performance.now();
      this.worker.onmessage = ev => this._msg(ev.data); this.worker.onerror = ev => { this.erros.push({ mensagem: ev.message || 'erro no worker' }); if (this.aoErro) this.aoErro(ev.message); };
      const arm = {}; try { const ls = root.localStorage; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k.startsWith(this.prefixo || '\u0000')) arm[k.slice(this.prefixo.length)] = ls.getItem(k); } } catch (x) {}
      this.worker.postMessage({ t: 'init', jogo: this.jogo, info: this._info(), armazem: arm });
    }
    _msg(m) {
      this.ultimo = performance.now();
      if (m.t === 'frame') {
        const mapa = new Map(); for (const e of m.e) mapa.set(e.id, e); this.scene.entities = mapa; this.scene.estado = m.est; this.scene.efeitos = m.ef; this.vars = m.vars; this.fake.fps = m.fps; this.fake.passos = m.passos;
      } else if (m.t === 'pronto') { this.pronto = true; this.erros = m.erros || []; }
      else if (m.t === 'audio') { const a = this.audio; if (a && ['tocar', 'parar', 'pararTudo', 'efeito'].includes(m.m) && typeof a[m.m] === 'function') { try { a[m.m](...m.a); } catch (x) {} } }
      else if (m.t === 'dev') { const d = C.Dispositivo; if (d && (m.m === 'vibrar' || m.m === 'telaCheia')) { try { d[m.m](...m.a); } catch (x) {} } }
      else if (m.t === 'arm') { try { if (m.op === 'set') this.armazem.set(m.k, m.v); else this.armazem.remove(m.k); } catch (x) {} }
      else if (m.t === 'erro') { this.erros.push({ mensagem: m.texto }); if (this.aoErro) this.aoErro(m.texto, m.fatal); }
      else if (m.t === 'saida') { this.saidas.push(m.d); if (this.saidas.length > 200) this.saidas.shift(); if (this.aoSaida) this.aoSaida(m.d); }
    }
    iniciar() {
      this._criar();
      const quadro = () => {
        this._raf = requestAnimationFrame(quadro); if (this.travado) return;
        if (this.worker) { if (this.input.configurar) this.input.configurar(this.scene.estado.joystick); const s = this.input.poll(); this.worker.postMessage({ t: 'input', s: { keys: [...s.keys], keysPressed: [...s.keysPressed], down: [...s.down], pressed: [...s.pressed], released: [...s.released], axes: s.axes, joystick: s.joystick, pointer: s.pointer } }); }
        if (this.pronto) this.renderer.desenhar(this.scene, 1, this.fake);
      };
      this._raf = requestAnimationFrame(quadro);
      this._info_t = setInterval(() => { if (this.worker && !this.travado) this.worker.postMessage({ t: 'info', info: this._info() }); }, 1000);
      this._vigia = setInterval(() => { if (!this.travado && this.worker && performance.now() - this.ultimo > this.limite) this._travou(); }, 500);
    }
    _travou() { this.travado = true; try { this.worker.terminate(); } catch (x) {} this.worker = null; if (this.aoTravar) this.aoTravar(); }
    reiniciar() { if (this.worker) { try { this.worker.terminate(); } catch (x) {} } this.erros = []; this._criar(); }
    parar() { cancelAnimationFrame(this._raf); clearInterval(this._vigia); clearInterval(this._info_t); if (this.worker) this.worker.terminate(); this.worker = null; }
  }
  C.WorkerHost = WorkerHost;
})(typeof window !== 'undefined' ? window : globalThis);
