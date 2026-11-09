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
  E.VALORES = { num: 'número', txt: 'texto', var: 'variável', x: 'x deste objeto', y: 'y deste objeto', vx: 'velocidade x', vy: 'velocidade y', eixoX: 'setas: eixo x', eixoY: 'setas: eixo y', tempo: 'tempo de jogo (s)', outro: 'nome do outro objeto' };

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
      case 'outro': return "(typeof d !== 'undefined' && d && ctx.scene.get(d.outro) ? ctx.scene.get(d.outro).nome : '')";
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
    var_definir: { cat: 'Variáveis', campos: [{ t: 'definir' }, { n: 'var', tipo: 'var' }, { t: 'para' }, { n: 'v', tipo: 'valor', padrao: N(0) }], ger: b => ['ctx.vars.definir(' + nomeVar(b.var) + ', ' + valor(b.v) + ');'] },
    var_somar: { cat: 'Variáveis', campos: [{ t: 'somar' }, { n: 'v', tipo: 'valor', padrao: N(1) }, { t: 'em' }, { n: 'var', tipo: 'var' }], ger: b => ['ctx.vars.somar(' + nomeVar(b.var) + ', ' + valor(b.v) + ');'] },
    se: { cat: 'Controle', campos: [{ t: 'se' }, { n: 'c', tipo: 'cond' }], filhos: ['f', 's'], ger: (b, g) => ['if (' + cond(b.c) + ') {', ...g.lista(b.f), ...(b.s && b.s.length ? ['} else {', ...g.lista(b.s)] : []), '}'] },
    cor: { cat: 'Aparência', campos: [{ t: 'mudar a cor para' }, { n: 'cor', tipo: 'cor', padrao: '#ff5555' }], ger: b => ['if (e.Sprite) e.Sprite.cor = ' + JSON.stringify(String(b.cor || '#ffffff')) + ';'] },
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

  const ind = (linhas, n) => linhas.map(l => '  '.repeat(n) + l);
  function lista(arr, nivel) {
    if (!Array.isArray(arr)) throw erro('lista de blocos inválida');
    const out = [];
    for (const b of arr) {
      const def = b && BLOCOS[b.t]; if (!def) throw erro('bloco desconhecido: ' + (b && b.t));
      out.push(...def.ger(b, { lista: l => ind(lista(l, 0), 1) }));
    }
    return ind(out, nivel);
  }
  E.gerar = function (blocos) {
    if (!Array.isArray(blocos)) throw erro('blocos inválidos');
    const sec = { inicio: [], quadro: [], colisao: [], gatilho: [] };
    for (const h of blocos) { const d = h && HATS[h.t]; if (!d) throw erro('comece com um bloco de evento'); sec[d.sec].push(...lista(h.f || [], 0)); }
    const out = ['// Gerado pelos blocos. Edite os blocos: este texto é refeito a cada mudança.'];
    if (sec.inicio.length) out.push('function iniciar(e, ctx) {', ...ind(sec.inicio, 1), '}');
    if (sec.quadro.length) out.push('function atualizar(e, dt, ctx) {', ...ind(sec.quadro, 1), '}');
    const ev = [];
    if (sec.colisao.length) ev.push(['  colisao(e, d, ctx) {', ...ind(sec.colisao, 2), '  }']);
    if (sec.gatilho.length) ev.push(['  gatilho(e, d, ctx) {', ...ind(sec.gatilho, 2), '  }']);
    if (ev.length) { out.push('const eventos = {'); ev.forEach((l, i) => out.push(...(i < ev.length - 1 ? [...l.slice(0, -1), l[l.length - 1] + ','] : l))); out.push('};'); }
    return out.join('\n') + '\n';
  };
  // Bloco novo com valores padrão
  E.novo = function (t) {
    if (HATS[t]) return { t, f: [] };
    const d = BLOCOS[t], b = { t };
    for (const c of d.campos) if (c.n && c.padrao !== undefined) b[c.n] = JSON.parse(JSON.stringify(c.padrao));
    if (t === 'se') { b.c = { k: 'cmp', a: { k: 'x' }, op: '>', b: { k: 'num', v: 0 } }; b.f = []; b.s = []; }
    return b;
  };
})(typeof window !== 'undefined' ? window : globalThis);
