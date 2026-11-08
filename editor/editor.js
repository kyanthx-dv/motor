/* Editor · E1. Só edita a cena (JSON do motor): o motor valida tudo, o editor não tem regras próprias.
   Por quê: o editor de celular (Flutter/WebView) vai editar o MESMO formato. */
(function () {
  const C = Core, $ = id => document.getElementById(id), tela = $('tela');
  const renderer = new C.CanvasRenderer(tela, { largura: 800, altura: 450, fundo: '#2b3a4a' });
  const engine = new C.Engine({ renderer }), cena = engine.scene;
  let sel = null, sujo = true, arrastando = null, salvoPlay = null, input = null;

  function exemplo() {
    cena.create({ nome: 'chao', Transform: { x: 400, y: 430 }, Body: { forma: 'retangulo', w: 760, h: 24, massa: 0, elasticidade: 0.4 }, Sprite: { cor: '#3f6b4a' } });
    cena.create({ nome: 'plataforma', Transform: { x: 560, y: 300 }, Body: { forma: 'retangulo', w: 180, h: 16, massa: 0 }, Sprite: { cor: '#6b4f2f' } });
    cena.create({ nome: 'jogador', Transform: { x: 180, y: 380 }, Velocity: { vx: 0, vy: 0 }, Body: { forma: 'circulo', raio: 18, massa: 1, elasticidade: 0.2 }, Sprite: { forma: 'circulo', raio: 18, cor: '#4aa3ff' }, Controller: { aceleracao: 1500, velMax: 260 } });
    cena.create({ nome: 'bola', Transform: { x: 330, y: 200 }, Body: { forma: 'circulo', raio: 12, massa: 0.5, elasticidade: 0.8 }, Sprite: { forma: 'circulo', raio: 12, cor: '#f5a524' } });
    cena.create({ nome: 'gol', Transform: { x: 700, y: 250 }, Body: { forma: 'retangulo', w: 40, h: 90, massa: 0, sensor: true }, Sprite: { cor: 'rgba(125,220,140,.45)' } });
    engine.vars.declarar('pontos', 0); engine.vars.declarar('fase', 'Fase 1'); engine.vars.declarar('som', true);
  }
  // O renderer interpola com px/py (runtime). Parado, desenhamos sempre na posição atual.
  const sincronizar = () => { for (const e of cena.query('Transform')) { e.Transform.px = e.Transform.x; e.Transform.py = e.Transform.y; } };
  const redesenhar = () => { sujo = true; };
  function loop() { if (sujo) { sujo = false; sincronizar(); renderer.selecionada = sel; renderer.debug = $('c-col').checked; renderer.desenhar(cena, 0, engine); } requestAnimationFrame(loop); }
  new ResizeObserver(redesenhar).observe(tela);   // registrado depois do observer do renderer: ele redimensiona primeiro

  const msg = (t, tipo) => { const m = $('msg'); m.textContent = t || ''; m.className = 'msg ' + (tipo || ''); };
  const el = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; };

  // ---- lista de objetos
  function listar() {
    const ul = $('lista'); ul.innerHTML = ''; const todos = [...cena.entities.values()];
    $('n-obj').textContent = '(' + todos.length + ')';
    for (const e of todos) {
      const li = el('li'), b = el('button'); b.type = 'button'; b.append(el('span', null, e.nome || 'sem nome'), el('i', null, '#' + e.id));
      if (e.id === sel) b.setAttribute('aria-current', 'true'); b.addEventListener('click', () => selecionar(e.id)); li.append(b); ul.append(li);
    }
  }
  function atualizarAcoes() { const tem = sel != null && !!cena.get(sel); $('e-duplicar').disabled = !tem; $('e-remover').disabled = !tem; $('e-play').disabled = engine.rodando; $('e-parar').disabled = !engine.rodando; }
  function selecionar(id) { sel = id != null && cena.get(id) ? id : null; listar(); props(); redesenhar(); atualizarAcoes(); if (window.editor && window.editor.aoSelecionar) window.editor.aoSelecionar(); }
  function nomeLivre(base) { let nome = base, n = 2; while (cena.find(nome)) nome = base + ' ' + n++; return nome; }
  function criar() { const e = cena.create({ nome: nomeLivre('objeto'), Transform: { x: 400, y: 225 }, Body: { forma: 'circulo', raio: 18, massa: 1, elasticidade: 0.4 }, Sprite: { forma: 'circulo', raio: 18, cor: '#a78bfa' } }); selecionar(e.id); msg('Objeto criado.', 'ok'); json(); }
  function duplicar() { const e = cena.get(sel); if (!e) return; const d = JSON.parse(JSON.stringify(e)); delete d.id; d.nome = nomeLivre((e.nome || 'objeto') + ' cópia'); d.Transform.x += 24; d.Transform.y += 24; const novo = cena.create(d); selecionar(novo.id); msg('Objeto duplicado.', 'ok'); json(); }
  function remover() { if (sel == null || !cena.get(sel)) return; cena.destroy(sel); cena.flush(); sel = null; listar(); props(); redesenhar(); atualizarAcoes(); msg('Objeto removido.', 'ok'); json(); }
  function play() { salvoPlay = JSON.stringify(C.Serializer.paraJSON(cena)); input = new Core.Input(tela, renderer); engine.input = input; engine.iniciar(); atualizarAcoes(); msg('Motor em execução.', 'ok'); }
  function parar() { engine.parar(); if (input) { input.destruir(); input = null; engine.input = null; } if (salvoPlay) { try { C.Serializer.deJSON(cena, JSON.parse(salvoPlay)); } catch (x) { msg('Não restaurou a cena: ' + x.message, 'erro'); } salvoPlay = null; selecionar(sel); variaveis(); json(); redesenhar(); } atualizarAcoes(); msg('Motor parado.', 'ok'); }

  // ---- propriedades (só mostra o que a entidade já tem)
  const CAMPOS = {
    Transform: [['x', 'num'], ['y', 'num']],
    Body: [['forma', 'sel', ['circulo', 'retangulo']], ['raio', 'num'], ['w', 'num'], ['h', 'num'], ['massa', 'num'], ['elasticidade', 'num'], ['amortecimento', 'num'], ['sensor', 'bool']],
    Sprite: [['forma', 'sel', ['retangulo', 'circulo']], ['cor', 'cor'], ['w', 'num'], ['h', 'num'], ['raio', 'num']],
    Controller: [['aceleracao', 'num'], ['velMax', 'num']]
  };
  function campo(rotulo, entrada) { const d = el('div', 'campo'), l = el('label', null, rotulo); entrada.id = 'f-' + rotulo + Math.random().toString(36).slice(2, 6); l.htmlFor = entrada.id; d.append(l, entrada); return d; }
  function props() {
    const box = $('props'); box.innerHTML = ''; const e = cena.get(sel);
    if (!e) { box.append(el('div', 'vazio', 'Nenhum objeto selecionado.')); return; }
    const nome = el('input'); nome.value = e.nome; nome.addEventListener('change', () => aplicar(null, 'nome', nome.value)); box.append(campo('nome', nome));
    for (const comp in CAMPOS) {
      if (!e[comp]) continue; const g = el('div', 'grupo'); g.append(el('b', null, comp));
      for (const [k, tipo, op] of CAMPOS[comp]) {
        if (!(k in e[comp])) continue; const v = e[comp][k]; let i;
        if (tipo === 'sel') { i = el('select'); for (const o of op) { const x = el('option', null, o); x.value = o; i.append(x); } i.value = v; }
        else if (tipo === 'bool') { i = el('input'); i.type = 'checkbox'; i.checked = !!v; i.style.width = 'auto'; }
        else if (tipo === 'cor') { i = el('input'); if (/^#[0-9a-f]{6}$/i.test(v)) i.type = 'color'; i.value = v; }
        else { i = el('input'); i.type = 'number'; i.step = 'any'; i.value = v; }
        i.addEventListener('change', () => aplicar(comp, k, tipo === 'num' ? (i.value === '' ? NaN : +i.value) : tipo === 'bool' ? i.checked : i.value));
        g.append(campo(k, i));
      }
      box.append(g);
    }
  }
  // Valida com o próprio motor numa cópia; só aplica se o motor aceitar.
  function aplicar(comp, k, valor) {
    const e = cena.get(sel); if (!e) return; const copia = JSON.parse(JSON.stringify(e));
    if (comp) copia[comp][k] = valor; else copia[k] = valor;
    try { new C.Scene().create(copia); } catch (x) { msg(x.message, 'erro'); props(); return; }
    if (comp) e[comp][k] = valor; else e[k] = valor;
    msg('', ''); listar(); props(); redesenhar(); json();
  }

  // ---- variáveis
  function variaveis() {
    const box = $('vars'); box.innerHTML = ''; const v = engine.vars, todas = v.todas(), nomes = Object.keys(todas);
    $('n-var').textContent = '(' + nomes.length + ')'; if (!nomes.length) box.append(el('div', 'vazio', 'Nenhuma variável.'));
    for (const n of nomes) {
      const t = v.tipo(n), l = el('div', 'var'), nm = el('span', null, n), i = el('input');
      nm.append(el('small', null, ' ' + t)); nm.title = n;
      if (t === 'booleano') { i.type = 'checkbox'; i.checked = todas[n]; i.style.width = 'auto'; } else if (t === 'numero') { i.type = 'number'; i.step = 'any'; i.value = todas[n]; } else i.value = todas[n];
      i.setAttribute('aria-label', 'Valor de ' + n);
      i.addEventListener('change', () => { try { v.definir(n, t === 'booleano' ? i.checked : t === 'numero' ? (i.value === '' ? NaN : +i.value) : i.value); msg('', ''); } catch (x) { msg(x.message, 'erro'); } variaveis(); json(); });
      const rm = el('button', null, '✕'); rm.type = 'button'; rm.title = 'Remover ' + n; rm.setAttribute('aria-label', 'Remover ' + n); rm.addEventListener('click', () => { v.remover(n); variaveis(); json(); });
      l.append(nm, i, rm); box.append(l);
    }
  }
  $('nova-var').addEventListener('submit', ev => {
    ev.preventDefault(); const nome = $('nv-nome').value.trim(), t = $('nv-tipo').value, bruto = $('nv-val').value;
    const val = t === 'numero' ? (bruto === '' ? 0 : +bruto) : t === 'booleano' ? /^(1|true|sim|verdadeiro)$/i.test(bruto) : bruto;
    try { engine.vars.declarar(nome, val); $('nv-nome').value = ''; $('nv-val').value = ''; msg('Variável "' + nome + '" criada.', 'ok'); variaveis(); json(); } catch (x) { msg(x.message, 'erro'); }
  });

  // ---- JSON da cena (salvar/abrir sem arquivo; o motor carrega de forma transacional)
  function json() { $('json').value = JSON.stringify(C.Serializer.paraJSON(cena), null, 1); }
  $('j-ler').addEventListener('click', () => { json(); msg('JSON atualizado.', 'ok'); });
  $('j-aplicar').addEventListener('click', () => {
    try { C.Serializer.deJSON(cena, JSON.parse($('json').value)); msg('Cena carregada.', 'ok'); } catch (x) { msg('Não carregou (a cena atual foi mantida): ' + x.message, 'erro'); return; }
    selecionar(sel); variaveis(); redesenhar();
  });
  $('e-criar').addEventListener('click', criar); $('e-duplicar').addEventListener('click', duplicar); $('e-remover').addEventListener('click', remover);
  $('e-play').addEventListener('click', play); $('e-parar').addEventListener('click', parar);

  // ---- seleção e cursor no canvas
  function mundo(ev) { const b = tela.getBoundingClientRect(); return renderer.telaParaMundo(ev.clientX - b.left, ev.clientY - b.top); }
  function escolher(x, y) {
    let melhor = null, area = Infinity;
    for (const e of cena.entities.values()) {
      if (!e.Transform || (!e.Sprite && !e.Body)) continue; const l = C.CanvasRenderer.limitesDe(e);
      if (Math.abs(x - e.Transform.x - l.ox) <= l.hw && Math.abs(y - e.Transform.y - l.oy) <= l.hh && l.hw * l.hh < area) { area = l.hw * l.hh; melhor = e; }
    }
    return melhor;
  }
  tela.addEventListener('click', ev => { if (arrastando) return; const w = mundo(ev), h = escolher(w.x, w.y); selecionar(h ? h.id : null); });
  tela.addEventListener('pointerdown', ev => { const w = mundo(ev), h = escolher(w.x, w.y); if (!h) return; selecionar(h.id); arrastando = { id: h.id, dx: w.x - h.Transform.x, dy: w.y - h.Transform.y }; tela.setPointerCapture(ev.pointerId); ev.preventDefault(); });
  tela.addEventListener('pointermove', ev => { const w = mundo(ev), h = arrastando && cena.get(arrastando.id); if (h) { h.Transform.x = w.x - arrastando.dx; h.Transform.y = w.y - arrastando.dy; props(); json(); redesenhar(); } const sob = escolher(w.x, w.y); $('status').textContent = 'x ' + Math.round(w.x) + ' · y ' + Math.round(w.y) + (sob ? ' · ' + (sob.nome || 'sem nome') + ' #' + sob.id : ''); });
  tela.addEventListener('pointerup', () => { arrastando = null; });
  $('c-col').addEventListener('change', redesenhar);

  exemplo(); listar(); props(); variaveis(); json(); loop();
  window.editor = { engine, renderer, cena, selecionar, aplicar, escolher, mundo, redesenhar, json, aoSelecionar: null, get sel() { return sel; } };
})();
