/* Editor · exportar jogo: gera UM arquivo .html (núcleo + adaptadores + player + o projeto inteiro) que roda sozinho em qualquer
   navegador, inclusive no celular. Só Canvas 2D (o WebGL/PixiJS não vai junto, para o arquivo ficar pequeno). */
(function (root) {
  const ed = root.editor, $ = id => document.getElementById(id);
  const EXCLUIR = /pixi|debug|vendor|worker-host|player/;
  const seguro = t => t.replace(/<\/script/gi, '<\\/script');
  async function gerar() {
    const urls = [...document.scripts].map(s => s.getAttribute('src') || '').filter(s => /^\.\.\/(core|adapters)\//.test(s) && !EXCLUIR.test(s)); urls.push('../adapters/worker-host.js', '../adapters/player.js');
    const codigos = []; for (const u of urls) { const r = await fetch(u); if (!r.ok) throw new Error('não consegui ler ' + u + ' (' + r.status + ')'); codigos.push('/* ' + u.replace('../', '') + ' */\n' + await r.text()); }
    const pac = root.EditorArquivos.exportar(), cenas = Object.assign({}, pac.cenas.cenas); cenas[pac.cenas.atual] = pac.cena;
    const nome = (ed.projetoAtual || 'jogo').replace(/\s*\(pasta\)$/, ''), jogo = { nome, atual: pac.cenas.atual, cenas, versao: root.Core.VERSAO };
    const dados = JSON.stringify(jogo).replace(/</g, '\\u003c').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
    const esc = nome.replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
    return '<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"><title>' + esc + '</title>\n<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none}</style></head><body>\n' +
      '<script>/* Jogo exportado com o Motor v' + root.Core.VERSAO + '. O motor roda num Web Worker; o código dele fica no bloco de texto abaixo. */</script>\n<script type="text/plain" id="motor-codigo">\n' + seguro(codigos.join('\n;\n')) + '\n</script>\n<script>\n(0, Function)(document.getElementById("motor-codigo").textContent)();\nCore.Player.iniciar(' + dados + ').catch(function (e) { document.body.textContent = "Não foi possível iniciar o jogo: " + e.message; });\n</script>\n'+'</body></html>\n';
  }
  // Exportar como PASTA/ZIP: index.html + motor.js + projeto.json/cenas/assets (arquivos separados, sem limite de data-URL) + PWA. Precisa de http(s).
  async function gerarPasta() {
    const urls = [...document.scripts].map(x => x.getAttribute('src') || '').filter(x => /^\.\.\/(core|adapters)\//.test(x) && !EXCLUIR.test(x)); urls.push('../adapters/worker-host.js', '../adapters/pixi-renderer.js', '../adapters/player.js');
    const lerT = async u => { const r = await fetch(u); if (!r.ok) throw new Error('não consegui ler ' + u + ' (' + r.status + ')'); return r; };
    const cod = []; for (const u of urls) cod.push('/* ' + u.replace('../', '') + ' */\n' + await (await lerT(u)).text());
    const pac = root.EditorArquivos.exportar(), nome = (ed.projetoAtual || 'jogo').replace(/\s*\(pasta\)$/, ''), enc = new TextEncoder();
    const arq = root.PastaProjeto.empacotar(pac, nome); arq['motor.js'] = enc.encode(cod.join('\n;\n'));
    const esc = nome.replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
    arq['index.html'] = enc.encode('<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"><title>' + esc + '</title><link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#10161f">\n<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none}</style></head><body>\n<script>\n(async function () {\n  try {\n    var t = await (await fetch("motor.js")).text(), el = document.createElement("script"); el.type = "text/plain"; el.id = "motor-codigo"; el.textContent = t; document.head.appendChild(el); (0, Function)(t)();\n    var p = Core.PastaProjeto || window.PastaProjeto, d = p.desempacotar(await p.lerUrl("./"));\n    await Core.Player.iniciar({ nome: d.nome, atual: d.cenas.atual, cenas: d.cenas.cenas, versao: Core.VERSAO, render: "' + (($('e-render') || {}).value === 'graficos' ? 'webgl' : '2d') + '", pixiUrl: "pixi.min.js" });\n    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});\n  } catch (e) { document.body.textContent = "Não foi possível iniciar o jogo (abra por http/https, não por file://): " + e.message; }\n})();\n</script>\n</body></html>\n');
    arq['manifest.webmanifest'] = enc.encode(JSON.stringify({ name: nome, short_name: nome.slice(0, 12), start_url: './index.html', scope: './', display: 'fullscreen', orientation: 'any', background_color: '#10161f', theme_color: '#10161f', icons: [{ src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }, { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }, null, 2));
    arq['pixi.min.js'] = new Uint8Array(await (await lerT('../adapters/vendor/pixi.min.js')).arrayBuffer());
    arq['sw.js'] = enc.encode((await (await lerT('sw.js')).text()).replace("'motor-v1'", "'jogo-" + nome.replace(/[^a-zA-Z0-9_-]+/g, '_') + "-v1'"));
    for (const i of ['icone-192.png', 'icone-512.png']) arq['icones/' + i] = new Uint8Array(await (await lerT('icones/' + i)).arrayBuffer());
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
})(window);
