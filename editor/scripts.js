/* Editor · scripts (E3a). Código JavaScript guardado na cena (estado.scripts); o motor compila ao dar Play (engine.compilarScripts).
   Por quê na cena: o projeto inteiro (objetos + variáveis + código) é um único JSON. */
(function () {
  const ed = window.editor, C = Core, cena = ed.cena, $ = id => document.getElementById(id);
  const MODELO = '// Roda uma vez, quando o jogo começa.\nfunction iniciar(e, ctx) {\n}\n\n// Roda 60 vezes por segundo. e = este objeto; ctx.vars = variáveis do jogo.\nfunction atualizar(e, dt, ctx) {\n  e.Transform.x += 40 * dt;\n}\n';
  const fontes = () => cena.estado.scripts || (cena.estado.scripts = {});
  let atual = null;
  // Alguns ambientes (ex.: páginas hospedadas com CSP, como artefatos) proíbem criar código a partir de texto: aí scripts NÃO rodam.
  const semEval = (() => { try { new Function('return 1')(); return false; } catch (x) { return true; } })();
  if (semEval) { const a = $('sc-aviso'); a.hidden = false; a.textContent = 'Este ambiente bloqueia código criado a partir de texto (CSP): os scripts não rodam aqui. Abra o editor pelo arquivo editor/index.html no seu computador ou pelo GitHub Pages.'; }
  const msg = (t, tipo) => { const m = $('sc-msg'); m.textContent = t || ''; m.className = 'msg ' + (tipo || ''); };
  function verificar() {
    if (!atual || semEval) { msg(''); return; }
    try { new Function($('sc-fonte').value); msg('Sintaxe ok.', 'ok'); } catch (x) { msg('Erro de sintaxe: ' + x.message, 'erro'); }
  }
  function usos(nome) { return [...cena.entities.values()].filter(e => e.Script && e.Script.nome === nome); }
  function atualizar() {
    const nomes = Object.keys(fontes()), s = $('sc-lista'); s.innerHTML = '';
    for (const n of nomes) { const o = document.createElement('option'); o.value = o.textContent = n; s.append(o); }
    if (!nomes.includes(atual)) atual = nomes[0] || null;
    s.value = atual || ''; $('n-sc').textContent = '(' + nomes.length + ')';
    const f = $('sc-fonte'); f.disabled = !atual; if (document.activeElement !== f) f.value = atual ? fontes()[atual].fonte : '';
    const e = cena.get(ed.sel), tem = e && e.Script ? e.Script.nome : null;
    $('sc-anexar').disabled = !atual || !e; $('sc-desanexar').disabled = !tem; $('sc-remover').disabled = !atual;
    $('sc-info').textContent = (e ? 'Objeto selecionado: ' + (e.nome || '#' + e.id) + ' · script: ' + (tem || 'nenhum') : 'Nenhum objeto selecionado.') + (atual ? ' · "' + atual + '" usado por ' + usos(atual).length + ' objeto(s)' : '');
    verificar();
  }
  $('sc-lista').addEventListener('change', () => { atual = $('sc-lista').value; $('sc-fonte').value = fontes()[atual].fonte; atualizar(); });
  $('sc-fonte').addEventListener('input', () => { if (!atual) return; fontes()[atual].fonte = $('sc-fonte').value; verificar(); ed.json(); });
  $('sc-novo').addEventListener('click', () => {
    const nome = $('sc-nome').value.trim();
    if (!C.Variaveis.NOME.test(nome)) { msg('Nome inválido: use letras, números e _ (não comece com número).', 'erro'); return; }
    if (fontes()[nome]) { msg('Já existe um script chamado "' + nome + '".', 'erro'); return; }
    fontes()[nome] = { fonte: MODELO }; atual = nome; $('sc-nome').value = ''; $('sc-fonte').value = MODELO; atualizar(); ed.json();
  });
  $('sc-anexar').addEventListener('click', () => { const e = cena.get(ed.sel); if (!e || !atual) return; e.Script = { nome: atual }; atualizar(); ed.json(); });
  $('sc-desanexar').addEventListener('click', () => { const e = cena.get(ed.sel); if (e) delete e.Script; atualizar(); ed.json(); });
  $('sc-remover').addEventListener('click', () => { if (!atual) return; for (const e of usos(atual)) delete e.Script; delete fontes()[atual]; atual = null; $('sc-fonte').value = ''; atualizar(); ed.json(); });
  // Depois do Play (o editor já chamou engine.iniciar -> compilarScripts): mostra erros de compilação.
  $('e-play').addEventListener('click', () => { const er = ed.engine.errosScripts || []; if (er.length) msg('Ao iniciar: ' + er.map(x => x.script + ': ' + x.mensagem).join(' | '), 'erro'); });
  ed.aoSelecionar = atualizar; atualizar();
})();
