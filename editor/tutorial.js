/* Editor · tutorial guiado de ~5 minutos: um cartão com um passo por vez; cada passo avança sozinho quando o editor detecta que foi feito. */
(function (root) {
  const ed = root.editor, cena = ed.cena, eng = ed.engine, $ = id => document.getElementById(id);
  const todos = () => [...cena.entities.values()];
  const fotoPos = () => JSON.stringify(todos().map(e => [e.id, e.Transform && e.Transform.x, e.Transform && e.Transform.y]));
  const fotoCor = () => JSON.stringify(todos().map(e => [e.id, e.Sprite && e.Sprite.cor]));
  let base = null;
  const PASSOS = [
    { t: 'Crie um objeto', d: 'Na aba **Objetos**, clique em **+ Novo objeto** e escolha **Retângulo**.', ok: () => todos().some(e => e.Sprite && !e.Sprite.fixo && e.Body) },
    { t: 'Mude a cor', d: 'Clique no objeto na cena. No **Inspetor** (à direita), mude o campo **cor** de Sprite.', antes: () => { base = fotoCor(); }, ok: () => fotoCor() !== base },
    { t: 'Mova o objeto', d: 'Arraste o objeto na cena para outro lugar. As alças dos cantos mudam o tamanho; a bolinha de cima gira.', antes: () => { base = fotoPos(); }, ok: () => fotoPos() !== base },
    { t: 'Crie um botão', d: 'Em **+ Novo objeto**, escolha **Botão**. Botões e textos ficam fixos na tela (interface).', ok: () => todos().some(e => e.Botao) },
    { t: 'Dê um script ao objeto', d: 'Abra a aba **Scripts** (centro), crie um script de **blocos** e use **Anexar ao objeto selecionado**. Dica: o bloco "quando executar → a cada quadro" roda sempre.', ok: () => todos().some(e => e.Script) },
    { t: 'Jogue!', d: 'Aperte **Play** no topo para ver o jogo rodando.', ok: () => !!eng.rodando },
    { t: 'Pare o jogo', d: 'Aperte **Parar**. O editor volta ao estado de antes do Play.', ok: () => !eng.rodando }
  ];
  let i = 0, aberto = false, cartao = null, timer = 0;
  const md = s => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  function desenhar() {
    if (!cartao) return; const p = PASSOS[i], fim = i >= PASSOS.length;
    cartao.innerHTML = fim ? '<h3>Pronto! 🎉</h3><p>Você criou, editou, programou e jogou. Para publicar: aba <b>Projetos → Exportar jogo</b> (.html ou pasta web). Dicas de código: <code>docs/CTX.md</code>.</p><div class="tut-bt"><button id="tut-fechar" type="button">Fechar</button></div>'
      : '<div class="tut-top"><small>Tutorial · passo ' + (i + 1) + ' de ' + PASSOS.length + '</small><button id="tut-x" type="button" title="Fechar">✕</button></div><h3>' + p.t + '</h3><p>' + md(p.d) + '</p><div class="tut-barra"><i style="width:' + (i / PASSOS.length * 100) + '%"></i></div><div class="tut-bt"><button id="tut-pular" type="button">Pular passo</button></div>';
    const q = id => cartao.querySelector('#' + id); if (q('tut-x')) q('tut-x').onclick = fechar; if (q('tut-fechar')) q('tut-fechar').onclick = fechar; if (q('tut-pular')) q('tut-pular').onclick = () => avancar();
  }
  function avancar() { i++; if (i < PASSOS.length && PASSOS[i].antes) PASSOS[i].antes(); desenhar(); }
  function abrir() {
    if (aberto) return; aberto = true; i = 0; if (PASSOS[0].antes) PASSOS[0].antes();
    cartao = document.createElement('div'); cartao.id = 'tutorial'; cartao.className = 'tutorial'; document.body.append(cartao); desenhar();
    timer = setInterval(() => { if (i < PASSOS.length) { try { if (PASSOS[i].ok()) avancar(); } catch (x) {} } }, 400);
  }
  function fechar() { aberto = false; clearInterval(timer); if (cartao) cartao.remove(); cartao = null; }
  const b = document.createElement('button'); b.type = 'button'; b.id = 'e-tutorial'; b.textContent = 'Tutorial'; b.title = 'Guia de 5 minutos: crie, mova, programe e jogue'; b.addEventListener('click', () => (aberto ? fechar() : abrir()));
  const alvo = $('e-scripts') || $('e-mais'); if (alvo) alvo.after(b);
  root.EditorTutorial = { abrir, fechar, passo: () => i };
})(window);
