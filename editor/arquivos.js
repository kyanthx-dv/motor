/* Editor · arquivos (T3): exportação/importação do projeto, incluindo todas as cenas. */
(function (root) {
  const ed = root.editor, C = root.Core, $ = id => document.getElementById(id), KEY = 'motor.editor.projetos.v1';
  const clone = x => JSON.parse(JSON.stringify(x));
  function projetos() { try { const x = JSON.parse(localStorage.getItem(KEY) || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch (e) { return {}; } }
  function nomeLivre() { const ps = projetos(), base = 'Importado'; let n = base, i = 2; while (ps[n]) n = base + ' ' + i++; return n; }
  function pacoteAtual() { return { cena: clone(C.Serializer.paraJSON(ed.cena)), cenas: clone(root.EditorCenas.exportar()) }; }
  function baixar() {
    const blob = new Blob([JSON.stringify(pacoteAtual(), null, 2)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = (ed.projetoAtual || 'projeto') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 0);
  }
  function abrirTexto(texto) {
    let dado;
    try { dado = JSON.parse(texto); } catch (e) { return alert('Ficheiro JSON inválido.'); }
    let viva, cenas;
    if (dado && Array.isArray(dado.entidades) && dado.formato !== undefined) { viva = dado; cenas = { atual: 'principal', cenas: { principal: dado } }; }
    else if (dado && dado.cena && dado.cenas) { viva = dado.cena; cenas = dado.cenas.cenas ? dado.cenas : { atual: 'principal', cenas: dado.cenas }; }
    else return alert('Ficheiro não é uma cena nem um projeto do Motor.');
    const nome = nomeLivre(); ed.importarProjeto(nome, clone(viva), clone(cenas));
  }
  function abrir(ev) { const f = ev.target.files && ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => abrirTexto(r.result); r.onerror = () => alert('Não foi possível ler o ficheiro.'); r.readAsText(f); ev.target.value = ''; }
  $('projeto-baixar').addEventListener('click', baixar); $('projeto-abrir-arquivo').addEventListener('click', () => $('projeto-arquivo').click()); $('projeto-arquivo').addEventListener('change', abrir);
  root.EditorArquivos = { exportar: pacoteAtual, importar: abrirTexto };
})(window);
