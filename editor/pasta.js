/* Editor · projeto em PASTA (estilo Godot). Formato 2:
     projeto.json            { formato:2, nome, cenaAtual, cenas:["principal", ...] }
     cenas/<nome>.json       cena sem imagens/sons embutidos (estado.imagens/sons guardam caminhos "assets/...")
     assets/imagens/*.png    assets/sons/*.ogg
   Salvar/abrir: pasta de verdade (File System Access API, Chrome/Edge/Android) ou ZIP (qualquer navegador).
   As funções de formato (empacotar/desempacotar/zip) não dependem da tela. */
(function (root) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/aac': 'aac' };
  const MIME = {}; for (const [m, e] of Object.entries(EXT)) if (!MIME[e]) MIME[e] = m;
  const seguro = n => String(n).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'x';
  function dataParaBytes(url) { const i = url.indexOf(','), bin = atob(url.slice(i + 1)), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return { mime: url.slice(5, url.indexOf(';')), bytes: u }; }
  function bytesParaData(bytes, mime) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return 'data:' + mime + ';base64,' + btoa(s); }

  // pacote = { cena, cenas:{ atual, cenas:{nome:json} } }  →  { 'caminho': Uint8Array }
  function empacotar(pacote, nome) {
    const arq = {}, usados = {}, porDado = new Map(), cenas = pacote.cenas.cenas, nomes = Object.keys(cenas);
    const guardar = (tipo, n, url) => {
      if (porDado.has(url)) return porDado.get(url);
      const { mime, bytes } = dataParaBytes(url), ext = EXT[mime] || 'bin'; let base = seguro(n), k = base, i = 2;
      while (usados[tipo + '/' + k]) k = base + '_' + i++;
      usados[tipo + '/' + k] = 1; const cam = 'assets/' + tipo + '/' + k + '.' + ext; arq[cam] = bytes; porDado.set(url, cam); return cam;
    };
    for (const cn of nomes) {
      const c = JSON.parse(JSON.stringify(cn === pacote.cenas.atual ? pacote.cena : cenas[cn])), st = c.estado || (c.estado = {});
      for (const [campo, tipo] of [['imagens', 'imagens'], ['sons', 'sons']]) if (st[campo]) for (const n of Object.keys(st[campo])) st[campo][n] = guardar(tipo, n, st[campo][n]);
      arq['cenas/' + seguro(cn) + '.json'] = enc.encode(JSON.stringify(c, null, 2));
    }
    arq['projeto.json'] = enc.encode(JSON.stringify({ formato: 2, nome: nome || 'projeto', cenaAtual: pacote.cenas.atual, cenas: nomes.map(n => ({ nome: n, arquivo: 'cenas/' + seguro(n) + '.json' })) }, null, 2));
    return arq;
  }
  // { 'caminho': Uint8Array }  →  { nome, cena, cenas:{atual,cenas} }
  function desempacotar(arq) {
    const lerJson = c => { if (!arq[c]) throw new Error('faltou o arquivo ' + c); return JSON.parse(dec.decode(arq[c])); };
    const proj = lerJson('projeto.json'); if (!proj || proj.formato !== 2 || !Array.isArray(proj.cenas) || !proj.cenas.length) throw new Error('projeto.json inválido (formato 2)');
    const cache = new Map(), embutir = cam => { if (typeof cam !== 'string' || cam.startsWith('data:')) return cam; if (!/^assets\/(imagens|sons)\/[A-Za-z0-9_.-]+$/.test(cam) || !arq[cam]) throw new Error('asset ausente ou caminho inválido: ' + cam); if (!cache.has(cam)) cache.set(cam, bytesParaData(arq[cam], MIME[cam.split('.').pop().toLowerCase()] || 'application/octet-stream')); return cache.get(cam); };
    const cenas = {}; for (const c of proj.cenas) { if (!/^cenas\/[A-Za-z0-9_-]+\.json$/.test(c.arquivo)) throw new Error('caminho de cena inválido'); const j = lerJson(c.arquivo), st = j.estado || {}; for (const campo of ['imagens', 'sons']) if (st[campo]) for (const n of Object.keys(st[campo])) st[campo][n] = embutir(st[campo][n]); cenas[c.nome] = j; }
    const atual = cenas[proj.cenaAtual] ? proj.cenaAtual : Object.keys(cenas)[0];
    return { nome: proj.nome || 'projeto', cena: cenas[atual], cenas: { atual, cenas } };
  }

  // ---- ZIP mínimo (gravação sem compressão; leitura sem compressão ou deflate) ----
  const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc = b => { let c = ~0; for (let i = 0; i < b.length; i++) c = TAB[(c ^ b[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };
  function zipar(arq) {
    const partes = [], central = []; let pos = 0; const u16 = (v, a) => { a.push(v & 255, v >>> 8 & 255); }, u32 = (v, a) => { a.push(v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255); };
    for (const [nome, dados] of Object.entries(arq)) {
      const n = enc.encode(nome), c = crc(dados), h = []; u32(0x04034b50, h); u16(20, h); u16(0x0800, h); u16(0, h); u16(0, h); u16(0x21, h); u32(c, h); u32(dados.length, h); u32(dados.length, h); u16(n.length, h); u16(0, h);
      const cd = []; u32(0x02014b50, cd); u16(20, cd); u16(20, cd); u16(0x0800, cd); u16(0, cd); u16(0, cd); u16(0x21, cd); u32(c, cd); u32(dados.length, cd); u32(dados.length, cd); u16(n.length, cd); u16(0, cd); u16(0, cd); u16(0, cd); u16(0, cd); u32(0, cd); u32(pos, cd);
      partes.push(new Uint8Array(h), n, dados); central.push(new Uint8Array(cd), n); pos += h.length + n.length + dados.length;
    }
    const tam = central.reduce((s, x) => s + x.length, 0), fim = []; u32(0x06054b50, fim); u16(0, fim); u16(0, fim); u16(Object.keys(arq).length, fim); u16(Object.keys(arq).length, fim); u32(tam, fim); u32(pos, fim); u16(0, fim);
    return new Blob([...partes, ...central, new Uint8Array(fim)], { type: 'application/zip' });
  }
  async function deszipar(buffer) {
    const b = new Uint8Array(buffer), v = new DataView(buffer), arq = {}; let e = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65600); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('não é um ZIP'); const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
    if (n > 600) throw new Error('ZIP com arquivos demais');
    for (let k = 0; k < n; k++) {
      if (v.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP corrompido');
      const met = v.getUint16(p + 10, true), tc = v.getUint32(p + 20, true), tu = v.getUint32(p + 24, true), ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
      const nome = dec.decode(b.subarray(p + 46, p + 46 + ln)); p += 46 + ln + le + lc;
      if (nome.endsWith('/')) continue; if (tu > 8e6) throw new Error('arquivo grande demais no ZIP: ' + nome);
      const ini = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true), cru = b.subarray(ini, ini + tc);
      if (met === 0) arq[nome] = cru.slice();
      else if (met === 8 && typeof DecompressionStream === 'function') arq[nome] = new Uint8Array(await new Response(new Blob([cru]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else throw new Error('ZIP com compressão não suportada: ' + nome);
    }
    return arq;
  }

  // ---- pasta de verdade (File System Access API) ----
  async function gravarPasta(dir, arq) {
    for (const [cam, dados] of Object.entries(arq)) { const ps = cam.split('/'); let d = dir; for (const p of ps.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: true }); const f = await (await d.getFileHandle(ps[ps.length - 1], { create: true })).createWritable(); await f.write(dados); await f.close(); }
  }
  async function lerPasta(dir, pref = '', arq = {}) {
    for await (const [nome, h] of dir.entries()) { if (h.kind === 'directory') { if (!/^(cenas|assets|imagens|sons)$/.test(nome)) continue; await lerPasta(h, pref + nome + '/', arq); } else if (/^(projeto\.json|.*\.(json|png|jpg|jpeg|webp|gif|mp3|ogg|wav|webm|m4a|aac))$/i.test(nome)) arq[pref + nome] = new Uint8Array(await (await h.getFile()).arrayBuffer()); }
    return arq;
  }
  // Abre um projeto publicado por URL (pasta com projeto.json). Busca cenas e só os assets que elas citam.
  async function lerUrl(base) {
    base = base.replace(/\/?$/, '/'); const get = async c => { const r = await fetch(base + c); if (!r.ok) throw new Error('não achei ' + c + ' (' + r.status + ')'); return new Uint8Array(await r.arrayBuffer()); };
    const arq = { 'projeto.json': await get('projeto.json') }, proj = JSON.parse(dec.decode(arq['projeto.json']));
    for (const c of proj.cenas || []) { if (!/^cenas\/[A-Za-z0-9_-]+\.json$/.test(c.arquivo)) throw new Error('caminho de cena inválido'); arq[c.arquivo] = await get(c.arquivo); const st = (JSON.parse(dec.decode(arq[c.arquivo])).estado) || {}; for (const campo of ['imagens', 'sons']) for (const cam of Object.values(st[campo] || {})) if (typeof cam === 'string' && !cam.startsWith('data:') && !arq[cam] && /^assets\/(imagens|sons)\/[A-Za-z0-9_.-]+$/.test(cam)) arq[cam] = await get(cam); }
    return arq;
  }
  root.PastaProjeto = { lerUrl, empacotar, desempacotar, zipar, deszipar, gravarPasta, lerPasta };

  // ---- interface (só quando o editor existe) ----
  const ed = root.editor, $ = id => document.getElementById(id); if (!ed || !$('pasta-salvar')) return;
  let handle = null; const msg = (t, tipo) => { const m = $('pasta-msg'); m.textContent = t; m.className = 'msg ' + (tipo || ''); };
  const nomeProj = () => ed.projetoAtual || 'projeto';
  const qs = new URLSearchParams(location.search).get('projeto');
  if (qs && /^[A-Za-z0-9_./-]+$/.test(qs) && !qs.includes('..' + '/..')) lerUrl(qs).then(a => abrirPacote(desempacotar(a))).then(() => msg('Projeto "' + qs + '" aberto.', 'ok')).catch(x => msg('Não abriu ' + qs + ': ' + x.message, 'erro'));
  const abrirPacote = p => { ed.importarProjeto(p.nome + ' (pasta)', JSON.parse(JSON.stringify(p.cena)), JSON.parse(JSON.stringify(p.cenas))); };
  $('pasta-salvar').addEventListener('click', async () => {
    try {
      const arq = empacotar(root.EditorArquivos.exportar(), nomeProj());
      if (!root.showDirectoryPicker) { msg('Este navegador não grava pasta direto: use "Baixar ZIP".', 'erro'); return; }
      if (!handle) handle = await root.showDirectoryPicker({ mode: 'readwrite' });
      await gravarPasta(handle, arq); msg('Salvo na pasta "' + handle.name + '" (' + Object.keys(arq).length + ' arquivos).', 'ok');
    } catch (x) { if (x.name !== 'AbortError') msg('Não salvou: ' + x.message, 'erro'); }
  });
  // salvamento automático: com uma pasta aberta, grava quando o projeto muda (checa a cada 1,5 s, nunca durante o Play)
  let ultimo = null, gravando = false;
  setInterval(async () => {
    if (!handle || gravando || ed.engine.rodando) return;
    try { const pac = root.EditorArquivos.exportar(), txt = JSON.stringify(pac); if (txt === ultimo) return; gravando = true; await gravarPasta(handle, empacotar(pac, nomeProj())); ultimo = txt; msg('Salvo automaticamente na pasta "' + handle.name + '".', 'ok'); }
    catch (x) { handle = null; msg('Parei o salvamento automático: ' + x.message, 'erro'); } finally { gravando = false; }
  }, 1500);
  $('pasta-abrir').addEventListener('click', async () => {
    try {
      if (!root.showDirectoryPicker) { msg('Este navegador não abre pasta direto: use "Abrir ZIP".', 'erro'); return; }
      const d = await root.showDirectoryPicker({ mode: 'readwrite' }); const p = desempacotar(await lerPasta(d)); handle = d; ultimo = null; abrirPacote(p); msg('Aberto da pasta "' + d.name + '".', 'ok');
    } catch (x) { if (x.name !== 'AbortError') msg('Não abriu: ' + x.message, 'erro'); }
  });
  $('zip-baixar').addEventListener('click', () => { try { const blob = zipar(empacotar(root.EditorArquivos.exportar(), nomeProj())), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomeProj() + '.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 0); msg('ZIP gerado.', 'ok'); } catch (x) { msg('Não gerou o ZIP: ' + x.message, 'erro'); } });
  $('zip-abrir').addEventListener('click', () => $('zip-arquivo').click());
  $('zip-arquivo').addEventListener('change', async ev => { const f = ev.target.files && ev.target.files[0]; ev.target.value = ''; if (!f) return; try { abrirPacote(desempacotar(await deszipar(await f.arrayBuffer()))); msg('ZIP aberto.', 'ok'); } catch (x) { msg('ZIP inválido: ' + x.message, 'erro'); } });
})(window);
