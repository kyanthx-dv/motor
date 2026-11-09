/* Adaptador · Audio
   Sons curtos por nome via WebAudio. O núcleo não depende deste adaptador. */
(function (root) {
  const C = root.Core = root.Core || {};
  class Audio {
    constructor() {
      this.m = new Map();
      const AC = root.AudioContext || root.webkitAudioContext;
      this.disponivel = typeof AC === 'function';
      this.ctx = null;
      if (this.disponivel) {
        try { this.ctx = new AC(); } catch (x) { this.disponivel = false; }
      }
    }
    carregar(manifesto) {
      if (!this.disponivel || !this.ctx) return Promise.resolve([]);
      const fetcher = root.fetch || (typeof fetch === 'function' && fetch);
      if (typeof fetcher !== 'function') return Promise.reject(new Error('fetch não disponível para carregar áudio'));
      return Promise.all(Object.entries(manifesto || {}).map(async ([nome, url]) => {
        const resposta = await fetcher(url);
        if (resposta && resposta.ok === false) throw new Error('falha ao carregar ' + url);
        const dados = await resposta.arrayBuffer();
        const buffer = await this.ctx.decodeAudioData(dados);
        this.m.set(nome, buffer);
        return buffer;
      }));
    }
    tocar(nome, opcoes) {
      if (!this.disponivel || !this.ctx) return null;
      const buffer = this.m.get(nome); if (!buffer) return null;
      const source = this.ctx.createBufferSource(); source.buffer = buffer;
      const gain = this.ctx.createGain();
      const volume = opcoes && Number.isFinite(opcoes.volume) ? opcoes.volume : 1;
      gain.gain.value = Math.max(0, Math.min(1, volume));
      source.connect(gain); gain.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(() => {});
      source.start(0);
      return source;
    }
  }
  C.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
