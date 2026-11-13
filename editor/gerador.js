/* Editor · gerador de código dos blocos (sem DOM, testável em Node).
   Blocos são DADOS ({ t: 'tipo', ...campos }); aqui eles viram o mesmo JavaScript que se escreveria à mão
   (função iniciar / atualizar / const eventos), que o motor compila. Assim blocos e código são o mesmo formato. */
(function (root) {
  const E = root.EditorBlocos = root.EditorBlocos || {};
  const NOME = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const ACOES = ['esquerda', 'direita', 'cima', 'baixo', 'acao'];
  const OPS = ['<', '<=', '=', '!=', '>=', '>'];
  const erro = m => new Error(m);
  E.ACOES = ACOES; E.OPS = OPS;
  E.VALORES = { num: 'número', txt: 'texto', var: 'variável', x: 'x deste objeto', y: 'y deste objeto', vx: 'velocidade x', vy: 'velocidade y', eixoX: 'setas: eixo x', eixoY: 'setas: eixo y', tempo: 'tempo de jogo (s)', rand: 'aleatório entre…', outro: 'nome do outro objeto', attr: 'atributo de um objeto', op: 'conta (+ − × ÷ …)', contar: 'quantos objetos com etiqueta', item: 'item N da lista', tam: 'tamanho da lista', itemrand: 'item aleatório da lista', it: 'item atual (dentro de "para cada item")', mx: 'mouse: posição x (mundo)', my: 'mouse: posição y (mundo)' };
  E.CONTAS = [['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷'], ['%', 'resto'], ['min', 'menor de'], ['max', 'maior de']];
  E.LOGICOS = [['cmp', 'comparar'], ['tecla', 'tecla'], ['e', 'e (ambas)'], ['ou', 'ou (uma delas)'], ['nao', 'não'], ['etiq', 'tem etiqueta'], ['mouse', 'mouse'], ['sobre', 'mouse sobre objeto'], ['contem', 'lista contém']];
  // Atributos que os blocos genéricos sabem ler/mudar: componente, propriedade e tipo
  const ATTRS = E.ATTRS = { x: { c: 'Transform', p: 'x', t: 'num' }, y: { c: 'Transform', p: 'y', t: 'num' }, vx: { c: 'Velocity', p: 'vx', t: 'num' }, vy: { c: 'Velocity', p: 'vy', t: 'num' }, cor: { c: 'Sprite', p: 'cor', t: 'txt' }, texto: { c: 'Sprite', p: 'rotulo', t: 'txt' }, corTexto: { c: 'Sprite', p: 'corTexto', t: 'txt' }, raio: { c: 'Sprite', p: 'raio', t: 'num' }, tamanhoTexto: { c: 'Sprite', p: 'tamanhoTexto', t: 'num' }, alinhar: { c: 'Sprite', p: 'alinhar', t: 'txt' }, fonte: { c: 'Sprite', p: 'fonte', t: 'txt' } };
  E.ATTR_NOMES = [['x', 'x'], ['y', 'y'], ['vx', 'velocidade x'], ['vy', 'velocidade y'], ['cor', 'cor'], ['texto', 'texto'], ['corTexto', 'cor do texto'], ['raio', 'raio (visual)'], ['tamanhoTexto', 'tamanho do texto'], ['alinhar', 'alinhamento (esquerda/centro/direita)'], ['fonte', 'fonte do texto']];
  function objExpr(o) {
    if (o === 'proprio' || o === undefined) return 'e';
    if (o === 'outro') return "(typeof d !== 'undefined' && d ? ctx.scene.get(d.outro) : null)";
    if (o === 'cada') return 'it';
    if (o === 'pai') return '((o) => (o && o.Pai ? ctx.scene.get(o.Pai.id) : null))(e)';
    if (typeof o === 'string' && o.startsWith('p:') && o.length > 2 && o.length < 35) return '((tag) => { let m = null, dm = Infinity; for (const o of ctx.scene.query("Etiquetas", "Transform")) { if (o !== e && o.Etiquetas.includes(tag)) { const dx = o.Transform.x - e.Transform.x, dy = o.Transform.y - e.Transform.y, dd = dx * dx + dy * dy; if (dd < dm) { dm = dd; m = o; } } } return m; })(' + JSON.stringify(o.slice(2)) + ')';
    if (typeof o === 'string' && o.startsWith('n:') && o.length > 2 && o.length < 45) return 'ctx.scene.find(' + JSON.stringify(o.slice(2)) + ')';
    throw erro('objeto inválido: ' + o);
  }
  function tagStr(t) { if (typeof t !== 'string' || t.length < 1 || t.length > 30) throw erro('escreva uma etiqueta (1 a 30 letras)'); return JSON.stringify(t); }
  function listaStr(n) { if (typeof n !== 'string' || !NOME.test(n)) throw erro('escolha um nome de lista (letras, números e _)'); return JSON.stringify(n); }
  function attrDef(a) { if (typeof a === 'string' && a.startsWith('a:')) { if (!NOME.test(a.slice(2))) throw erro('nome de atributo inválido: ' + a.slice(2)); return { c: 'Attr', p: a.slice(2), t: 'any' }; } const d = ATTRS[a]; if (!d) throw erro('atributo desconhecido: ' + a); return d; }

  function nomeVar(n) { if (typeof n !== 'string' || !NOME.test(n)) throw erro('escolha uma variável válida'); return JSON.stringify(n); }
  function valor(v) {
    v = v || { k: 'num', v: 0 };
    switch (v.k) {
      case 'num': { const n = Number(v.v); if (!isFinite(n)) throw erro('número inválido: ' + v.v); return String(n); }
      case 'txt': return JSON.stringify(String(v.v == null ? '' : v.v));
      case 'var': return 'ctx.vars.ler(' + nomeVar(v.n) + ')';
      case 'x': return 'e.Transform.x';
      case 'y': return 'e.Transform.y';
      case 'vx': return '(e.Velocity ? e.Velocity.vx : 0)';
      case 'vy': return '(e.Velocity ? e.Velocity.vy : 0)';
      case 'eixoX': return 'ctx.input.axes.x';
      case 'eixoY': return 'ctx.input.axes.y';
      case 'tempo': return 'ctx.engine.tempo';
      case 'rand': { const a = Number(v.min), b = Number(v.max); if (!isFinite(a) || !isFinite(b)) throw erro('aleatório: mínimo e máximo precisam ser números'); return 'ctx.engine.aleatorio(' + a + ', ' + b + ')'; }
      case 'outro': return "(typeof d !== 'undefined' && d && ctx.scene.get(d.outro) ? ctx.scene.get(d.outro).nome : '')";
      case 'attr': { const d = attrDef(v.a); if (d.t === 'any') return '((o) => (o && o.' + d.c + ' && o.' + d.c + '.' + d.p + ' !== undefined ? o.' + d.c + '.' + d.p + ' : 0))(' + objExpr(v.o) + ')'; return '((o) => (o && o.' + d.c + ' ? o.' + d.c + '.' + d.p + ' : ' + (d.t === 'num' ? '0' : "''") + '))(' + objExpr(v.o) + ')'; }
      case 'mx': return 'ctx.input.pointer.x';
      case 'my': return 'ctx.input.pointer.y';
      case 'item': return '(ctx.listas.item(' + listaStr(v.l) + ', Math.floor(Number(' + valor(v.i) + ')) - 1) ?? 0)';
      case 'tam': return 'ctx.listas.tamanho(' + listaStr(v.l) + ')';
      case 'itemrand': return '(ctx.listas.aleatorio(' + listaStr(v.l) + ') ?? 0)';
      case 'it': return '_item';
      case 'contar': return 'ctx.scene.query("Etiquetas").filter(o => o.Etiquetas.includes(' + tagStr(v.tag) + ')).length';
      case 'op': {
        const o = v.o, a = valor(v.a), b = valor(v.b);
        if (['+', '-', '*', '/', '%'].includes(o)) return '(' + a + ' ' + o + ' ' + b + ')';
        if (o === 'min' || o === 'max') return 'Math.' + o + '(' + a + ', ' + b + ')';
        throw erro('conta desconhecida: ' + o);
      }
    }
    throw erro('tipo de valor desconhecido: ' + v.k);
  }
  function cond(c) {
    c = c || {};
    if (c.k === 'tecla' && c.tecla !== undefined) {   // tecla livre, pelo nome (e.key em minúsculas)
      if (typeof c.tecla !== 'string' || c.tecla.length < 1 || c.tecla.length > 20) throw erro('escolha uma tecla');
      return 'ctx.input.' + (c.modo === 'pressed' ? 'keysPressed' : 'keys') + '.has(' + JSON.stringify(c.tecla.toLowerCase()) + ')';
    }
    if (c.k === 'tecla') {
      if (!ACOES.includes(c.acao)) throw erro('tecla desconhecida: ' + c.acao);
      return 'ctx.input.' + (c.modo === 'pressed' ? 'pressed' : 'down') + '.has(' + JSON.stringify(c.acao) + ')';
    }
    if (c.k === 'cmp') {
      if (!OPS.includes(c.op)) throw erro('operador desconhecido: ' + c.op);
      return '(' + valor(c.a) + ' ' + (c.op === '=' ? '===' : c.op === '!=' ? '!==' : c.op) + ' ' + valor(c.b) + ')';
    }
    if (c.k === 'e' || c.k === 'ou') return '(' + cond(c.a) + (c.k === 'e' ? ' && ' : ' || ') + cond(c.b) + ')';
    if (c.k === 'mouse') return 'ctx.input.pointer.' + (c.modo === 'pressed' ? 'pressed' : 'down');
    if (c.k === 'sobre') return '((o) => !!o && ctx.sobre(o))(' + objExpr(c.o) + ')';
    if (c.k === 'contem') return 'ctx.listas.contem(' + listaStr(c.l) + ', ' + valor(c.v) + ')';
    if (c.k === 'etiq') return '((o) => !!(o && o.Etiquetas && o.Etiquetas.includes(' + tagStr(c.tag) + ')))(' + objExpr(c.o) + ')';
    if (c.k === 'nao') return '(!' + cond(c.a) + ')';
    throw erro('condição desconhecida: ' + c.k);
  }
  // Nome amigável de uma tecla para a interface
  E.nomeTecla = k => ({ ' ': 'Espaço', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', enter: 'Enter', escape: 'Esc', shift: 'Shift', control: 'Ctrl', alt: 'Alt', tab: 'Tab', backspace: 'Apagar' }[k] || (k.length === 1 ? k.toUpperCase() : k));
  const INI = { Velocity: 'if (!o.Velocity) o.Velocity = { vx: 0, vy: 0 }; ', Attr: 'if (!o.Attr) o.Attr = {}; ' };
  const N = (x, d) => ({ k: 'num', v: x });
  // Definição dos blocos: cat (menu), campos (como o editor desenha), ger (linhas de código). Filhos: f (então/dentro) e s (senão).
  const BLOCOS = {
    mover_x: { cat: 'Movimento', campos: [{ t: 'mudar x em' }, { n: 'v', tipo: 'valor', padrao: N(60) }, { t: 'por segundo' }], ger: b => ['e.Transform.x += ' + valor(b.v) + ' * dt;'] },
    mover_y: { cat: 'Movimento', campos: [{ t: 'mudar y em' }, { n: 'v', tipo: 'valor', padrao: N(60) }, { t: 'por segundo' }], ger: b => ['e.Transform.y += ' + valor(b.v) + ' * dt;'] },
    setas: { cat: 'Movimento', campos: [{ t: 'andar com as setas a' }, { n: 'v', tipo: 'valor', padrao: N(120) }, { t: 'por segundo' }], ger: b => ['e.Transform.x += ctx.input.axes.x * ' + valor(b.v) + ' * dt;', 'e.Transform.y += ctx.input.axes.y * ' + valor(b.v) + ' * dt;'] },
    ir_para: { cat: 'Movimento', campos: [{ t: 'ir para x' }, { n: 'vx', tipo: 'valor', padrao: N(400) }, { t: 'y' }, { n: 'vy', tipo: 'valor', padrao: N(225) }], ger: b => ['e.Transform.x = ' + valor(b.vx) + ';', 'e.Transform.y = ' + valor(b.vy) + ';'] },
    vel_x: { cat: 'Movimento', campos: [{ t: 'velocidade x =' }, { n: 'v', tipo: 'valor', padrao: N(0) }], ger: b => ['if (e.Velocity) e.Velocity.vx = ' + valor(b.v) + ';'] },
    vel_y: { cat: 'Movimento', campos: [{ t: 'velocidade y =' }, { n: 'v', tipo: 'valor', padrao: N(0) }], ger: b => ['if (e.Velocity) e.Velocity.vy = ' + valor(b.v) + ';'] },
    mudar_attr: { cat: 'Objeto', menu: 'mudar atributo de um objeto', campos: [{ t: 'mudar' }, { n: 'o', tipo: 'obj', padrao: 'proprio' }, { n: 'a', tipo: 'attr', padrao: 'x' }, { t: 'para' }, { n: 'v', tipo: 'valor', padrao: N(0) }],
      ger: b => { const d = attrDef(b.a), v = valor(b.v), ini = INI[d.c] || '', ok = (INI[d.c] ? 'true' : 'o.' + d.c);
        const atrib = d.t === 'num' ? 'Number(v)' : d.t === 'any' ? "(typeof v === 'number' || typeof v === 'boolean' ? v : String(v))" : 'String(v)';
        return ['{', '  const o = ' + objExpr(b.o) + ', v = ' + v + ';', '  if (o && ' + ok + (d.t === 'num' ? ' && isFinite(Number(v))' : '') + ') { ' + ini + 'o.' + d.c + '.' + d.p + ' = ' + atrib + '; }', '}']; } },
    somar_attr: { cat: 'Objeto', menu: 'somar a um atributo de um objeto', campos: [{ t: 'somar' }, { n: 'v', tipo: 'valor', padrao: N(1) }, { t: 'em' }, { n: 'o', tipo: 'obj', padrao: 'proprio' }, { n: 'a', tipo: 'attr', padrao: 'x' }],
      ger: b => { const d = attrDef(b.a); if (d.t === 'txt') throw erro('só dá para somar em atributos numéricos'); const ini = INI[d.c] || '', ok = (INI[d.c] ? 'true' : 'o.' + d.c);
        return ['{', '  const o = ' + objExpr(b.o) + ', v = Number(' + valor(b.v) + ');', '  if (o && isFinite(v) && ' + ok + ') { ' + ini + 'o.' + d.c + '.' + d.p + ' = (Number(o.' + d.c + '.' + d.p + ') || 0) + v; }', '}']; } },
    lista_add: { cat: 'Listas', menu: 'adicionar à lista', campos: [{ t: 'adicionar' }, { n: 'v', tipo: 'valor', padrao: N(1) }, { t: 'à lista' }, { n: 'l', tipo: 'txt', padrao: 'inventario' }], ger: b => ['ctx.listas.adicionar(' + listaStr(b.l) + ', ' + valor(b.v) + ');'] },
    lista_set: { cat: 'Listas', menu: 'trocar item da lista', campos: [{ t: 'trocar o item' }, { n: 'i', tipo: 'valor', padrao: N(1) }, { t: 'da lista' }, { n: 'l', tipo: 'txt', padrao: 'inventario' }, { t: 'por' }, { n: 'v', tipo: 'valor', padrao: N(0) }],
      ger: b => ['{', '  const n = ' + listaStr(b.l) + ', i = Math.floor(Number(' + valor(b.i) + ')) - 1;', '  if (i >= 0 && i < ctx.listas.tamanho(n)) ctx.listas.definir(n, i, ' + valor(b.v) + ');', '}'] },
    lista_rem: { cat: 'Listas', menu: 'remover item da lista', campos: [{ t: 'remover o item' }, { n: 'i', tipo: 'valor', padrao: N(1) }, { t: 'da lista' }, { n: 'l', tipo: 'txt', padrao: 'inventario' }],
      ger: b => ['{', '  const n = ' + listaStr(b.l) + ', i = Math.floor(Number(' + valor(b.i) + ')) - 1;', '  if (i >= 0 && i < ctx.listas.tamanho(n)) ctx.listas.remover(n, i);', '}'] },
    lista_limpar: { cat: 'Listas', menu: 'esvaziar lista', campos: [{ t: 'esvaziar a lista' }, { n: 'l', tipo: 'txt', padrao: 'inventario' }], ger: b => ['ctx.listas.limpar(' + listaStr(b.l) + ');'] },
    para_cada_item: { cat: 'Listas', menu: 'para cada item da lista', campos: [{ t: 'para cada item da lista' }, { n: 'l', tipo: 'txt', padrao: 'inventario' }, { t: 'faça (use "item atual")' }], filhos: ['f'],
      ger: (b, g) => ['for (const _item of ctx.listas.todos(' + listaStr(b.l) + ')) {', ...g.lista(b.f), '}'] },
    escrever: { cat: 'Controle', menu: 'escrever no output', campos: [{ t: 'escrever no output' }, { n: 'v', tipo: 'valor', padrao: { k: 'txt', v: 'olá' } }], ger: b => ['ctx.escrever(' + valor(b.v) + ');'] },
    aguardar: { cat: 'Controle', menu: 'aguardar N segundos', campos: [{ t: 'aguardar' }, { n: 's', tipo: 'valor', padrao: N(1) }, { t: 'segundos e então continuar' }], espera: true, ger: () => [] },
    alterar_grad: { cat: 'Objeto', menu: 'alterar um atributo aos poucos', campos: [{ t: 'alterar' }, { n: 'o', tipo: 'obj', padrao: 'proprio' }, { n: 'a', tipo: 'attr', padrao: 'x' }, { t: 'para' }, { n: 'v', tipo: 'valor', padrao: N(100) }, { t: 'em' }, { n: 's', tipo: 'valor', padrao: N(1) }, { t: 's, curva' }, { n: 'cv', tipo: 'sel', ops: [['suave', 'suave'], ['linear', 'constante'], ['entrada', 'acelera'], ['saida', 'desacelera']], padrao: 'suave' }],
      ger: b => { const d = attrDef(b.a); if (d.t === 'txt') throw erro('só dá para alterar aos poucos atributos numéricos'); const cv = b.cv || 'suave'; if (!['suave', 'linear', 'entrada', 'saida'].includes(cv)) throw erro('curva inválida: ' + cv);
        const ini = INI[d.c] || '', ok = (INI[d.c] ? 'true' : 'o.' + d.c), alvo = 'o.' + d.c;
        return ['{', '  const o = ' + objExpr(b.o) + ', v = Number(' + valor(b.v) + '), s = Number(' + valor(b.s) + ');', '  if (o && ' + ok + ' && isFinite(v) && isFinite(s) && s >= 0) { ' + ini + 'if (typeof ' + alvo + '.' + d.p + ' !== "number") ' + alvo + '.' + d.p + ' = 0; ctx.tween(' + alvo + ', ' + JSON.stringify(d.p) + ', v, s, ' + JSON.stringify(cv) + '); }', '}']; } },
    adotar: { cat: 'Objeto', menu: 'tornar filho de outro objeto', campos: [{ t: 'tornar' }, { n: 'o', tipo: 'obj', padrao: 'proprio' }, { t: 'filho de' }, { n: 'p', tipo: 'obj', padrao: 'outro' }], ger: b => ['ctx.scene.adotar(' + objExpr(b.o) + ', ' + objExpr(b.p) + ');'] },
    soltar: { cat: 'Objeto', menu: 'soltar do pai', campos: [{ t: 'soltar' }, { n: 'o', tipo: 'obj', padrao: 'proprio' }, { t: 'do pai' }], ger: b => ['ctx.scene.soltar(' + objExpr(b.o) + ');'] },
    etiquetar: { cat: 'Objeto', menu: 'dar etiqueta a um objeto', campos: [{ t: 'dar a' }, { n: 'o', tipo: 'obj', padrao: 'proprio' }, { t: 'a etiqueta' }, { n: 'tag', tipo: 'txt', padrao: 'inimigo' }], ger: b => ['{', '  const o = ' + objExpr(b.o) + ', t = ' + tagStr(b.tag) + ';', '  if (o) { if (!o.Etiquetas) o.Etiquetas = []; if (!o.Etiquetas.includes(t) && o.Etiquetas.length < 20) o.Etiquetas.push(t); }', '}'] },
    clonar: { cat: 'Objeto', menu: 'criar cópia de um objeto (modelo)', campos: [{ t: 'criar cópia de' }, { n: 'nome', tipo: 'objn', padrao: '' }, { t: 'em x' }, { n: 'vx', tipo: 'valor', padrao: { k: 'x' } }, { t: 'y' }, { n: 'vy', tipo: 'valor', padrao: { k: 'y' } }],
      ger: b => { if (typeof b.nome !== 'string' || !b.nome) throw erro('escolha o objeto a copiar'); return ['{', '  const src = ctx.scene.find(' + JSON.stringify(b.nome) + ');', '  if (src) ctx.scene.clonar(src, { x: ' + valor(b.vx) + ', y: ' + valor(b.vy) + ' });', '}']; } },
    para_cada: { cat: 'Controle', menu: 'para cada objeto com etiqueta', campos: [{ t: 'para cada objeto com a etiqueta' }, { n: 'tag', tipo: 'txt', padrao: 'inimigo' }, { t: 'faça (use "cada objeto")' }], filhos: ['f'],
      ger: (b, g) => ['for (const it of ctx.scene.query("Etiquetas")) {', '  if (!it.Etiquetas.includes(' + tagStr(b.tag) + ') || !ctx.scene.get(it.id)) continue;', ...g.lista(b.f), '}'] },
    repetir: { cat: 'Controle', menu: 'repetir N vezes', campos: [{ t: 'repetir' }, { n: 'n', tipo: 'valor', padrao: N(3) }, { t: 'vezes (máx. 1000)' }], filhos: ['f'],
      ger: (b, g) => { const k = '_i' + g.id(); return ['for (let ' + k + ' = 0, ' + k + 'n = Math.min(Math.floor(Number(' + valor(b.n) + ')) || 0, 1000); ' + k + ' < ' + k + 'n; ' + k + '++) {', ...g.lista(b.f), '}']; } },
    enquanto: { cat: 'Controle', menu: 'repetir enquanto', campos: [{ t: 'repetir enquanto' }, { n: 'c', tipo: 'cond' }], filhos: ['f'],
      ger: (b, g) => { const k = '_g' + g.id(); return ['{', '  let ' + k + ' = 0;', '  while (' + cond(b.c) + ' && ' + k + '++ < 10000) {', ...g.lista(b.f).map(l => '  ' + l), '  }', '}']; } },
    chance: { cat: 'Controle', menu: '% de chance de', campos: [{ t: '' }, { n: 'p', tipo: 'valor', padrao: N(50) }, { t: '% de chance de' }], filhos: ['f', 's'], ger: (b, g) => ['if (ctx.engine.aleatorio(0, 100) < ' + valor(b.p) + ') {', ...g.lista(b.f), ...(b.s && b.s.length ? ['} else {', ...g.lista(b.s)] : []), '}'] },
    sair: { cat: 'Controle', menu: 'sair do script (parar aqui)', campos: [{ t: 'sair do script' }], ger: () => ['return;'] },
    observar: { cat: 'Ferramentas', menu: 'observar valor', campos: [{ t: 'observar' }, { n: 'rot', tipo: 'txt', padrao: 'valor' }, { n: 'v', tipo: 'valor', padrao: N(0) }], ger: b => { if (typeof b.rot !== 'string' || !b.rot) throw erro('dê um nome ao valor observado'); return ['ctx.engine.observar(' + JSON.stringify(b.rot.slice(0, 30)) + ', ' + valor(b.v) + ');']; } },
    comentario: { cat: 'Ferramentas', menu: 'comentário', campos: [{ t: 'comentário:' }, { n: 'txt', tipo: 'txt', padrao: '' }], ger: b => ['// ' + String(b.txt == null ? '' : b.txt).replace(/[\r\n\u2028\u2029]+/g, ' ').slice(0, 200)] },
    ir_cena: { cat: 'Cena', menu: 'ir para a cena', campos: [{ t: 'ir para a cena' }, { n: 'cena', tipo: 'cena', padrao: '' }], ger: b => { if (typeof b.cena !== 'string' || !b.cena) throw erro('escolha a cena'); return ['ctx.engine.irPara(' + JSON.stringify(b.cena) + ');']; } },
    camera_seguir: { cat: 'Cena', menu: 'câmera: seguir objeto', campos: [{ t: 'câmera segue' }, { n: 'nome', tipo: 'objn', padrao: '' }], ger: b => ['{', '  const cam = ctx.scene.estado.camera || (ctx.scene.estado.camera = { x: ctx.tela.largura / 2, y: ctx.tela.altura / 2, zoom: 1, suavizar: 8 });', '  cam.seguir = ' + JSON.stringify(typeof b.nome === 'string' ? b.nome : '') + ';', '}'] },
    camera_zoom: { cat: 'Cena', menu: 'câmera: zoom', campos: [{ t: 'câmera: zoom' }, { n: 'v', tipo: 'valor', padrao: N(1) }], ger: b => ['{', '  const cam = ctx.scene.estado.camera || (ctx.scene.estado.camera = { x: ctx.tela.largura / 2, y: ctx.tela.altura / 2, zoom: 1, suavizar: 8 });', '  const z = Number(' + valor(b.v) + ');', '  if (isFinite(z) && z > 0.05 && z < 20) cam.zoom = z;', '}'] },
    camera_pos: { cat: 'Cena', menu: 'câmera: ir para x, y', campos: [{ t: 'câmera vai para x' }, { n: 'vx', tipo: 'valor', padrao: N(400) }, { t: 'y' }, { n: 'vy', tipo: 'valor', padrao: N(225) }], ger: b => ['{', '  const cam = ctx.scene.estado.camera || (ctx.scene.estado.camera = { x: ctx.tela.largura / 2, y: ctx.tela.altura / 2, zoom: 1, suavizar: 8 });', '  const cx = Number(' + valor(b.vx) + '), cy = Number(' + valor(b.vy) + ');', '  if (isFinite(cx) && isFinite(cy)) { cam.seguir = ""; cam.x = cx; cam.y = cy; }', '}'] },
    var_definir: { cat: 'Variáveis', campos: [{ t: 'definir' }, { n: 'var', tipo: 'var' }, { t: 'para' }, { n: 'v', tipo: 'valor', padrao: N(0) }], ger: b => ['ctx.vars.definir(' + nomeVar(b.var) + ', ' + valor(b.v) + ');'] },
    var_somar: { cat: 'Variáveis', campos: [{ t: 'somar' }, { n: 'v', tipo: 'valor', padrao: N(1) }, { t: 'em' }, { n: 'var', tipo: 'var' }], ger: b => ['ctx.vars.somar(' + nomeVar(b.var) + ', ' + valor(b.v) + ');'] },
    se: { cat: 'Controle', campos: [{ t: 'se' }, { n: 'c', tipo: 'cond' }], filhos: ['f', 's'], ger: (b, g) => ['if (' + cond(b.c) + ') {', ...g.lista(b.f), ...(b.s && b.s.length ? ['} else {', ...g.lista(b.s)] : []), '}'] },
    cor: { cat: 'Aparência', campos: [{ t: 'mudar a cor para' }, { n: 'cor', tipo: 'cor', padrao: '#ff5555' }], ger: b => ['if (e.Sprite) e.Sprite.cor = ' + JSON.stringify(String(b.cor || '#ffffff')) + ';'] },
    criar: { cat: 'Objeto', menu: 'criar objeto', campos: [{ t: 'criar' }, { n: 'nome', tipo: 'txt', padrao: 'criado' }, { n: 'forma', tipo: 'sel', ops: [['circulo', 'círculo'], ['retangulo', 'quadrado']], padrao: 'circulo' }, { t: 'de tamanho' }, { n: 'tam', tipo: 'valor', padrao: N(16) }, { t: 'em x' }, { n: 'vx', tipo: 'valor', padrao: { k: 'x' } }, { t: 'y' }, { n: 'vy', tipo: 'valor', padrao: { k: 'y' } }, { t: 'cor' }, { n: 'cor', tipo: 'cor', padrao: '#44ddaa' }, { n: 'tipo', tipo: 'sel', ops: [['dinamico', 'com física'], ['parado', 'parado (sólido)'], ['sensor', 'sensor (atravessável)'], ['sem', 'sem colisão']], padrao: 'dinamico' }, { t: 'script' }, { n: 'script', tipo: 'script', padrao: '' }],
      ger: b => {
        const forma = b.forma === 'retangulo' ? 'retangulo' : 'circulo', tipo = ['dinamico', 'parado', 'sensor', 'sem'].includes(b.tipo) ? b.tipo : 'dinamico', cor = JSON.stringify(String(b.cor || '#44ddaa'));
        const nome = JSON.stringify(String(b.nome == null || b.nome === '' ? 'criado' : b.nome).slice(0, 40));
        if (b.script && !NOME.test(b.script)) throw erro('nome de script inválido: ' + b.script);
        const dim = forma === 'circulo' ? 'raio: t' : 'w: 2 * t, h: 2 * t';
        const corpo = tipo === 'sem' ? [] : ['  Body: { forma: ' + JSON.stringify(forma) + ', ' + dim + ', massa: ' + (tipo === 'dinamico' ? 1 : 0) + (tipo === 'sensor' ? ', sensor: true' : ', elasticidade: 0.5') + ' },'];
        return ['{', '  const t = ' + valor(b.tam) + ';', '  ctx.scene.create({', '  nome: ' + nome + ',', '  Transform: { x: ' + valor(b.vx) + ', y: ' + valor(b.vy) + ' },', ...corpo, ...(b.script ? ['  Script: { nome: ' + JSON.stringify(b.script) + ' },'] : []), '  Sprite: { ' + (forma === 'circulo' ? 'forma: "circulo", raio: t' : 'w: 2 * t, h: 2 * t') + ', cor: ' + cor + ' }', '  });', '}'];
      } },
    texto: { cat: 'Aparência', menu: 'mudar o texto', campos: [{ t: 'mudar o texto para' }, { n: 'a', tipo: 'valor', padrao: { k: 'txt', v: 'Pontos: ' } }, { n: 'b', tipo: 'valor', padrao: { k: 'num', v: 0 } }], ger: b => ['if (e.Sprite) e.Sprite.rotulo = String(' + valor(b.a) + ') + String(' + valor(b.b) + ');'] },
    temporizador: { cat: 'Controle', menu: 'a cada … segundos', campos: [{ t: 'a cada' }, { n: 'v', tipo: 'valor', padrao: N(1) }, { t: 'segundos faça' }], filhos: ['f'],
      ger: (b, g) => { const k = JSON.stringify('t' + g.id()); return ['{', '  const st = e.Script.estado, iv = ' + valor(b.v) + ';', '  st[' + k + '] = (st[' + k + '] || 0) + dt;', '  if (iv > 0 && st[' + k + '] >= iv) {', '    st[' + k + '] = 0;', ...g.lista(b.f).map(l => '  ' + l), '  }', '}']; } },
    bipe: { cat: 'Som', menu: 'tocar bipe', campos: [{ t: 'tocar bipe de' }, { n: 'hz', tipo: 'valor', padrao: N(440) }, { t: 'Hz por' }, { n: 's', tipo: 'valor', padrao: N(0.15) }, { t: 's' }], ger: b => ['if (ctx.audio) ctx.audio.bipe(' + valor(b.hz) + ', ' + valor(b.s) + ');'] },
    depois: { cat: 'Controle', menu: 'depois de … segundos (uma vez)', campos: [{ t: 'depois de' }, { n: 'v', tipo: 'valor', padrao: N(2) }, { t: 'segundos, fazer uma vez' }], filhos: ['f'],
      ger: (b, g) => { const k = JSON.stringify('t' + g.id()); return ['{', '  const st = e.Script.estado, n = ' + valor(b.v) + ';', '  if (!st[' + k + ' + "f"]) {', '    st[' + k + '] = (st[' + k + '] || 0) + dt;', '    if (st[' + k + '] >= n) {', '      st[' + k + ' + "f"] = true;', ...g.lista(b.f).map(l => '    ' + l), '    }', '  }', '}']; } },
    som: { cat: 'Som', menu: 'tocar som pronto', campos: [{ t: 'tocar som' }, { n: 'som', tipo: 'sel', ops: ['bip', 'moeda', 'pulo', 'acerto', 'explosao'], padrao: 'moeda' }], ger: b => { if (!['bip', 'moeda', 'pulo', 'acerto', 'explosao'].includes(b.som)) throw erro('som desconhecido: ' + b.som); return ['if (ctx.audio) ctx.audio.efeito(' + JSON.stringify(b.som) + ');']; } },
    reiniciar: { cat: 'Controle', menu: 'reiniciar o jogo', campos: [{ t: 'reiniciar o jogo' }], ger: () => ['ctx.engine.reiniciar();'] },
    remover: { cat: 'Objeto', campos: [{ t: 'remover este objeto' }], ger: () => ['ctx.scene.destroy(e.id);'] },
    remover_outro: { cat: 'Objeto', campos: [{ t: 'remover o outro objeto (em colisão/gatilho)' }], ger: () => ["if (typeof d !== 'undefined' && d) ctx.scene.destroy(d.outro);"] }
  };
  const HATS = {
    evento_inicio: { rotulo: 'quando o jogo começa', sec: 'inicio' },
    evento_quadro: { rotulo: 'a cada quadro (60 vezes por segundo)', sec: 'quadro' },
    evento_colisao: { rotulo: 'quando este objeto colidir', sec: 'colisao' },
    evento_clique: { rotulo: 'quando clicarem neste objeto', sec: 'clique' },
    evento_gatilho: { rotulo: 'quando este objeto entrar/ficar numa zona (gatilho)', sec: 'gatilho' }
  };
  E.BLOCOS = BLOCOS; E.HATS = HATS;

  let contador = 0;   // numera os temporizadores de uma geração (chave do estado de cada um)
  const ind = (linhas, n) => linhas.map(l => '  '.repeat(n) + l);
  function lista(arr, nivel) {
    if (!Array.isArray(arr)) throw erro('lista de blocos inválida');
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i], def = b && BLOCOS[b.t]; if (!def) throw erro('bloco desconhecido: ' + (b && b.t));
      if (def.espera) {   // aguardar: tudo que vem depois só roda quando o tempo passar (relógio do jogo; Parar/reiniciar cancela)
        out.push('ctx.depois(Math.max(0, Number(' + valor(b.s) + ') || 0), () => {', ...ind(lista(arr.slice(i + 1), 0), 1), '});'); break;
      }
      out.push(...def.ger(b, { lista: l => ind(lista(l, 0), 1), id: () => contador++ }));
    }
    return ind(out, nivel);
  }
  E.gerar = function (blocos) {
    if (!Array.isArray(blocos)) throw erro('blocos inválidos'); contador = 0;
    const sec = { inicio: [], quadro: [], colisao: [], gatilho: [], clique: [] };
    for (const h of blocos) { const d = h && HATS[h.t]; if (!d) throw erro('comece com um bloco de evento'); sec[d.sec].push(...lista(h.f || [], 0)); }
    const out = ['// Gerado pelos blocos. Edite os blocos: este texto é refeito a cada mudança.'];
    if (sec.inicio.length) out.push('function iniciar(e, ctx) {', '  const dt = ctx.dt;', ...ind(sec.inicio, 1), '}');
    if (sec.quadro.length) out.push('function atualizar(e, dt, ctx) {', ...ind(sec.quadro, 1), '}');
    const ev = [];
    if (sec.colisao.length) ev.push(['  colisao(e, d, ctx) {', '    const dt = ctx.dt;', ...ind(sec.colisao, 2), '  }']);
    if (sec.clique.length) ev.push(['  clique(e, d, ctx) {', '    const dt = ctx.dt;', ...ind(sec.clique, 2), '  }']);
    if (sec.gatilho.length) ev.push(['  gatilho(e, d, ctx) {', '    const dt = ctx.dt;', ...ind(sec.gatilho, 2), '  }']);
    if (ev.length) { out.push('const eventos = {'); ev.forEach((l, i) => out.push(...(i < ev.length - 1 ? [...l.slice(0, -1), l[l.length - 1] + ','] : l))); out.push('};'); }
    return out.join('\n') + '\n';
  };
  // Bloco novo com valores padrão
  E.novo = function (t) {
    if (HATS[t]) return { t, f: [] };
    const d = BLOCOS[t], b = { t };
    for (const c of d.campos) if (c.n && c.padrao !== undefined) b[c.n] = JSON.parse(JSON.stringify(c.padrao));
    if (d.filhos) b.f = [];
    if (d.filhos && d.filhos.includes('s')) b.s = [];
    if (t === 'se' || t === 'enquanto') b.c = { k: 'cmp', a: { k: 'x' }, op: '>', b: { k: 'num', v: 0 } };
    return b;
  };
})(typeof window !== 'undefined' ? window : globalThis);
