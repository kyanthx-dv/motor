/* Editor · projeto em PASTA (estilo Godot). Formato 2:
     projeto.json            { formato:2, nome, cenaAtual, cenas:["principal", ...] }
     cenas/<nome>.json       cena sem imagens/sons embutidos (estado.imagens/sons guardam caminhos "assets/...")
     assets/imagens/*.png    assets/sons/*.ogg
   Salvar/abrir: pasta de verdade (File System Access API, Chrome/Edge/Android) ou ZIP (qualquer navegador).
   As funções de formato (empacotar/desempacotar/zip) não dependem da tela. */
(function (root) {
  const { lerUrl, empacotar, desempacotar, zipar, deszipar, gravarPasta, lerPasta } = root.PastaProjeto;

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
