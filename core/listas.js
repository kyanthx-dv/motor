/* Core · Listas
   Listas de valores (inventário, falas, fila): scene.estado.listas = { nome: [valores] }. Entram no save, atravessam a troca de cena
   e voltam ao reiniciar. Itens: número finito, texto (até 200 caracteres) ou verdadeiro/falso. Até 50 listas com 1000 itens.
   Índices do núcleo começam em 0 (os blocos mostram 1, 2, 3…). Leituras são tolerantes (lista/posição inexistente → undefined);
   escritas fora do limite lançam erro claro. */
(function (root) {
  const C = root.Core = root.Core || {};
  const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/, MAX_LISTAS = 50, MAX_ITENS = 1000;
  const itemOk = v => (typeof v === 'number' && isFinite(v)) || typeof v === 'boolean' || (typeof v === 'string' && v.length <= 200);
  class Listas {
    constructor(engine) { this.e = engine; }
    get _l() { const s = this.e.scene.estado; return s.listas || (s.listas = {}); }
    existe(nome) { return Object.prototype.hasOwnProperty.call(this._l, nome); }
    garantir(nome) {
      if (typeof nome !== 'string' || !NOME.test(nome)) throw new Error('nome de lista inválido: "' + nome + '" (letras, números e _; não começa com número)');
      if (!this.existe(nome)) { if (Object.keys(this._l).length >= MAX_LISTAS) throw new RangeError('limite de ' + MAX_LISTAS + ' listas'); this._l[nome] = []; }
      return this._l[nome];
    }
    nomes() { return Object.keys(this._l); }
    tamanho(nome) { return this.existe(nome) ? this._l[nome].length : 0; }
    item(nome, i) { return this.existe(nome) && Number.isInteger(i) ? this._l[nome][i] : undefined; }
    todos(nome) { return this.existe(nome) ? this._l[nome].slice() : []; }
    contem(nome, v) { return this.existe(nome) && this._l[nome].includes(v); }
    aleatorio(nome) { const l = this._l[nome]; return l && l.length ? l[Math.floor(this.e.aleatorio(0, l.length - 1e-9))] : undefined; }
    adicionar(nome, v) {
      if (!itemOk(v)) throw new TypeError('item da lista "' + nome + '" precisa ser número finito, texto (até 200) ou verdadeiro/falso');
      const l = this.garantir(nome); if (l.length >= MAX_ITENS) throw new RangeError('lista "' + nome + '" cheia (limite ' + MAX_ITENS + ')'); l.push(v); return l.length;
    }
    definir(nome, i, v) {
      if (!itemOk(v)) throw new TypeError('item da lista "' + nome + '" inválido');
      if (!Number.isInteger(i) || i < 0 || i >= this.tamanho(nome)) throw new RangeError('posição ' + i + ' fora da lista "' + nome + '"');
      this._l[nome][i] = v;
    }
    remover(nome, i) {
      if (!Number.isInteger(i) || i < 0 || i >= this.tamanho(nome)) throw new RangeError('posição ' + i + ' fora da lista "' + nome + '"');
      return this._l[nome].splice(i, 1)[0];
    }
    limpar(nome) { if (this.existe(nome)) this._l[nome].length = 0; }
  }
  Listas.NOME = NOME; Listas.itemOk = itemOk; Listas.MAX_LISTAS = MAX_LISTAS; Listas.MAX_ITENS = MAX_ITENS;
  C.Listas = Listas;
})(typeof window !== 'undefined' ? window : globalThis);
