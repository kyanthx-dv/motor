/* Core · Scene
   Guarda as entidades. Uma entidade é um objeto simples: { id, nome, Transform:{...}, Body:{...} }.
   Componentes são dados puros (por isso a cena inteira vira JSON sem esforço). */
(function (root) {
  const C = root.Core = root.Core || {};
  const clone = v => JSON.parse(JSON.stringify(v));
  class Scene {
    constructor() { this.entities = new Map(); this.nextId = 1; this.estado = {}; this._remover = new Set(); }
    create(dados = {}) {
      const id = dados.id != null ? dados.id : this.nextId++;
      if (id >= this.nextId) this.nextId = id + 1;
      const e = { id, nome: dados.nome || '' };
      for (const k in dados) if (k !== 'id' && k !== 'nome') e[k] = clone(dados[k]);
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
