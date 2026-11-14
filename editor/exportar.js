/* Editor · exportar jogo: gera UM arquivo .html (núcleo + adaptadores + player + o projeto inteiro) que roda sozinho em qualquer
   navegador, inclusive no celular. Só Canvas 2D (o WebGL/PixiJS não vai junto, para o arquivo ficar pequeno). */
(function (root) {
  const ed = root.editor, $ = id => document.getElementById(id);
  const EXCLUIR = /pixi|debug|vendor/;
  const seguro = t => t.replace(/<\/script/gi, '<\\/script');
  async function gerar() {
    const urls = [...document.scripts].map(s => s.getAttribute('src') || '').filter(s => /^\.\.\/(core|adapters)\//.test(s) && !EXCLUIR.test(s)); urls.push('../adapters/player.js');
    const codigos = []; for (const u of urls) { const r = await fetch(u); if (!r.ok) throw new Error('não consegui ler ' + u + ' (' + r.status + ')'); codigos.push('/* ' + u.replace('../', '') + ' */\n' + await r.text()); }
    const pac = root.EditorArquivos.exportar(), cenas = Object.assign({}, pac.cenas.cenas); cenas[pac.cenas.atual] = pac.cena;
    const nome = (ed.projetoAtual || 'jogo').replace(/\s*\(pasta\)$/, ''), jogo = { nome, atual: pac.cenas.atual, cenas, versao: root.Core.VERSAO };
    const dados = JSON.stringify(jogo).replace(/</g, '\\u003c').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
    const esc = nome.replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';');
    return '<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no,viewport-fit=cover"><title>' + esc + '</title>\n<style>html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none}</style></head><body>\n' +
      '<script>/* Jogo exportado com o Motor v' + root.Core.VERSAO + '. Scripts do jogo rodam com os poderes da página. */</script>\n<script>\n' + seguro(codigos.join('\n;\n')) + '\n</script>\n<script>\nCore.Player.iniciar(' + dados + ').catch(function (e) { document.body.textContent = "Não foi possível iniciar o jogo: " + e.message; });\n</script>\n</body></html>\n';
  }
  root.EditorExportar = { gerar };
  const b = $('jogo-exportar'); if (!b) return;
  b.addEventListener('click', async () => {
    const m = $('pasta-msg'); try { const html = await gerar(), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = ((ed.projetoAtual || 'jogo').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'jogo') + '.html'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 0); m.textContent = 'Jogo exportado (' + Math.round(html.length / 1024) + ' KB). Abra o arquivo no navegador ou envie para o celular.'; m.className = 'msg ok'; }
    catch (x) { m.textContent = 'Não exportou: ' + x.message + (location.protocol === 'file:' ? ' (abra o editor pelo endereço https do GitHub Pages)' : ''); m.className = 'msg erro'; }
  });
})(window);
