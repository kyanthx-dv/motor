/* Editor · exportar jogo: gera UM arquivo .html (núcleo + adaptadores + player + o projeto inteiro) que roda sozinho em qualquer
   navegador, inclusive no celular. Só Canvas 2D (o WebGL/PixiJS não vai junto, para o arquivo ficar pequeno). */
(function (root) {
  const ed = root.editor, $ = id => document.getElementById(id);
  const EXCLUIR = /pixi|debug|vendor|worker-host|player|social/;
  const seguro = t => t.replace(/<\/script/gi, '<\\/script');
  // Ajustes de exportação: vêm de estado.exportar da cena aberta (ou da primeira cena que tiver).
  const cfgDe = pac => { const L = C => C.ExportarCfg.limpar, c = root.Core; const cs = [pac.cena, ...Object.values((pac.cenas && pac.cenas.cenas) || {})].map(x => x && x.estado && x.estado.exportar).filter(Boolean); return c.ExportarCfg.limpar(cs[0]); };
  // O Matter.js só vai junto no jogo exportado se algum objeto usa Corpo (o arquivo tem ~80 KB).
  const usaMatter = pac => [pac.cena, ...Object.values((pac.cenas && pac.cenas.cenas) || {})].some(c => c && (c.entidades || []).some(e => e && e.Corpo));
  const lerMatter = async () => '/* matter.min.js */\n' + await (await fetch('../adapters/vendor/matter.min.js')).text();
  // Ícone próprio: PNG quadrado (recorta no centro) redimensionado para n×n; devolve bytes PNG
  const redimensionar = (src, n) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), l = Math.min(i.width, i.height); g.imageSmoothingQuality = 'high'; g.drawImage(i, (i.width - l) / 2, (i.height - l) / 2, l, l, 0, 0, n, n); c.toBlob(b => b ? b.arrayBuffer().then(a => ok(new Uint8Array(a))) : erro(new Error('ícone inválido')), 'image/png'); }; i.onerror = () => erro(new Error('não consegui abrir o ícone')); i.src = src; });
  root.EditorExportarIcone = { redimensionar };
  const iconeDados = async src => { const b = await redimensionar(src, 192); let s = ''; for (let k = 0; k < b.length; k++) s += String.fromCharCode(b[k]); return 'data:image/png;base64,' + btoa(s); };
  const ORI = { qualquer: 'any', paisagem: 'landscape', retrato: 'portrait' };
  async function gerar() {
    const urls = [...document.scripts].map(s => s.getAttribute('src') || '').filter(s => /^\.\.\/(core|adapters)\//.test(s) && !EXCLUIR.test(s)); urls.push('../adapters/worker-host.js', '../adapters/player.js');
    const codigos = []; for (const u of urls) { const r = await fetch(u); if (!r.ok) throw new Error('não consegui ler ' + u + ' (' + r.status + ')'); codigos.push('/* ' + u.replace('../', '') + ' */\n' + await r.text()); }
    const pac = root.EditorArquivos.exportar(), cenas = Object.assign({}, pac.cenas.cenas); cenas[pac.cenas.atual] = pac.cena;
    const nome = (ed.projetoAtual || 'jogo').replace(/\s*\(pasta\)$/, ''), cfg = cfgDe(pac), mt = usaMatter(pac) ? await lerMatter() : null, jogo = { nome, atual: pac.cenas.atual, cenas, versao: root.Core.VERSAO, exportar: cfg };
    const dados = JSON.stringify(jogo).replace(/</g, '\\u003c').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
    const esc = (cfg.nomeApp || nome).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
    if (mt) codigos.unshift(mt);
    return '<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"><title>' + esc + '</title>' + (cfg.icone ? '<link rel="icon" href="' + await iconeDados(cfg.icone) + '">' : '') + '\n<style>html,body{margin:0;height:100%;background:' + (cfg.corFundo || '#000') + ';overflow:hidden;touch-action:none}</style></head><body>\n' +
      '<script>/* Jogo exportado com o Motor v' + root.Core.VERSAO + '. O motor roda num Web Worker; o código dele fica no bloco de texto abaixo. */</script>\n<script type="text/plain" id="motor-codigo">\n' + seguro(codigos.join('\n;\n')) + '\n</script>\n<script>\n(0, Function)(document.getElementById("motor-codigo").textContent)();\nCore.Player.iniciar(' + dados + ').catch(function (e) { document.body.textContent = "Não foi possível iniciar o jogo: " + e.message; });\n</script>\n'+'</body></html>\n';
  }
  // Exportar como PASTA/ZIP: index.html + motor.js + projeto.json/cenas/assets (arquivos separados, sem limite de data-URL) + PWA. Precisa de http(s).
  async function gerarPasta() {
    const urls = [...document.scripts].map(x => x.getAttribute('src') || '').filter(x => /^\.\.\/(core|adapters)\//.test(x) && !EXCLUIR.test(x)); urls.push('../adapters/worker-host.js', '../adapters/pixi-renderer.js', '../adapters/player.js');
    const lerT = async u => { const r = await fetch(u); if (!r.ok) throw new Error('não consegui ler ' + u + ' (' + r.status + ')'); return r; };
    const cod = []; for (const u of urls) cod.push('/* ' + u.replace('../', '') + ' */\n' + await (await lerT(u)).text());
    const pac = root.EditorArquivos.exportar(), nome = (ed.projetoAtual || 'jogo').replace(/\s*\(pasta\)$/, ''), enc = new TextEncoder();
    if (usaMatter(pac)) cod.unshift(await lerMatter());
    const arq = root.PastaProjeto.empacotar(pac, nome); arq['motor.js'] = enc.encode(cod.join('\n;\n'));
    const cfg = cfgDe(pac), bg = cfg.corFundo || '#10161f', titulo = cfg.nomeApp || nome, esc = titulo.replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
    arq['index.html'] = enc.encode('<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"><title>' + esc + '</title><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icones/icone-192.png"><link rel="apple-touch-icon" href="icones/icone-192.png"><meta name="theme-color" content="' + bg + '">\n<style>html,body{margin:0;height:100%;background:' + bg + ';overflow:hidden;touch-action:none}</style></head><body>\n<script>\n(async function () {\n  try {\n    var t = await (await fetch("motor.js")).text(), el = document.createElement("script"); el.type = "text/plain"; el.id = "motor-codigo"; el.textContent = t; document.head.appendChild(el); (0, Function)(t)();\n    var p = Core.PastaProjeto || window.PastaProjeto, d = p.desempacotar(await p.lerUrl("./"));\n    await Core.Player.iniciar({ nome: d.nome, atual: d.cenas.atual, cenas: d.cenas.cenas, versao: Core.VERSAO, render: "' + (($('e-render') || {}).value === 'graficos' ? 'webgl' : '2d') + '", pixiUrl: "pixi.min.js" });\n    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});\n  } catch (e) { document.body.textContent = "Não foi possível iniciar o jogo (abra por http/https, não por file://): " + e.message; }\n})();\n</script>\n</body></html>\n');
    arq['manifest.webmanifest'] = enc.encode(JSON.stringify({ name: titulo, short_name: titulo.slice(0, 12), start_url: './index.html', scope: './', display: 'fullscreen', orientation: ORI[cfg.orientacao || 'qualquer'], background_color: bg, theme_color: bg, icons: [{ src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }, { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }, null, 2));
    arq['pixi.min.js'] = new Uint8Array(await (await lerT('../adapters/vendor/pixi.min.js')).arrayBuffer());
    arq['sw.js'] = enc.encode((await (await lerT('sw.js')).text()).replace("'motor-v1'", "'jogo-" + nome.replace(/[^a-zA-Z0-9_-]+/g, '_') + "-v1'"));
    for (const i of ['icone-192.png', 'icone-512.png']) arq['icones/' + i] = new Uint8Array(await (await lerT('icones/' + i)).arrayBuffer());
    if (cfg.icone) { arq['icones/icone-192.png'] = await redimensionar(cfg.icone, 192); arq['icones/icone-512.png'] = await redimensionar(cfg.icone, 512); }
    arq['LEIA-ME.txt'] = enc.encode('Jogo exportado com o Motor v' + root.Core.VERSAO + '.\nSuba esta pasta inteira para qualquer hospedagem estática (GitHub Pages, Netlify...) ou rode um servidor local (ex.: python3 -m http.server). Não abre por duplo clique (file://).\nÉ um PWA: no celular, "Adicionar à tela inicial".\n');
    return arq;
  }
  root.EditorExportar = { gerar, gerarPasta };
  const bz = $('jogo-exportar-zip'); if (bz) bz.addEventListener('click', async () => { const m = $('pasta-msg'); try { const blob = root.PastaProjeto.zipar(await gerarPasta()), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ((ed.projetoAtual || 'jogo').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'jogo') + '-web.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); m.textContent = 'ZIP do jogo (pasta web + PWA) gerado.'; m.className = 'msg ok'; } catch (x) { m.textContent = 'Não exportou: ' + x.message; m.className = 'msg erro'; } });
  const b = $('jogo-exportar'); if (!b) return;
  b.addEventListener('click', async () => {
    const m = $('pasta-msg'); try { const html = await gerar(), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = ((ed.projetoAtual || 'jogo').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'jogo') + '.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 0); m.textContent = 'Jogo exportado (' + Math.round(html.length / 1024) + ' KB). Abra o arquivo no navegador ou envie para o celular.'; m.className = 'msg ok'; }
    catch (x) { m.textContent = 'Não exportou: ' + x.message + (location.protocol === 'file:' ? ' (abra o editor pelo endereço https do GitHub Pages)' : ''); m.className = 'msg erro'; }
  });

  // ---- ajustes finos de exportação (salvos na cena aberta: estado.exportar)
  (function () {
    const ref = $('jogo-exportar-zip') || $('jogo-exportar'); if (!ref) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'ex-ajustes'; b.textContent = '⚙ Exportação'; b.title = 'Nome do app, ícone, orientação, encaixe de tela e cor de fundo do jogo exportado'; ref.after(b);
    const p = document.createElement('div'); p.id = 'ex-painel'; p.className = 'mais-painel'; p.hidden = true; p.style.cssText = 'position:fixed;top:48px;right:8px;z-index:60;max-width:96vw'; document.body.append(p);
    const el = (t, txt) => { const x = document.createElement(t); if (txt !== undefined) x.textContent = txt; return x; };
    const cfg = () => ed.cena.estado.exportar || {};
    const grava = (k, v) => { const c = Object.assign({}, cfg()); if (v === '' || v === undefined) delete c[k]; else c[k] = v; if (Object.keys(c).length) ed.cena.estado.exportar = c; else delete ed.cena.estado.exportar; ed.json(); };
    function desenhar() {
      p.innerHTML = ''; p.append(el('p', 'Ajustes do jogo exportado:')); p.firstChild.className = 't';
      const linha = (rot, campo) => { const l = el('label', rot + ' '); l.style.cssText = 'display:flex;gap:6px;align-items:center;margin:4px 0;justify-content:space-between'; l.append(campo); p.append(l); };
      const nome = el('input'); nome.id = 'ex-nome'; nome.maxLength = 30; nome.placeholder = ed.projetoAtual || 'jogo'; nome.value = cfg().nomeApp || ''; nome.addEventListener('change', () => grava('nomeApp', nome.value.trim().slice(0, 30))); linha('Nome do app', nome);
      const sel = (id, k, ops, rot) => { const s = el('select'); s.id = id; for (const [v, t] of ops) { const o = el('option', t); o.value = v; s.append(o); } s.value = cfg()[k] || ops[0][0]; s.addEventListener('change', () => grava(k, s.value === ops[0][0] ? '' : s.value)); linha(rot, s); };
      sel('ex-orient', 'orientacao', [['qualquer', 'Qualquer'], ['paisagem', 'Horizontal'], ['retrato', 'Vertical']], 'Orientação');
      sel('ex-encaixe', 'encaixe', [['conter', 'Ajustar à tela'], ['inteiro', 'Escala inteira (pixel art)']], 'Encaixe');
      const cor = el('input'); cor.id = 'ex-cor'; cor.type = 'color'; cor.value = cfg().corFundo && cfg().corFundo.length === 7 ? cfg().corFundo : '#000000'; cor.addEventListener('change', () => grava('corFundo', cor.value)); linha('Cor de fundo (bordas)', cor);
      const ic = el('input'); ic.id = 'ex-icone'; ic.type = 'file'; ic.accept = 'image/png,image/jpeg,image/webp'; ic.addEventListener('change', async () => { const f = ic.files && ic.files[0]; if (!f) return; try { const url = URL.createObjectURL(f), b = await redimensionar(url, 512); URL.revokeObjectURL(url); let s = ''; for (let k = 0; k < b.length; k++) s += String.fromCharCode(b[k]); grava('icone', 'data:image/png;base64,' + btoa(s)); desenhar(); } catch (e) { alert('Não consegui usar essa imagem: ' + e.message); } });
      const prev = el('img'); prev.id = 'ex-icone-prev'; prev.alt = 'ícone do app'; prev.style.cssText = 'width:40px;height:40px;border-radius:9px;object-fit:cover;background:#0003'; if (cfg().icone) prev.src = cfg().icone; else prev.hidden = true;
      const lin = el('label', 'Ícone do app '); lin.style.cssText = 'display:flex;gap:6px;align-items:center;margin:4px 0;justify-content:space-between'; lin.append(prev, ic); p.append(lin);
      if (cfg().icone) { const r = el('button', 'Tirar ícone'); r.type = 'button'; r.addEventListener('click', () => { grava('icone', ''); desenhar(); }); p.append(r); }
      const x = el('button', 'Limpar ajustes'); x.type = 'button'; x.addEventListener('click', () => { delete ed.cena.estado.exportar; ed.json(); desenhar(); }); p.append(x);
      p.append(el('small', 'Valem para o .html e para a pasta/ZIP. Ficam salvos no projeto (na cena aberta).'));
    }
    b.addEventListener('click', () => { p.hidden = !p.hidden; if (!p.hidden) desenhar(); });
    document.addEventListener('keydown', ev => { if (ev.key === 'Escape') p.hidden = true; });
  })();
})(window);
