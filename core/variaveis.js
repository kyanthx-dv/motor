/* Core · Variaveis
   Variáveis do jogo (placar, vidas, fase...). Ficam em scene.estado.vars, então entram no save/load sozinhas
   e atravessam a troca de cena. Três tipos: numero, texto, booleano — o tipo é o do valor declarado e não muda.
   Por quê estrito: erro de digitação ("pontso") vira erro claro, não uma variável nova silenciosa.
   Evento 'variavel-mudou' { nome, valor, antes } sai a cada mudança real. */
(function (root) {
  const C = root.Core = root.Core || {};
  const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const tipoDe = v => (typeof v === 'number' && isFinite(v) ? 'numero' : typeof v === 'string' ? 'texto' : typeof v === 'boolean' ? 'booleano' : null);
  class Variaveis {
    constructor(engine) { this.e = engine; }
    get _v() { const s = this.e.scene.estado; return s.vars || (s.vars = {}); }   // sempre lê a cena atual (vale após carregar um save)
    existe(nome) { return Object.prototype.hasOwnProperty.call(this._v, nome); }
    tipo(nome) { return this.existe(nome) ? tipoDe(this._v[nome]) : null; }
    declarar(nome, inicial) {
      if (typeof nome !== 'string' || !NOME.test(nome)) throw new Error('nome de variável inválido: "' + nome + '" (letras, números e _; não começa com número)');
      if (this.existe(nome)) throw new Error('variável já declarada: ' + nome);
      if (!tipoDe(inicial)) throw new Error('valor inicial de "' + nome + '" precisa ser número finito, texto ou verdadeiro/falso');
      this._v[nome] = inicial; this.e.events.emit('variavel-mudou', { nome, valor: inicial, antes: undefined }); return inicial;
    }
    ler(nome) { if (!this.existe(nome)) throw new Error('variável não declarada: ' + nome); return this._v[nome]; }
    definir(nome, valor) {
      const antes = this.ler(nome), t = tipoDe(antes);
      if (tipoDe(valor) !== t) throw new TypeError('variável "' + nome + '" é ' + t + '; valor recebido: ' + valor);
      if (valor !== antes) { this._v[nome] = valor; this.e.events.emit('variavel-mudou', { nome, valor, antes }); }
      return valor;
    }
    somar(nome, n = 1) { if (this.tipo(nome) !== 'numero') throw new TypeError('somar só funciona com variável numérica: ' + nome); return this.definir(nome, this._v[nome] + n); }
    remover(nome) { this.ler(nome); delete this._v[nome]; }
    todas() { return { ...this._v }; }
  }
  Variaveis.NOME = NOME; Variaveis.tipoDe = tipoDe;
  C.Variaveis = Variaveis;
})(typeof window !== 'undefined' ? window : globalThis);
