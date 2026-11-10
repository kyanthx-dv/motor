/* Core · Scene
   Guarda as entidades. Uma entidade é um objeto simples: { id, nome, Transform:{...}, Body:{...} }.
   Componentes são dados puros (por isso a cena inteira vira JSON sem esforço). */
(function (root) {
  const C = root.Core = root.Core || {};
  const clone = v => JSON.parse(JSON.stringify(v));
  const num = (v, n, c) => { if (typeof v !== 'number' || !isFinite(v)) throw new Error('entidade "' + n + '": ' + c + ' precisa ser um número válido'); };
  // Falha cedo, na criação, com mensagem clara (em vez de NaN dentro do loop do jogo).
  function validar(e) {
    const n = e.nome || e.id;
    if (e.Transform) { num(e.Transform.x, n, 'Transform.x'); num(e.Transform.y, n, 'Transform.y'); }
    if (e.Velocity) { num(e.Velocity.vx, n, 'Velocity.vx'); num(e.Velocity.vy, n, 'Velocity.vy'); }
    if (e.Controller) for (const k of ['aceleracao', 'velMax']) if (e.Controller[k] !== undefined) { num(e.Controller[k], n, 'Controller.' + k); if (e.Controller[k] <= 0) throw new Error('entidade "' + n + '": Controller.' + k + ' precisa ser maior que 0'); }
    if (e.Animacao && e.Animacao.animacoes) for (const nome in e.Animacao.animacoes) {
      const d = e.Animacao.animacoes[nome];
      if (!d || !Number.isInteger(d.quadros) || d.quadros < 1) throw new Error('entidade "' + n + '": Animacao "' + nome + '": quadros precisa ser inteiro >= 1');
      if (d.fps !== undefined) { num(d.fps, n, 'Animacao.' + nome + '.fps'); if (d.fps <= 0) throw new Error('entidade "' + n + '": Animacao "' + nome + '": fps precisa ser maior que 0'); }
    }
    if (e.Attr !== undefined) {
      if (e.Attr === null || typeof e.Attr !== 'object' || Array.isArray(e.Attr)) throw new Error('entidade "' + n + '": Attr precisa ser um objeto');
      const ks = Object.keys(e.Attr); if (ks.length > 50) throw new Error('entidade "' + n + '": Attr aceita até 50 atributos');
      for (const k of ks) {
        const v = e.Attr[k];
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw new Error('entidade "' + n + '": nome de atributo inválido: ' + k);
        if (!((typeof v === 'number' && isFinite(v)) || typeof v === 'boolean' || (typeof v === 'string' && v.length <= 200))) throw new Error('entidade "' + n + '": Attr.' + k + ' precisa ser número, texto (até 200) ou verdadeiro/falso');
      }
    }
    if (e.Etiquetas !== undefined && !(Array.isArray(e.Etiquetas) && e.Etiquetas.length <= 20 && e.Etiquetas.every(t => typeof t === 'string' && t.length >= 1 && t.length <= 30))) throw new Error('entidade "' + n + '": Etiquetas precisa ser uma lista de até 20 textos (1 a 30 letras)');
    if (e.Modelo !== undefined && (e.Modelo === null || typeof e.Modelo !== 'object')) throw new Error('entidade "' + n + '": Modelo precisa ser um objeto');
    if (e.Body) {
      const b = e.Body, circ = b.forma === 'circulo' || (!b.forma && b.raio !== undefined);
      if (!e.Transform) throw new Error('entidade "' + n + '": Body precisa de Transform');
      if (b.massa !== undefined) { num(b.massa, n, 'Body.massa'); if (b.massa < 0) throw new Error('entidade "' + n + '": Body.massa não pode ser negativa'); }
      if (b.forma !== undefined && b.forma !== 'circulo' && b.forma !== 'retangulo') throw new Error('entidade "' + n + '": Body.forma desconhecida: ' + b.forma + ' (use "circulo" ou "retangulo")');
      if (b.elasticidade !== undefined) { num(b.elasticidade, n, 'Body.elasticidade'); if (b.elasticidade < 0 || b.elasticidade > 1) throw new Error('entidade "' + n + '": Body.elasticidade precisa estar entre 0 e 1'); }
      if (b.amortecimento !== undefined) { num(b.amortecimento, n, 'Body.amortecimento'); if (b.amortecimento < 0) throw new Error('entidade "' + n + '": Body.amortecimento não pode ser negativo'); }
      if (b.camada !== undefined && typeof b.camada !== 'string') throw new Error('entidade "' + n + '": Body.camada precisa ser texto');
      if (b.colide !== undefined && !(Array.isArray(b.colide) && b.colide.every(x => typeof x === 'string'))) throw new Error('entidade "' + n + '": Body.colide precisa ser uma lista de textos');
      if (circ) { num(b.raio, n, 'Body.raio'); if (b.raio <= 0) throw new Error('entidade "' + n + '": Body.raio precisa ser maior que 0'); }
      else { num(b.w, n, 'Body.w'); num(b.h, n, 'Body.h'); if (b.w <= 0 || b.h <= 0) throw new Error('entidade "' + n + '": Body.w e Body.h precisam ser maiores que 0'); }
    }
  }
  class Scene {
    constructor() { this.entities = new Map(); this.nextId = 1; this.estado = {}; this._remover = new Set(); this.jogando = false; }
    create(dados = {}) {
      if (dados === null || typeof dados !== 'object') throw new Error('create precisa de um objeto');
      if (dados.id != null && (!Number.isInteger(dados.id) || dados.id < 0)) throw new Error('id de entidade precisa ser um inteiro >= 0: ' + dados.id);
      const id = dados.id != null ? dados.id : this.nextId++;
      if (this.entities.has(id)) throw new Error('id de entidade duplicado: ' + id);
      if (id >= this.nextId) this.nextId = id + 1;
      const e = { id, nome: dados.nome || '' };
      for (const k in dados) if (k !== 'id' && k !== 'nome') e[k] = clone(dados[k]);
      validar(e);
      this.entities.set(id, e);
      return e;
    }
    get(id) { return this.entities.get(id); }
    find(nome) { for (const e of this.entities.values()) if (e.nome === nome) return e; return null; }
    findAll(nome) { return [...this.entities.values()].filter(e => e.nome === nome); }
    // Marca para remover no fim do passo (remover no meio quebraria os laços dos sistemas).
    destroy(id) { this._remover.add(id); }
    flush() { for (const id of this._remover) this.entities.delete(id); this._remover.clear(); }
    // Cria uma cópia de uma entidade (usada com objetos "Modelo"): sem id, sem a marca Modelo, na posição pedida.
    clonar(origem, ajustes = {}) {
      const src = typeof origem === 'number' ? this.get(origem) : origem;
      if (!src) throw new Error('clonar: objeto de origem não existe');
      const c = clone(src); delete c.id; delete c.Modelo;
      if (c.Transform) { if (ajustes.x !== undefined) c.Transform.x = ajustes.x; if (ajustes.y !== undefined) c.Transform.y = ajustes.y; }
      return this.create(c);
    }
    query(...componentes) {
      const r = [];
      for (const e of this.entities.values()) {
        if (this.jogando && e.Modelo !== undefined) continue;   // modelos não existem durante o jogo, só servem de molde
        let ok = true;
        for (const c of componentes) if (e[c] === undefined) { ok = false; break; }
        if (ok) r.push(e);
      }
      return r;
    }
    clear() { this.entities.clear(); this._remover.clear(); this.nextId = 1; this.estado = {}; this.jogando = false; }
  }
  C.Scene = Scene;
})(typeof window !== 'undefined' ? window : globalThis);
