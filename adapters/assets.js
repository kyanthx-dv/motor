/* Adaptador · Assets
   Imagens por nome. carregar({nome:url}) devolve uma promessa. registrar(nome, canvas|imagem) aceita
   imagens geradas por código (útil para testes e protótipos sem arquivos). */
(function (root) {
  const C = root.Core = root.Core || {};
  class Assets {
    constructor() { this.m = new Map(); }
    registrar(nome, img) { this.m.set(nome, img); return this; }
    get(nome) { return this.m.get(nome); }
    carregar(manifesto) {
      return Promise.all(Object.entries(manifesto).map(([nome, url]) => new Promise((ok, erro) => {
        const i = new Image(); i.onload = () => { this.m.set(nome, i); ok(); }; i.onerror = () => erro(new Error('falha ao carregar ' + url)); i.src = url;
      })));
    }
  }
  C.Assets = Assets;
})(typeof window !== 'undefined' ? window : globalThis);
