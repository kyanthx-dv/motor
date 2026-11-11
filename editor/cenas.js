/* Editor · várias cenas por projeto.
   A cena aberta no editor ("viva") continua sendo a do projeto, como antes. As OUTRAS cenas ficam guardadas à parte
   (localStorage, chave própria): { projeto: { atual: 'nome da cena viva', cenas: { nome: json } } }.
   No Play, todas são registradas no motor (engine.registrarCenaJSON), e o bloco "ir para a cena" troca entre elas. */
(function (root) {
  const ed = root.editor, C = root.Core, KEY = 'motor.editor.cenas.v1', NOME = /^[A-Za-zÀ-ÿ0-9_ -]{1,30}$/;
  const $ = id => document.getElementById(id), msg = (t, k) => { const m = $('msg'); if (m) { m.textContent = t || ''; m.className = 'msg ' + (k || ''); } };
  let dados = {};
  try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); dados = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (x) { dados = {}; }
  const guardar = () => { try { localStorage.setItem(KEY, JSON.stringify(dados)); } catch (x) { msg('Não consegui salvar as cenas (espaço do navegador).', 'erro'); } };
  const proj = () => { const k = ed.projetoAtual || '_'; const p = dados[k] = dados[k] || {}; if (typeof p.atual !== 'string') p.atual = 'principal'; if (!p.cenas || typeof p.cenas !== 'object') p.cenas = {}; return p; };
  const vivo = () => C.Serializer.paraJSON(ed.cena);
  const nomes = () => { const p = proj(); return [p.atual, ...Object.keys(p.cenas)].sort(); };
  const vazia = () => ({ formato: 1, estado: { vars: {} }, entidades: [] });

  // Troca nome de cena nos blocos "ir para a cena" de todas as cenas (a cena viva é editada no lugar).
  function renomearReferencias(velho, novo) {
    const arruma = scripts => { for (const n in scripts || {}) { const s = scripts[n]; if (!s || !Array.isArray(s.blocos)) continue; let mudou = false; (function varrer(x) { if (Array.isArray(x)) x.forEach(varrer); else if (x && typeof x === 'object') { if (x.t === 'ir_cena' && x.cena === velho) { x.cena = novo; mudou = true; } for (const k in x) varrer(x[k]); } })(s.blocos); if (mudou) { try { s.fonte = root.EditorBlocos.gerar(s.blocos); } catch (e) { /* bloco incompleto: mantém o código */ } } } };
    arruma(ed.cena.estado.scripts); const p = proj(); for (const n in p.cenas) arruma(p.cenas[n].estado && p.cenas[n].estado.scripts);
  }
  function irPara(nome) {
    const p = proj(); if (nome === p.atual || !p.cenas[nome]) return;
    const novo = p.cenas[nome]; p.cenas[p.atual] = vivo(); delete p.cenas[nome]; p.atual = nome;
    ed.carregarCena(novo); guardar(); desenhar(); msg('Cena "' + nome + '" aberta.', 'ok');
  }
  function nova() {
    const nome = $('cena-nome').value.trim(); if (!NOME.test(nome)) return msg('Nome da cena: 1 a 30 letras, números, espaço, _ ou -.', 'erro');
    if (nomes().includes(nome)) return msg('Já existe uma cena com esse nome.', 'erro');
    const p = proj(); p.cenas[nome] = vazia(); $('cena-nome').value = ''; irPara(nome);
  }
  function renomear() {
    const nome = $('cena-nome').value.trim(), p = proj(), alvo = $('cenas-lista').value || p.atual;
    if (!NOME.test(nome)) return msg('Nome da cena: 1 a 30 letras, números, espaço, _ ou -.', 'erro');
    if (nome === alvo) return; if (nomes().includes(nome)) return msg('Já existe uma cena com esse nome.', 'erro');
    if (alvo === p.atual) p.atual = nome; else { p.cenas[nome] = p.cenas[alvo]; delete p.cenas[alvo]; }
    renomearReferencias(alvo, nome); ed.persistir(); guardar(); desenhar(); ed.json(); msg('Cena renomeada (os blocos "ir para a cena" foram atualizados).', 'ok');
  }
  function apagar() {
    const p = proj(), alvo = $('cenas-lista').value || p.atual; if (nomes().length < 2) return msg('Mantenha pelo menos uma cena.', 'erro');
    if (!root.confirm('Apagar a cena "' + alvo + '"?')) return;
    if (alvo === p.atual) { const outra = Object.keys(p.cenas).sort()[0]; irPara(outra); delete p.cenas[alvo]; } else delete p.cenas[alvo];
    guardar(); desenhar(); msg('Cena apagada.', 'ok');
  }
  function desenhar() {
    const s = $('cenas-lista'); if (!s) return; const p = proj(); s.innerHTML = '';
    for (const n of nomes()) { const o = document.createElement('option'); o.value = n; o.textContent = n + (n === p.atual ? '  (aberta)' : ''); s.append(o); }
    s.value = p.atual; $('n-cenas').textContent = '(' + nomes().length + ')';
  }
  root.EditorCenas = {
    nomes,
    registrar(engine) {   // chamado no Play: todas as cenas do projeto ficam disponíveis para "ir para a cena"
      const p = proj(); engine.cenas = {}; engine.registrarCenaJSON(p.atual, vivo());
      for (const n in p.cenas) engine.registrarCenaJSON(n, p.cenas[n]);
    },
    projeto(ev, a, b) {   // avisos do editor sobre projetos
      if (ev === 'renomeou') { if (dados[a]) { dados[b] = dados[a]; delete dados[a]; guardar(); } }
      else if (ev === 'apagou') { delete dados[a]; guardar(); }
      desenhar();
    },
    // para testes e para o "baixar projeto": estado de todas as cenas
    exportar() { const p = proj(); return { atual: p.atual, cenas: Object.assign({}, p.cenas, { [p.atual]: vivo() }) }; },
    importar(nome, pacote) { const cenas = pacote && pacote.cenas && typeof pacote.cenas === 'object' ? pacote.cenas : {}; const atual = typeof pacote?.atual === 'string' && cenas[pacote.atual] ? pacote.atual : Object.keys(cenas)[0] || 'principal'; const viva = cenas[atual] || pacote?.cena || vazia(); const outras = {}; for (const n of Object.keys(cenas)) if (n !== atual) outras[n] = cenas[n]; dados[nome] = { atual, cenas: outras }; guardar(); },
    irPara, nova, renomear, apagar
  };
  $('cena-nova').addEventListener('click', nova); $('cena-abrir').addEventListener('click', () => irPara($('cenas-lista').value));
  $('cena-renomear').addEventListener('click', renomear); $('cena-apagar').addEventListener('click', apagar);
  desenhar();
})(window);
