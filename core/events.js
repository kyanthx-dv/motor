/* Core · Events
   Fila de mensagens entre sistemas. emit() só enfileira; flush() entrega no fim do passo.
   Por quê: entregar no fim do passo deixa a ordem previsível (importante para replay e depuração). */
(function (root) {
  const C = root.Core = root.Core || {};
  class Events {
    constructor() { this.h = new Map(); this.fila = []; }
    on(nome, fn) {
      if (!this.h.has(nome)) this.h.set(nome, []);
      this.h.get(nome).push(fn);
      return () => this.off(nome, fn);
    }
    off(nome, fn) { const l = this.h.get(nome); if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
    emit(nome, dados) { this.fila.push([nome, dados]); }
    // Handlers recebem (dados, nome). O nome '*' recebe tudo.
    flush() {
      let voltas = 0;                                  // trava contra eventos que geram eventos sem fim
      while (this.fila.length && voltas++ < 100) {
        const lote = this.fila; this.fila = [];
        for (const [nome, dados] of lote) {
          for (const fn of (this.h.get(nome) || []).slice()) fn(dados, nome);
          for (const fn of (this.h.get('*') || []).slice()) fn(dados, nome);
        }
      }
      this.fila.length = 0;
    }
    limpar() { this.h.clear(); this.fila.length = 0; }
  }
  C.Events = Events;
})(typeof window !== 'undefined' ? window : globalThis);
