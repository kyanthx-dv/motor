/* Core · Events
   Fila de mensagens entre sistemas. emit() só enfileira; flush() entrega no fim do passo.
   Por quê: entregar no fim do passo deixa a ordem previsível (importante para replay e depuração). */
(function (root) {
  const C = root.Core = root.Core || {};
  class Events {
    constructor() { this.h = new Map(); this.fila = []; this.maxRodadas = 100; this.descartados = 0; this.aoDescartar = null; }
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
      while (this.fila.length && voltas++ < this.maxRodadas) {
        const lote = this.fila; this.fila = [];
        for (const [nome, dados] of lote) {
          for (const fn of (this.h.get(nome) || []).slice()) fn(dados, nome);
          for (const fn of (this.h.get('*') || []).slice()) fn(dados, nome);
        }
      }
      if (this.fila.length) {                          // passou do limite: descarta, mas deixa registro (nada some em silêncio)
        this.descartados += this.fila.length; this.fila.length = 0;
        if (this.aoDescartar) this.aoDescartar(this.descartados);
        else if (!this._avisou && typeof console !== 'undefined') { this._avisou = true; console.warn('Core.Events: cascata de eventos passou de ' + this.maxRodadas + ' rodadas; eventos descartados'); }
      }
    }
        limpar() { this.h.clear(); this.fila.length = 0; }
  }
  C.Events = Events;
})(typeof window !== 'undefined' ? window : globalThis);
