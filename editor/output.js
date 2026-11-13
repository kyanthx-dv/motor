/* Editor · Output: mensagens do jogo (bloco/ctx.escrever) e erros de script, como no Godot/Roblox. */
(function (root) {
  const ed = root.editor, $ = id => document.getElementById(id), MAX = 300;
  const itens = []; let rodou = false;
  const live = document.createElement('div'); live.id = 'out-vivo'; document.body.append(live);
  const hora = () => { const d = new Date(); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':'); };
  function add(texto, tipo) {
    itens.push({ h: hora(), texto: String(texto), tipo }); if (itens.length > MAX) itens.shift();
    desenhar(); const v = document.createElement('div'); v.className = tipo === 'erro' ? 'o-erro' : ''; v.textContent = texto; live.append(v); while (live.children.length > 5) live.firstChild.remove(); setTimeout(() => v.remove(), 6000);
  }
  function desenhar() {
    const ol = $('out'), so = $('out-erros').checked, lista = itens.filter(i => !so || i.tipo === 'erro'); ol.innerHTML = '';
    for (const i of lista.slice(-MAX)) { const li = document.createElement('li'), t = document.createElement('span'); li.className = 'o-' + (i.tipo || 'info'); t.className = 't'; t.textContent = i.h; li.append(t, document.createTextNode(i.texto)); ol.append(li); }
    $('n-out').textContent = itens.length ? '(' + itens.length + ')' : ''; ol.scrollTop = ol.scrollHeight;
  }
  ed.engine.events.on('saida', d => add(d.texto, d.nivel === 'erro' ? 'erro' : 'info'));
  ed.engine.events.on('erro-script', d => add('Erro no script "' + d.script + '" (' + d.fase + '): ' + d.mensagem, 'erro'));
  (function acompanhar() { if (ed.engine.rodando !== rodou) { rodou = ed.engine.rodando; const li = { h: hora(), texto: rodou ? '▶ Play' : '■ Parado', tipo: 'sis' }; itens.push(li); desenhar(); } requestAnimationFrame(acompanhar); })();
  $('out-limpar').addEventListener('click', () => { itens.length = 0; desenhar(); }); $('out-erros').addEventListener('change', desenhar);
  // valores do bloco "observar valor": ao vivo no Output e, em tela cheia, no canto da tela
  const vivo = document.createElement('div'); vivo.id = 'obs-vivo'; document.body.append(vivo); let ultimoObs = '';
  (function observados() {
    const o = ed.engine.observados || {}, txt = JSON.stringify(o);
    if (txt !== ultimoObs) {
      ultimoObs = txt; const caixa = $('out-obs'); caixa.innerHTML = ''; vivo.innerHTML = '';
      for (const [k, v] of Object.entries(o)) { const sp = document.createElement('span'), b = document.createElement('b'); b.textContent = k; sp.append(b, ' = ' + v); caixa.append(sp); const d = document.createElement('div'); d.textContent = k + ' = ' + v; vivo.append(d); }
    }
    requestAnimationFrame(observados);
  })();
  root.EditorOutput = { add, itens };
})(window);
