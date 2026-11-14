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
  const SEM_INPUT = () => ({ keys: new Set(), keysPressed: new Set(), down: new Set(), pressed: new Set(), released: new Set(), axes: { x: 0, y: 0 }, pointer: { x: 0, y: 0, tx: 0, ty: 0, down: false, pressed: false } });
  C.VERSAO = '1.0.0';   // versão do motor (aparece no editor e em ctx.engine.versao)
  class Engine {
    constructor(opts = {}) {
      if (!C.Scene || !C.Events || !C.Variaveis) throw new Error('Core: carregue events.js, scene.js e variaveis.js antes de engine.js');
      if (opts.padrao !== false && !(C.Systems && C.Systems.fisica && C.Systems.scripts && C.Systems.controles && C.Systems.ui && C.Systems.animacao && C.Systems.camera)) throw new Error('Core: faltam arquivos de core/systems/ (controles, ui, scripts, fisica, animacao, camera)');
      this.scene = new C.Scene(); this.events = new C.Events(); this.vars = new C.Variaveis(this); this.listas = C.Listas ? new C.Listas(this) : null; this.armazem = C.Armazem ? C.Armazem.memoria() : null; this.observados = {};
      this.input = opts.input || null; this.renderer = opts.renderer || null; this.audio = opts.audio || null; this.dispositivo = opts.dispositivo || null; this.versao = C.VERSAO;
      this.dt = 1 / 60; this.acum = 0; this.tempo = 0; this.passos = 0; this.fps = 60;
      this.pausado = false; this.rodando = false;
      // Política de tempo (decisão do motor, não acidente): se o aparelho atrasa, o jogo NÃO tenta recuperar o tempo perdido.
      // Cada quadro simula no máximo maxPassos passos e ignora delta acima de maxDelta; o excedente fica contado em tempoPerdido.
      // Para replays/testes exatos, chame engine.passo() diretamente.
      this.perfil = false; this.tempos = {};   // perfil:true mede o tempo médio (ms) de cada sistema, em engine.tempos
      this.agendador = opts.agendador || agendadorPadrao(); this.maxDelta = opts.maxDelta ?? 0.25; this.maxPassos = opts.maxPassos ?? 5; this.tempoPerdido = 0;
      this.scripts = {}; this.systems = []; this.cenas = {}; this._proxima = null; this._emPasso = false;
      this.ctx = { engine: this, scene: this.scene, caminho: C.Caminho, efeitos: C.Efeitos, events: this.events, vars: this.vars, listas: this.listas, escrever: (v) => this.escrever(v), salvarPartida: (n) => this.salvarPartida(n), carregarPartida: (n) => this.carregarPartida(n), existePartida: (n) => this.existePartida(n), get audio() { return this.engine.audio; }, get dispositivo() { return this.engine.dispositivo; }, sobre(e) { return C.sobre(e, this.input && this.input.pointer); }, input: SEM_INPUT(), dt: this.dt, tela: { largura: 800, altura: 450 } };
      if (opts.padrao !== false) {                       // ordem importa: entrada → scripts → física
        this.usar('controles', C.Systems.controles); this.usar('ui', C.Systems.ui); this.usar('scripts', C.Systems.scripts);
        if (C.Systems.tempo) { C.Tempo.instalar(this); this.usar('tempo', C.Systems.tempo); }   // esperar/tween (opcional)
        if (C.Systems.tiles) this.usar('tiles', C.Systems.tiles);
        if (C.Systems.efeitos) this.usar('efeitos', C.Systems.efeitos);   // tremor, fade e partículas (opcional)
        if (C.Systems.caminho) this.usar('caminho', C.Systems.caminho);   // seguidor de rotas do pathfinding (opcional)   // colisores do mapa de tiles (opcional)
        if (C.Systems.hierarquia) this.usar('hierarquia', C.Systems.hierarquia);   // filhos seguem o pai (opcional: jogos sem hierarquia não precisam carregar o arquivo)
        this.usar('fisica', C.Systems.fisica); if (C.Systems.hierarquia) this.usar('hierarquia2', C.Systems.hierarquia);
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
    _rodarSistemas(dt, ctx) {
      if (!this.perfil) { for (const s of this.systems) s.fn(this.scene, dt, ctx); return; }
      for (const s of this.systems) {
        const t0 = this.agendador.agora(); s.fn(this.scene, dt, ctx); const ms = this.agendador.agora() - t0;
        this.tempos[s.nome] = (this.tempos[s.nome] ?? ms) * 0.9 + ms * 0.1;
      }
    }
    registrarCena(nome, def) { this.cenas[nome] = def; return this; }
    irPara(nome, dados) {
      if (!this.cenas[nome]) throw new Error('cena não registrada: ' + nome);
      this._proxima = { nome, dados: dados || {} };
      if (!this._emPasso) this._aplicarCena();
    }
    _aplicarCena() {
      const { nome, dados } = this._proxima; this._proxima = null;
      this._limparTempo(); const vars = this.scene.estado.vars, listas = this.scene.estado.listas; this.scene.clear(); this.events.fila.length = 0; if (vars) this.scene.estado.vars = vars; if (listas) this.scene.estado.listas = listas;   // variáveis atravessam a troca de cena
      this.scene.estado.cena = nome;   // o nome da cena é salvo junto
      this.cenas[nome].montar(this, dados);
    }
    // Registra uma cena a partir do JSON salvo pelo editor. Ao entrar: carrega os objetos, mantém as variáveis que já existiam
    // (as da cena nova só entram se ainda não existirem) e religa os scripts da cena.
    registrarCenaJSON(nome, json) {
      return this.registrarCena(nome, { montar: eng => {
        const antes = eng.scene.estado.vars || {}, antesL = eng.scene.estado.listas || {};
        C.Serializer.deJSON(eng.scene, typeof json === 'string' ? JSON.parse(json) : JSON.parse(JSON.stringify(json)));
        const novas = eng.scene.estado.vars || {}; eng.scene.estado.vars = Object.assign({}, novas, antes); if (Object.keys(antesL).length || eng.scene.estado.listas) eng.scene.estado.listas = Object.assign({}, eng.scene.estado.listas || {}, antesL); eng.scene.estado.cena = nome;
        eng.compilarScripts();
        eng._inicial = JSON.stringify(C.Serializer.paraJSON(eng.scene));   // "reiniciar" volta para o começo da cena em que o jogador está
      } });
    }
    usar(nome, fn) { this.systems.push({ nome, fn }); return this; }
    registrarScript(nome, def) { this.scripts[nome] = def; return this; }
    // Um passo de lógica. Público de propósito: testes e replays chamam direto.
    passo(dt = this.dt) {
      if (typeof dt !== 'number' || !isFinite(dt) || dt <= 0) throw new RangeError('passo(dt): dt precisa ser um número finito maior que 0 (recebeu ' + dt + ')');
      this.scene.jogando = true;   // fronteira pública: testes e replays
      const ctx = this.ctx; ctx.dt = dt;
      ctx.tela = this.renderer ? { largura: this.renderer.largura, altura: this.renderer.altura } : { largura: 800, altura: 450 };
      ctx.input = this.input ? this.input.poll() : SEM_INPUT();
      for (const e of this.scene.query('Transform')) { e.Transform.px = e.Transform.x; e.Transform.py = e.Transform.y; }
      this._emPasso = true;
      try { this._rodarSistemas(dt, ctx); this.events.flush(); this.scene.flush(); }
      finally { this._emPasso = false; }
      if (this._proxima) this._aplicarCena();
      if (this._reiniciar) this._aplicarReinicio();
      if (this._partidaPendente) this._aplicarPartida(this._partidaPendente);
      this.tempo += dt; this.passos++;
    }
    // Scripts escritos no editor ficam na cena (scene.estado.scripts = { nome: { fonte } }) e viram scripts do motor aqui.
    // A fonte declara funções iniciar(e, ctx), atualizar(e, dt, ctx) e/ou um objeto eventos = { colisao(e, d, ctx) {...} }.
    // Erro de sintaxe NÃO derruba nada: o script não é registrado e o erro fica em engine.errosScripts.
    // ATENÇÃO: o código roda com os mesmos poderes da página. Para projetos de terceiros, rode num ambiente isolado.
    compilarScripts() {
      for (const n of this._compilados || []) delete this.scripts[n];
      this._compilados = []; const erros = this.errosScripts = [], fontes = this.scene.estado.scripts;
      if (!fontes || typeof fontes !== 'object') return erros;
      for (const nome in fontes) {
        try {
          if (!C.Variaveis.NOME.test(nome)) throw new Error('nome de script inválido');
          if (this.scripts[nome]) throw new Error('já existe um script com esse nome no código do jogo');
          const f = fontes[nome]; if (!f || typeof f.fonte !== 'string') throw new Error('script sem "fonte" (texto)');
          this.scripts[nome] = new Function(f.fonte + '\n;return { iniciar: typeof iniciar === "function" ? iniciar : undefined, atualizar: typeof atualizar === "function" ? atualizar : undefined, eventos: typeof eventos === "object" && eventos ? eventos : undefined };')();
          this._compilados.push(nome);
        } catch (x) { erros.push({ script: nome, mensagem: String(x && x.message || x) }); if (typeof console !== 'undefined') console.warn('[Core] script "' + nome + '" não foi compilado: ' + (x && x.message || x)); }
      }
      return erros;
    }
    // Aleatório DETERMINÍSTICO (mulberry32): mesma semente (estado.semente, padrão 1) = mesma sequência, então replays e testes são previsíveis.
    // O estado do gerador fica em scene.estado.rng e vai/volta no save.
    aleatorio(min = 0, max = 1) {
      const s = this.scene.estado; let a = (Number.isInteger(s.rng) ? s.rng : Number.isInteger(s.semente) ? s.semente : 1) >>> 0;
      a = (a + 0x6D2B79F5) >>> 0; s.rng = a;
      let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return min + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (max - min);
    }
    // Reinicia o jogo para o estado de quando iniciar() foi chamado (objetos, variáveis, tempo dos scripts). Dentro de um passo, vale no fim dele.
    reiniciar() { if (this._emPasso) this._reiniciar = true; else this._aplicarReinicio(); }
    _aplicarReinicio() {
      this._reiniciar = false; this._limparTempo(); if (!this._inicial || !C.Serializer) return;
      C.Serializer.deJSON(this.scene, JSON.parse(this._inicial)); this.events.fila.length = 0;
    }
    // Salvar/carregar partida: guarda a cena inteira (objetos, variáveis, listas) num espaço nomeado do armazém.
    _espaco(n) { if (typeof n !== 'string' || !/^[A-Za-z0-9_-]{1,30}$/.test(n)) throw new Error('nome de espaço de partida inválido: "' + n + '" (letras, números, _ e -; até 30)'); if (!this.armazem) throw new Error('sem armazém de partidas neste motor'); return 'partida:' + n; }
    salvarPartida(n) {
      const k = this._espaco(n), txt = JSON.stringify({ v: 1, cena: this.scene.estado.cena || null, dados: C.Serializer.paraJSON(this.scene) });
      if (txt.length > 2000000) throw new RangeError('partida grande demais (' + txt.length + ' caracteres; limite 2 milhões)');
      this.armazem.set(k, txt); return true;
    }
    existePartida(n) { return !!(this.armazem && this.armazem.has(this._espaco(n))); }
    apagarPartida(n) { this.armazem.remove(this._espaco(n)); }
    carregarPartida(n) {   // aplicada no fim do quadro (nunca no meio dos sistemas); devolve false se o espaço está vazio ou corrompido
      const txt = this.armazem.get(this._espaco(n)); if (txt === null) return false;
      let d; try { d = JSON.parse(txt); if (!d || d.v !== 1 || !d.dados) return false; } catch (e) { return false; }
      if (this._emPasso) this._partidaPendente = d; else this._aplicarPartida(d); return true;
    }
    _aplicarPartida(d) { this._partidaPendente = null; this._limparTempo(); C.Serializer.deJSON(this.scene, d.dados); this.events.fila.length = 0; this.compilarScripts(); }
    // ctx.escrever(valor): mensagem para o painel Output do editor (e para quem ouvir o evento 'saida')
    escrever(v, nivel) { this.events.emit('saida', { texto: String(v).slice(0, 500), nivel: nivel || 'info', t: this.tempo }); }
    _limparTempo() { if (C.Tempo) C.Tempo.limpar(this); this.scene.efeitos = null; }   // também zera tremor, fade e partículas pendentes (reiniciar, trocar de cena, carregar partida)
    iniciar() {
      if (this.rodando) return; this._limparTempo(); this.observados = {}; this.compilarScripts(); if (C.Serializer) this._inicial = JSON.stringify(C.Serializer.paraJSON(this.scene)); this.rodando = true; const ag = this.agendador; let ultimo = ag.agora();
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
    // Mostra um valor com nome no painel do editor (depuração). Limitado para não crescer sem fim.
    observar(rotulo, valor) { const r = String(rotulo).slice(0, 30); if (!(r in this.observados) && Object.keys(this.observados).length >= 30) return; this.observados[r] = typeof valor === 'number' ? Math.round(valor * 1000) / 1000 : String(valor).slice(0, 60); }
    parar() { this.scene.jogando = false; this.rodando = false; if (this._raf != null) this.agendador.cancelar(this._raf); }
  }
  C.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
