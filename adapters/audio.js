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
    // Bipe sintetizado (sem arquivo): útil para feedback rápido. Valores são limitados a faixas seguras.
    bipe(freq = 440, dur = 0.15, vol = 0.2, tipo = 'square') {
      if (!this.disponivel || !this.ctx || !Number.isFinite(freq) || !Number.isFinite(dur)) return null;
      freq = Math.max(20, Math.min(20000, freq)); dur = Math.max(0.02, Math.min(2, dur)); vol = Math.max(0, Math.min(1, Number.isFinite(vol) ? vol : 0.2));
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime || 0;
      o.type = tipo; o.frequency.value = freq; g.gain.value = vol;
      if (g.gain.setValueAtTime) { g.gain.setValueAtTime(vol, t); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
      o.connect(g); g.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume().catch(() => {});
      o.start(t); o.stop(t + dur); return o;
    }
    // Efeitos prontos, gerados por código (sem arquivos): bip, moeda, pulo, acerto, explosao.
    efeito(nome) {
      if (!this.disponivel || !this.ctx || !Audio.EFEITOS[nome]) return false;
      const c = this.ctx; if (c.state === 'suspended' && c.resume) c.resume().catch(() => {});
      let t = c.currentTime || 0;
      for (const p of Audio.EFEITOS[nome]) {
        const g = c.createGain(); g.connect(c.destination); g.gain.setValueAtTime(p.vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
        if (p.ruido) { const n = Math.max(1, Math.floor(c.sampleRate * p.dur)), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const s = c.createBufferSource(); s.buffer = b; s.connect(g); s.start(t); s.stop(t + p.dur); }
        else { const o = c.createOscillator(); o.type = p.onda || 'square'; o.frequency.setValueAtTime(p.de, t); if (p.para) o.frequency.exponentialRampToValueAtTime(p.para, t + p.dur); o.connect(g); o.start(t); o.stop(t + p.dur); }
        t += p.dur * (p.seq ? 1 : 0);
      }
      return true;
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
  Audio.EFEITOS = {
    bip: [{ de: 880, dur: 0.08 }],
    moeda: [{ de: 988, dur: 0.07, seq: 1 }, { de: 1319, dur: 0.18 }],
    pulo: [{ de: 280, para: 720, dur: 0.16, onda: 'sine', vol: 0.2 }],
    acerto: [{ de: 220, para: 90, dur: 0.14, onda: 'triangle', vol: 0.25 }],
    explosao: [{ ruido: true, dur: 0.35, vol: 0.3 }]
  };
  C.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
