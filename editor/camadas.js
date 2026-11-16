/* Editor · camadas rápidas: Mundo e Interface (UI = Sprite.fixo). Cada uma pode ser ocultada na vista do editor (👁) ou travada (🔒: o clique
   não a seleciona). Só vale para a edição: não é salvo no projeto e não afeta o Play nem o jogo exportado. */
(function (root) {
  const ed = root.editor, $ = id => document.getElementById(id);
  const est = { mundo: { ver: true, trava: false }, ui: { ver: true, trava: false } };
  const grupo = e => (e.Sprite && e.Sprite.fixo) || e.Joystick ? 'ui' : 'mundo';
  const caixa = document.createElement('span'); caixa.id = 'e-camadas'; caixa.className = 'camadas'; caixa.setAttribute('aria-label', 'Camadas do editor');
  const mk = (g, rot) => {
    const v = document.createElement('button'), t = document.createElement('button'); v.type = t.type = 'button'; v.id = 'cam-ver-' + g; t.id = 'cam-trava-' + g;
    const pintar = () => { v.textContent = (est[g].ver ? '👁 ' : '🚫 ') + rot; t.textContent = est[g].trava ? '🔒' : '🔓'; v.title = 'Mostrar/ocultar ' + rot + ' na vista do editor'; t.title = 'Travar ' + rot + ': o clique não seleciona'; v.classList.toggle('off', !est[g].ver); t.classList.toggle('on', est[g].trava); };
    v.addEventListener('click', () => { est[g].ver = !est[g].ver; aplicar(); pintar(); }); t.addEventListener('click', () => { est[g].trava = !est[g].trava; pintar(); });
    pintar(); caixa.append(v, t);
  };
  const aplicar = () => { ed.renderer.ocultarGrupo = { mundo: !est.mundo.ver, ui: !est.ui.ver }; if (ed.redesenhar) ed.redesenhar(); };
  mk('mundo', 'Mundo'); mk('ui', 'Interface');
  (($('e-scripts') || $('e-mais')).after(caixa));
  ed.camadaTrava = e => { const g = est[grupo(e)]; return g.trava || !g.ver; };
  root.EditorCamadas = { estado: est };
})(window);
