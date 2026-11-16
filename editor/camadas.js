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
  const lista = () => ed.cena.estado.camadas || [];
  ed.camadaTrava = e => { const g = est[grupo(e)]; if (g.trava || !g.ver) return true; const l = lista().find(c => e.Sprite && c.id === e.Sprite.grupo); return !!(l && (l.bloqueada || l.visivel === false)); };
  // ---- painel de camadas nomeadas (salvas no projeto): ordem, opacidade, paralaxe, ocultar, travar, mover o objeto selecionado
  const painel = document.createElement('div'); painel.id = 'cam-painel'; painel.className = 'mais-painel'; painel.hidden = true; document.body.append(painel);
  const abrirB = document.createElement('button'); abrirB.type = 'button'; abrirB.id = 'cam-abrir'; abrirB.textContent = '☰ Camadas'; abrirB.title = 'Camadas nomeadas do projeto'; caixa.append(abrirB);
  const mudou = () => { ed.json(); ed.redesenhar(); desenhar(); };
  const el = (t, txt, c) => { const x = document.createElement(t); if (txt !== undefined) x.textContent = txt; if (c) x.className = c; return x; };
  function novoId(base) { let id = base.replace(/[^A-Za-z0-9_-]/g, '') || 'camada', n = 2, b = id; while (lista().some(c => c.id === id)) id = b + n++; return id; }
  function adicionar(tipo) { const l = ed.cena.estado.camadas || (ed.cena.estado.camadas = []); if (l.length >= 30) return; const nome = tipo === 'interface' ? 'Interface' : 'Mundo'; const id = novoId(nome.toLowerCase()); l.push({ id, nome: nome + ' ' + (l.filter(c => c.tipo === tipo).length + 1), tipo, opacidade: 1, paralaxe: 1, visivel: true, bloqueada: false }); mudou(); }
  function mover(c, d) { const l = lista(), i = l.indexOf(c), j = i + d; if (j < 0 || j >= l.length) return; l.splice(i, 1); l.splice(j, 0, c); mudou(); }
  function remover(c) { const l = lista(); l.splice(l.indexOf(c), 1); for (const e of ed.cena.entities.values()) if (e.Sprite && e.Sprite.grupo === c.id) delete e.Sprite.grupo; if (!l.length) delete ed.cena.estado.camadas; mudou(); }
  function paraCamada(c) { const e = ed.cena.get(ed.sel); if (!e || !e.Sprite || ed.engine.rodando) return; e.Sprite.grupo = c.id; e.Sprite.fixo = c.tipo === 'interface' ? true : undefined; if (!e.Sprite.fixo) delete e.Sprite.fixo; mudou(); ed.selecionar(e.id); }
  function desenhar() {
    painel.innerHTML = ''; painel.append(el('p', 'Camadas (a de baixo da lista fica na frente):', 't'));
    const sel = ed.cena.get(ed.sel), meu = sel && sel.Sprite ? sel.Sprite.grupo : null;
    lista().forEach(c => {
      const r = el('div', undefined, 'cam-linha' + (c.id === meu ? ' atual' : '')); const nome = el('input'); nome.value = c.nome || c.id; nome.maxLength = 40; nome.setAttribute('aria-label', 'Nome da camada');
      nome.addEventListener('change', () => { c.nome = nome.value.slice(0, 40); ed.json(); });
      const num = (k, a, b, passo, rot) => { const i = el('input'); i.type = 'number'; i.min = a; i.max = b; i.step = passo; i.value = c[k] === undefined ? 1 : c[k]; i.title = rot; i.setAttribute('aria-label', rot); i.addEventListener('change', () => { const v = parseFloat(i.value); if (Number.isFinite(v)) { c[k] = Math.max(a, Math.min(b, v)); ed.json(); ed.redesenhar(); } }); return i; };
      const bt = (t, f, ti) => { const b = el('button', t); b.type = 'button'; b.title = ti; b.addEventListener('click', f); return b; };
      r.append(bt(c.visivel === false ? '🚫' : '👁', () => { c.visivel = c.visivel === false; mudou(); }, 'Mostrar/ocultar (também no jogo)'), bt(c.bloqueada ? '🔒' : '🔓', () => { c.bloqueada = !c.bloqueada; mudou(); }, 'Travar: o clique não seleciona'), nome, el('small', c.tipo === 'interface' ? 'UI' : 'mundo'), num('opacidade', 0, 1, 0.1, 'Opacidade (0 a 1)'), num('paralaxe', 0, 3, 0.1, 'Paralaxe (1 = normal, 0.5 = anda metade da câmera)'), bt('▲', () => mover(c, -1), 'Mais para trás'), bt('▼', () => mover(c, 1), 'Mais para frente'), bt('⇦ sel', () => paraCamada(c), 'Mover o objeto selecionado para esta camada'), bt('✕', () => remover(c), 'Apagar a camada (os objetos ficam sem camada)'));
      painel.append(r);
    });
    const f = el('div', undefined, 'cam-linha'); const b1 = el('button', '+ Camada de Mundo'), b2 = el('button', '+ Camada de Interface'); b1.type = b2.type = 'button'; b1.addEventListener('click', () => adicionar('mundo')); b2.addEventListener('click', () => adicionar('interface')); f.append(b1, b2); painel.append(f);
    painel.append(el('small', 'Paralaxe e opacidade aparecem no jogo; no editor os objetos ficam onde estão. Sem camadas, tudo funciona como antes.'));
  }
  abrirB.addEventListener('click', () => { painel.hidden = !painel.hidden; if (!painel.hidden) desenhar(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') painel.hidden = true; });
  const antes = ed.aoSelecionar; ed.aoSelecionar = () => { if (antes) antes(); if (!painel.hidden) desenhar(); };
  root.EditorCamadas = { estado: est };
})(window);
