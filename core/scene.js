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
    if (e.Body) {
      const b = e.Body, circ = b.forma === 'circulo' || (!b.forma && b.raio !== undefined);
      if (!e.Transform) throw new Error('entidade "' + n + '": Body precisa de Transform');
      if (b.massa !== undefined) { num(b.massa, n, 'Body.massa'); if (b.massa < 0) throw new Error('entidade "' + n + '": Body.massa não pode ser negativa'); }
      if (circ) { num(b.raio, n, 'Body.raio'); if (b.raio <= 0) throw new Error('entidade "' + n + '": Body.raio precisa ser maior que 0'); }
      else { num(b.w, n, 'Body.w'); num(b.h, n, 'Body.h'); if (b.w <= 0 || b.h <= 0) throw new Error('entidade "' + n + '": Body.w e Body.h precisam ser maiores que 0'); }
    }
  }
  class Scene {
    constructor() { this.entities = new Map(); this.nextId = 1; this.estado = {}; this._remover = new Set(); }
    create(dados = {}) {
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
    query(...componentes) {
      const r = [];
      for (const e of this.entities.values()) {
        let ok = true;
        for (const c of componentes) if (e[c] === undefined) { ok = false; break; }
        if (ok) r.push(e);
      }
      return r;
    }
    clear() { this.entities.clear(); this._remover.clear(); this.nextId = 1; this.estado = {}; }
  }
  C.Scene = Scene;
})(typeof window !== 'undefined' ? window : globalThis);
