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
    if (e.Tiles !== undefined) {   // mapa de tiles: grade de células; dados[i] = 0 (vazio) ou k (usa paleta[k-1])
      const T = e.Tiles, er = m => new Error('entidade "' + n + '": Tiles ' + m);
      if (T === null || typeof T !== 'object' || Array.isArray(T)) throw er('precisa ser um objeto');
      for (const k of ['tamanho', 'colunas', 'linhas']) if (!Number.isInteger(T[k])) throw er(k + ' precisa ser inteiro');
      if (T.tamanho < 4 || T.tamanho > 256 || T.colunas < 1 || T.colunas > 300 || T.linhas < 1 || T.linhas > 300 || T.colunas * T.linhas > 20000) throw er('fora do limite (tamanho 4–256, até 300×300 e 20000 células)');
      if (!Array.isArray(T.paleta) || T.paleta.length < 1 || T.paleta.length > 32 || !T.paleta.every(p => p && typeof p === 'object' && typeof p.cor === 'string' && p.cor.length <= 40 && (p.imagem === undefined || (typeof p.imagem === 'string' && p.imagem.length <= 40)) && (p.solido === undefined || typeof p.solido === 'boolean'))) throw er('paleta precisa ter de 1 a 32 itens { cor, solido?, imagem? }');
      if (!Array.isArray(T.dados) || T.dados.length !== T.colunas * T.linhas || !T.dados.every(v => Number.isInteger(v) && v >= 0 && v <= T.paleta.length)) throw er('dados precisa ter colunas×linhas inteiros de 0 até o tamanho da paleta');
      if (T.acima !== undefined && typeof T.acima !== 'boolean') throw er('acima precisa ser verdadeiro/falso');
    }
    if (e.Etiquetas !== undefined && !(Array.isArray(e.Etiquetas) && e.Etiquetas.length <= 20 && e.Etiquetas.every(t => typeof t === 'string' && t.length >= 1 && t.length <= 30))) throw new Error('entidade "' + n + '": Etiquetas precisa ser uma lista de até 20 textos (1 a 30 letras)');
    if (e.Pai !== undefined) {
      const P = e.Pai; if (P === null || typeof P !== 'object' || Array.isArray(P) || !Number.isInteger(P.id) || P.id < 0 || P.id === e.id) throw new Error('entidade "' + n + '": Pai precisa ser { id: inteiro de OUTRA entidade, dx, dy }');
      if (P.girar !== undefined && typeof P.girar !== 'boolean') throw new Error('entidade "' + n + '": Pai.girar precisa ser verdadeiro/falso');
      for (const k of ['dx', 'dy', 'rot']) if (P[k] !== undefined && !(typeof P[k] === 'number' && isFinite(P[k]))) throw new Error('entidade "' + n + '": Pai.' + k + ' precisa ser número');
    }
    if (e.Modelo !== undefined && (e.Modelo === null || typeof e.Modelo !== 'object')) throw new Error('entidade "' + n + '": Modelo precisa ser um objeto');
    if (e.Body) {
      const b = e.Body, circ = b.forma === 'circulo' || (!b.forma && b.raio !== undefined);
      if (!e.Transform) throw new Error('entidade "' + n + '": Body precisa de Transform');
      if (b.massa !== undefined) { num(b.massa, n, 'Body.massa'); if (b.massa < 0) throw new Error('entidade "' + n + '": Body.massa não pode ser negativa'); }
      if (b.forma !== undefined && b.forma !== 'circulo' && b.forma !== 'retangulo' && b.forma !== 'poligono') throw new Error('entidade "' + n + '": Body.forma desconhecida: ' + b.forma + ' (use "circulo", "retangulo" ou "poligono")');
      if (b.elasticidade !== undefined) { num(b.elasticidade, n, 'Body.elasticidade'); if (b.elasticidade < 0 || b.elasticidade > 1) throw new Error('entidade "' + n + '": Body.elasticidade precisa estar entre 0 e 1'); }
      if (b.amortecimento !== undefined) { num(b.amortecimento, n, 'Body.amortecimento'); if (b.amortecimento < 0) throw new Error('entidade "' + n + '": Body.amortecimento não pode ser negativo'); }
      if (b.camada !== undefined && typeof b.camada !== 'string') throw new Error('entidade "' + n + '": Body.camada precisa ser texto');
      if (b.colide !== undefined && !(Array.isArray(b.colide) && b.colide.every(x => typeof x === 'string'))) throw new Error('entidade "' + n + '": Body.colide precisa ser uma lista de textos');
      if (b.forma === 'poligono') {
        const P = b.pontos; if (!Array.isArray(P) || P.length < 3 || P.length > 16 || !P.every(q => Array.isArray(q) && q.length === 2 && Number.isFinite(q[0]) && Number.isFinite(q[1]) && Math.abs(q[0]) <= 5000 && Math.abs(q[1]) <= 5000)) throw new Error('entidade "' + n + '": Body.pontos precisa ter de 3 a 16 pontos [x, y]');
        let sinal = 0; for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length], d = P[(i + 2) % P.length], z = (c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0]); if (z !== 0) { if (sinal && Math.sign(z) !== sinal) throw new Error('entidade "' + n + '": Body.pontos precisa formar um polígono convexo (sem reentrâncias)'); sinal = Math.sign(z); } }
        if (!sinal) throw new Error('entidade "' + n + '": Body.pontos não pode ficar numa linha reta');
      }
      else if (circ) { num(b.raio, n, 'Body.raio'); if (b.raio <= 0) throw new Error('entidade "' + n + '": Body.raio precisa ser maior que 0'); }
      else { num(b.w, n, 'Body.w'); num(b.h, n, 'Body.h'); if (b.w <= 0 || b.h <= 0) throw new Error('entidade "' + n + '": Body.w e Body.h precisam ser maiores que 0'); }
    }
  }
  // O ponteiro está sobre a entidade? Usa o Body (círculo/retângulo) ou, sem ele, o Sprite. Sprite.fixo usa a posição na janela.
  C.sobre = function sobre(e, p) {
    if (!e || !e.Transform || !p || p.ativo === false) return false;   // ativo:false = o ponteiro ainda não apareceu na tela
    const S = e.Sprite, B = e.Body, fixo = S && S.fixo, px = fixo ? p.tx : p.x, py = fixo ? p.ty : p.y;
    if (typeof px !== 'number' || typeof py !== 'number') return false;
    let circ = false, r = 0, w = 0, h = 0;
    if (B && B.forma === 'poligono') { const xs = B.pontos.map(q => q[0]), ys = B.pontos.map(q => q[1]); const dx0 = px - e.Transform.x, dy0 = py - e.Transform.y; return dx0 >= Math.min(...xs) && dx0 <= Math.max(...xs) && dy0 >= Math.min(...ys) && dy0 <= Math.max(...ys); }
    if (B) { if (B.forma === 'circulo' || (!B.forma && B.raio !== undefined)) { circ = true; r = B.raio; } else { w = B.w; h = B.h; } }
    else if (S) { if (S.forma === 'circulo' || (S.raio !== undefined && S.w === undefined)) { circ = true; r = S.raio ?? 16; } else { w = S.w ?? 32; h = S.h ?? 32; } }
    else return false;
    const dx = px - e.Transform.x, dy = py - e.Transform.y;
    return circ ? dx * dx + dy * dy <= r * r : Math.abs(dx) <= w / 2 && Math.abs(dy) <= h / 2;
  };
  class Scene {
    constructor() { this.entities = new Map(); this.nextId = 1; this.estado = {}; this.efeitos = null; this._remover = new Set(); this.jogando = false; }
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
    destroy(id) {   // remover um pai remove todos os descendentes
      this._remover.add(id);
      for (let mudou = true; mudou;) { mudou = false; for (const e of this.entities.values()) if (e.Pai && this._remover.has(e.Pai.id) && !this._remover.has(e.id)) { this._remover.add(e.id); mudou = true; } }
    }
    filhos(id) { return [...this.entities.values()].filter(e => e.Pai && e.Pai.id === id); }
    descendeDe(e, ancestral) { let x = e, n = 0; while (x && x.Pai && n++ < 100) { if (x.Pai.id === ancestral.id) return true; x = this.entities.get(x.Pai.id); } return false; }
    // Troca a animação de uma entidade (reinicia só se mudou, ou se reiniciar=true). Falso se a animação não existe.
    animar(e, nome, reiniciar) {
      const a = e && e.Animacao; if (!a || !a.animacoes || !a.animacoes[nome]) return false;
      if (a.atual !== nome || reiniciar) { a.atual = nome; a.tempo = 0; a.quadro = 0; a.terminou = false; a._ult = nome; }
      return true;
    }
    // Torna `filho` filho de `pai` mantendo a posição atual. Recusa ciclos e auto-adoção. Devolve true/false.
    adotar(filho, pai) {
      if (!filho || !pai || filho === pai || this.descendeDe(pai, filho) || !filho.Transform || !pai.Transform) return false;
      filho.Pai = { id: pai.id, dx: filho.Transform.x - pai.Transform.x, dy: filho.Transform.y - pai.Transform.y }; return true;
    }
    soltar(filho) { if (filho && filho.Pai) { delete filho.Pai; return true; } return false; }
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
    clear() { this.entities.clear(); this._remover.clear(); this.nextId = 1; this.estado = {}; this.efeitos = null; this.jogando = false; }
  }
  C.Scene = Scene;
})(typeof window !== 'undefined' ? window : globalThis);
