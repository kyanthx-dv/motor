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
  E.VALORES = { num: 'número', txt: 'texto', var: 'variável', x: 'x deste objeto', y: 'y deste objeto', vx: 'velocidade x', vy: 'velocidade y', eixoX: 'setas: eixo x', eixoY: 'setas: eixo y', tempo: 'tempo de jogo (s)', rand: 'aleatório entre…', outro: 'nome do outro objeto', attr: 'atributo de um objeto', op: 'conta (+ − × ÷ …)' };
  E.CONTAS = [['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷'], ['%', 'resto'], ['min', 'menor de'], ['max', 'maior de']];
  E.LOGICOS = [['cmp', 'comparar'], ['tecla', 'tecla'], ['e', 'e (ambas)'], ['ou', 'ou (uma delas)'], ['nao', 'não']];
  // Atributos que os blocos genéricos sabem ler/mudar: componente, propriedade e tipo
  const ATTRS = E.ATTRS = { x: { c: 'Transform', p: 'x', t: 'num' }, y: { c: 'Transform', p: 'y', t: 'num' }, vx: { c: 'Velocity', p: 'vx', t: 'num' }, vy: { c: 'Velocity', p: 'vy', t: 'num' }, cor: { c: 'Sprite', p: 'cor', t: 'txt' }, texto: { c: 'Sprite', p: 'rotulo', t: 'txt' }, corTexto: { c: 'Sprite', p: 'corTexto', t: 'txt' }, raio: { c: 'Sprite', p: 'raio', t: 'num' } };
  E.ATTR_NOMES = [['x', 'x'], ['y', 'y'], ['vx', 'velocidade x'], ['vy', 'velocidade y'], ['cor', 'cor'], ['texto', 'texto'], ['corTexto', 'cor do texto'], ['raio', 'raio (visual)']];
  function objExpr(o) {
    if (o === 'proprio' || o === undefined) return 'e';
    if (o === 'outro') return "(typeof d !== 'undefined' && d ? ctx.scene.get(d.outro) : null)";
    if (typeof o === 'string' && o.startsWith('n:') && o.length > 2 && o.length < 45) return 'ctx.scene.find(' + JSON.stringify(o.slice(2)) + ')';
    throw erro('objeto inválido: ' + o);
  }
  function attrDef(a) { const d = ATTRS[a]; if (!d) throw erro('atributo desconhecido: ' + a); return d; }

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
      case 'attr': { const d = attrDef(v.a); return '((o) => (o && o.' + d.c + ' ? o.' + d.c + '.' + d.p + ' : ' + (d.t === 'num' ? '0' : "''") + '))(' + objExpr(v.o) + ')'; }
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
    if (c.k === 'nao') return '(!' + cond(c.a) + ')';
    throw erro('condição desconhecida: ' + c.k);
  }
  // Nome amigável de uma tecla para a interface
  E.nomeTecla = k => ({ ' ': 'Espaço', arrowleft: '←', arrowright: '→', arrowup: '↑', arrowdown: '↓', enter: 'Enter', escape: 'Esc', shift: 'Shift', control: 'Ctrl', alt: 'Alt', tab: 'Tab', backspace: 'Apagar' }[k] || (k.length === 1 ? k.toUpperCase() : k));
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
      ger: b => { const d = attrDef(b.a), v = valor(b.v), ini = d.c === 'Velocity' ? 'if (!o.Velocity) o.Velocity = { vx: 0, vy: 0 }; ' : '';
        return ['{', '  const o = ' + objExpr(b.o) + ', v = ' + v + ';', '  if (o && (o.' + d.c + (d.c === 'Velocity' ? ' || true' : '') + ')' + (d.t === 'num' ? ' && isFinite(Number(v))' : '') + ') { ' + ini + 'o.' + d.c + '.' + d.p + ' = ' + (d.t === 'num' ? 'Number(v)' : 'String(v)') + '; }', '}']; } },
    somar_attr: { cat: 'Objeto', menu: 'somar a um atributo de um objeto', campos: [{ t: 'somar' }, { n: 'v', tipo: 'valor', padrao: N(1) }, { t: 'em' }, { n: 'o', tipo: 'obj', padrao: 'proprio' }, { n: 'a', tipo: 'attr', padrao: 'x' }],
      ger: b => { const d = attrDef(b.a); if (d.t !== 'num') throw erro('só dá para somar em atributos numéricos'); const ini = d.c === 'Velocity' ? 'if (!o.Velocity) o.Velocity = { vx: 0, vy: 0 }; ' : '';
        return ['{', '  const o = ' + objExpr(b.o) + ', v = Number(' + valor(b.v) + ');', '  if (o && isFinite(v) && (o.' + d.c + (d.c === 'Velocity' ? ' || true' : '') + ')) { ' + ini + 'o.' + d.c + '.' + d.p + ' = (Number(o.' + d.c + '.' + d.p + ') || 0) + v; }', '}']; } },
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
    evento_gatilho: { rotulo: 'quando este objeto entrar/ficar numa zona (gatilho)', sec: 'gatilho' }
  };
  E.BLOCOS = BLOCOS; E.HATS = HATS;

  let contador = 0;   // numera os temporizadores de uma geração (chave do estado de cada um)
  const ind = (linhas, n) => linhas.map(l => '  '.repeat(n) + l);
  function lista(arr, nivel) {
    if (!Array.isArray(arr)) throw erro('lista de blocos inválida');
    const out = [];
    for (const b of arr) {
      const def = b && BLOCOS[b.t]; if (!def) throw erro('bloco desconhecido: ' + (b && b.t));
      out.push(...def.ger(b, { lista: l => ind(lista(l, 0), 1), id: () => contador++ }));
    }
    return ind(out, nivel);
  }
  E.gerar = function (blocos) {
    if (!Array.isArray(blocos)) throw erro('blocos inválidos'); contador = 0;
    const sec = { inicio: [], quadro: [], colisao: [], gatilho: [] };
    for (const h of blocos) { const d = h && HATS[h.t]; if (!d) throw erro('comece com um bloco de evento'); sec[d.sec].push(...lista(h.f || [], 0)); }
    const out = ['// Gerado pelos blocos. Edite os blocos: este texto é refeito a cada mudança.'];
    if (sec.inicio.length) out.push('function iniciar(e, ctx) {', '  const dt = ctx.dt;', ...ind(sec.inicio, 1), '}');
    if (sec.quadro.length) out.push('function atualizar(e, dt, ctx) {', ...ind(sec.quadro, 1), '}');
    const ev = [];
    if (sec.colisao.length) ev.push(['  colisao(e, d, ctx) {', '    const dt = ctx.dt;', ...ind(sec.colisao, 2), '  }']);
    if (sec.gatilho.length) ev.push(['  gatilho(e, d, ctx) {', '    const dt = ctx.dt;', ...ind(sec.gatilho, 2), '  }']);
    if (ev.length) { out.push('const eventos = {'); ev.forEach((l, i) => out.push(...(i < ev.length - 1 ? [...l.slice(0, -1), l[l.length - 1] + ','] : l))); out.push('};'); }
    return out.join('\n') + '\n';
  };
  // Bloco novo com valores padrão
  E.novo = function (t) {
    if (HATS[t]) return { t, f: [] };
    const d = BLOCOS[t], b = { t };
    for (const c of d.campos) if (c.n && c.padrao !== undefined) b[c.n] = JSON.parse(JSON.stringify(c.padrao));
    if (d.filhos && t !== 'se') b.f = [];
    if (t === 'se') { b.c = { k: 'cmp', a: { k: 'x' }, op: '>', b: { k: 'num', v: 0 } }; b.f = []; b.s = []; }
    return b;
  };
})(typeof window !== 'undefined' ? window : globalThis);
