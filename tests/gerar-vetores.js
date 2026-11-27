// Gera os vetores dourados (contrato de compatibilidade Scene/Entity/Serializer) a partir do núcleo JS atual.
// O JS legado é o ORÁCULO: o resultado de cada passo é gravado como "espera". O runtime Rust precisa reproduzi-lo.
//   node tests/gerar-vetores.js <pasta-de-saida>        escreve <pasta>/*.json
//   node tests/gerar-vetores.js --verificar <pasta>     regenera na memória e compara com o que está em <pasta>
// Erros são comparados por CÓDIGO (tabela abaixo), nunca pela mensagem em português.
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['events', 'scene', 'variaveis', 'listas', 'serializer'])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', f + '.js'), 'utf8'));
const C = globalThis.Core;

// Mensagem do JS -> código estável. A 1ª regra que casar vale. Mensagem sem regra = o gerador falha (nada escapa sem código).
const CODIGOS = [
  [/^create precisa de um objeto/, 'create_dados_invalidos'],
  [/^id de entidade precisa ser um inteiro/, 'id_invalido'],
  [/^id de entidade duplicado/, 'id_duplicado'],
  [/Transform\./, 'transform_invalido'],
  [/Velocity\./, 'velocity_invalido'],
  [/Attr|nome de atributo inválido/, 'attr_invalido'],
  [/: Pai /, 'pai_invalido'],
  [/Pai\./, 'pai_invalido'],
  [/Etiquetas/, 'etiquetas_invalido'],
  [/Modelo precisa/, 'modelo_invalido'],
  [/^clonar: objeto de origem/, 'origem_inexistente'],
  [/^formato de save inválido/, 'formato_invalido'],
  [/^save de uma versão mais nova/, 'formato_futuro'],
  [/^sem migração/, 'sem_migracao'],
  [/^save inválido: "estado" precisa/, 'estado_invalido'],
  [/^save inválido: entidade #/, 'entidade_invalida'],
  [/tem um pai que não existe/, 'pai_inexistente'],
  [/ciclo de pais/, 'pai_ciclo'],
  [/^save inválido$/, 'save_invalido'],
];
const codigoDe = msg => { for (const [re, c] of CODIGOS) if (re.test(msg)) return c; throw new Error('erro sem código no contrato: ' + msg); };
const J = v => JSON.parse(JSON.stringify(v === undefined ? null : v));

function estadoDe(s) {
  return { proximo_id: s.nextId, ids: [...s.entities.keys()], remover: [...s._remover].sort((a, b) => a - b), jogando: s.jogando };
}
function executar(s, p) {
  switch (p.op) {
    case 'create': return J(s.create(p.dados));
    case 'get': return J(s.get(p.id) || null);
    case 'find': return J(s.find(p.nome));
    case 'find_all': return s.findAll(p.nome).map(e => e.id);
    case 'query': return s.query(...p.comp).map(e => e.id);
    case 'destroy': s.destroy(p.id); return null;
    case 'flush': s.flush(); return null;
    case 'clonar': return J(s.clonar(p.origem, p.ajustes || {}));
    case 'clear': s.clear(); return null;
    case 'jogar': s.jogando = !!p.valor; return null;
    case 'estado': s.estado = J(p.valor); return null;
    case 'serializar': return J(C.Serializer.paraJSON(s));
    case 'carregar': C.Serializer.deJSON(s, J(p.dados)); return null;
    default: throw new Error('op desconhecida: ' + p.op);
  }
}
function gravar(nome, descricao, passos) {
  const s = new C.Scene();
  return { nome, descricao, passos: passos.map(p => {
    const r = { ...p };
    try { r.espera = { ok: executar(s, p) }; }
    catch (e) { r.espera = { erro: codigoDe(e.message) }; }
    r.espera.estado = estadoDe(s);
    return r;
  }) };
}

const cr = dados => ({ op: 'create', dados });
const attrs = n => { const o = {}; for (let i = 0; i < n; i++) o['k' + i] = i; return o; };
const CENARIOS = [
  ['create_ids_automaticos', 'Sem id usa o próximo; nome ausente vira texto vazio.',
    [cr({ nome: 'a' }), cr({ nome: 'b', Transform: { x: 1, y: 2 } }), cr({})]],
  ['create_id_explicito_sobe_contador', 'Id explícito maior ou igual ao próximo move o contador; menor não mexe.',
    [cr({ id: 10, nome: 'x' }), cr({}), cr({ id: 3 }), cr({})]],
  ['create_id_zero_valido', 'Id 0 é válido e não mexe no contador.',
    [cr({ id: 0, nome: 'zero' }), cr({})]],
  ['create_id_duplicado', 'Id repetido é erro e não altera nada.',
    [cr({ id: 1 }), cr({ id: 1, nome: 'outra' }), cr({})]],
  ['create_id_invalido', 'Id precisa ser inteiro >= 0.',
    [cr({ id: -1 }), cr({ id: 1.5 }), cr({ id: 'a' }), cr({ id: 5 })]],
  ['create_dados_invalidos', 'create precisa de um objeto.',
    [{ op: 'create', dados: null }, { op: 'create', dados: 'texto' }, { op: 'create', dados: 7 }, cr({})]],
  ['validacao_transform', 'x e y finitos; escala entre 0 (exclusivo) e 100.',
    [cr({ Transform: { x: 'a', y: 0 } }), cr({ Transform: { x: 0 } }), cr({ Transform: { x: null, y: 0 } }),
     cr({ Transform: { x: 0, y: 0, escala: 0 } }), cr({ Transform: { x: 0, y: 0, escala: 101 } }),
     cr({ Transform: { x: 0, y: 0, escala: 100 } }), cr({ Transform: { x: -3.5, y: 1e6, escala: 0.5 } })]],
  ['validacao_velocity', 'vx e vy precisam ser números.',
    [cr({ Velocity: { vx: 1 } }), cr({ Velocity: { vx: 1, vy: '2' } }), cr({ Velocity: { vx: 1, vy: -2 } })]],
  ['validacao_attr', 'Attr: objeto, até 50 chaves, nomes simples, valores número/texto(<=200)/booleano.',
    [cr({ Attr: { vida: 10, nome: 'x', vivo: true } }), cr({ Attr: attrs(50) }), cr({ Attr: attrs(51) }),
     cr({ Attr: { '1a': 1 } }), cr({ Attr: { a: null } }), cr({ Attr: { a: 'x'.repeat(200) } }),
     cr({ Attr: { a: 'x'.repeat(201) } }), cr({ Attr: [] }), cr({ Attr: null })]],
  ['validacao_pai', 'Pai: objeto com id inteiro >= 0 e diferente da própria entidade. Pai inexistente é aceito no create.',
    [cr({ id: 5, Pai: { id: 5 } }), cr({ Pai: { id: -1 } }), cr({ Pai: { id: 1.5 } }), cr({ Pai: [] }),
     cr({ Pai: { id: 1, girar: 'sim' } }), cr({ Pai: { id: 1, dx: 'a' } }), cr({ Pai: { id: 99, dx: 1, dy: 2, rot: 0.5, girar: true } })]],
  ['validacao_etiquetas_modelo', 'Etiquetas: lista de até 20 textos de 1 a 30 letras. Modelo: objeto.',
    [cr({ Etiquetas: ['a', 'b'] }), cr({ Etiquetas: [''] }), cr({ Etiquetas: ['x'.repeat(31)] }),
     cr({ Etiquetas: Array(21).fill('t') }), cr({ Etiquetas: 'a' }), cr({ Modelo: 1 }), cr({ Modelo: null }), cr({ Modelo: {} })]],
  ['destroy_em_cascata_so_no_flush', 'destroy só marca; flush remove, e remover o pai remove os filhos.',
    [cr({ nome: 'pai' }), cr({ nome: 'filho', Pai: { id: 1 } }), { op: 'destroy', id: 1 },
     { op: 'query', comp: [] }, { op: 'flush' }, { op: 'query', comp: [] }]],
  ['destroy_cascata_varios_niveis', 'A cascata alcança netos e não toca em quem não descende.',
    [cr({ nome: 'avo' }), cr({ nome: 'pai', Pai: { id: 1 } }), cr({ nome: 'neto', Pai: { id: 2 } }), cr({ nome: 'solto' }),
     { op: 'destroy', id: 1 }, { op: 'flush' }, { op: 'query', comp: [] }]],
  ['flush_preserva_ordem', 'Depois do flush, a ordem de criação dos restantes se mantém e o contador não volta.',
    [cr({ nome: 'a' }), cr({ nome: 'b' }), cr({ nome: 'c' }), cr({ nome: 'd' }), cr({ nome: 'e' }),
     { op: 'destroy', id: 2 }, { op: 'destroy', id: 4 }, { op: 'flush' }, { op: 'query', comp: [] }, cr({ nome: 'f' })]],
  ['find_nome_repetido', 'find devolve a primeira por ordem de criação; find_all devolve todas; inexistente é nulo.',
    [cr({ nome: 'x', Transform: { x: 1, y: 1 } }), cr({ nome: 'y' }), cr({ nome: 'x', Transform: { x: 2, y: 2 } }),
     { op: 'find', nome: 'x' }, { op: 'find_all', nome: 'x' }, { op: 'find', nome: 'nada' }, { op: 'find_all', nome: 'nada' },
     { op: 'get', id: 2 }, { op: 'get', id: 99 }]],
  ['query_componentes', 'query exige todos os componentes pedidos; componente com valor nulo conta como presente.',
    [cr({ nome: 'a', Transform: { x: 0, y: 0 } }), cr({ nome: 'b', Transform: { x: 0, y: 0 }, Velocity: { vx: 0, vy: 0 } }),
     cr({ nome: 'c', Sprite: null }), cr({ nome: 'd' }),
     { op: 'query', comp: ['Transform'] }, { op: 'query', comp: ['Transform', 'Velocity'] }, { op: 'query', comp: ['Sprite'] },
     { op: 'query', comp: ['Nada'] }, { op: 'query', comp: [] }]],
  ['query_modelo_jogando', 'Durante o jogo, entidades com Modelo ficam fora da query.',
    [cr({ nome: 'molde', Modelo: {} }), cr({ nome: 'real' }), { op: 'query', comp: [] }, { op: 'jogar', valor: true },
     { op: 'query', comp: [] }, { op: 'query', comp: ['Modelo'] }, { op: 'jogar', valor: false }, { op: 'query', comp: [] }]],
  ['clonar', 'Cópia sem id e sem Modelo, com x/y ajustados; origem inexistente é erro.',
    [cr({ nome: 'm', Transform: { x: 1, y: 2 }, Modelo: {}, Sprite: { cor: 'red' }, Etiquetas: ['t'] }),
     { op: 'clonar', origem: 1, ajustes: { x: 50 } }, { op: 'clonar', origem: 1, ajustes: { x: 7, y: 8 } },
     { op: 'clonar', origem: 1 }, { op: 'clonar', origem: 99, ajustes: {} },
     cr({ nome: 'sem_transform' }), { op: 'clonar', origem: 5, ajustes: { x: 3 } },
     { op: 'clonar', origem: 2, ajustes: { y: 0 } }]],
  ['clear_zera_tudo', 'clear volta o contador, o estado e o modo de jogo; zera as marcações de remoção.',
    [cr({ nome: 'a' }), cr({ nome: 'b' }), { op: 'estado', valor: { vars: { x: 1 } } }, { op: 'destroy', id: 1 },
     { op: 'jogar', valor: true }, { op: 'clear' }, { op: 'serializar' }, cr({ nome: 'c' })]],
  ['serializer_ida_e_volta', 'paraJSON tira Transform.px/py e estado.camera.px/py; carregar o resultado e serializar de novo dá o mesmo.',
    [cr({ nome: 'a', Transform: { x: 1, y: 2, px: 0.5, py: 0.5 }, Sprite: { cor: 'blue' } }),
     cr({ id: 9, nome: 'b', Pai: { id: 1, dx: 4, dy: 4 } }),
     { op: 'estado', valor: { camera: { x: 1, y: 2, zoom: 1, px: 3, py: 4 }, vars: { pontos: 10 } } },
     { op: 'serializar' },
     { op: 'carregar', dados: { formato: 1, estado: { camera: { x: 1, y: 2, zoom: 1 }, vars: { pontos: 10 } },
        entidades: [{ id: 1, nome: 'a', Transform: { x: 1, y: 2 }, Sprite: { cor: 'blue' } }, { id: 9, nome: 'b', Pai: { id: 1, dx: 4, dy: 4 } }] } },
     { op: 'serializar' }]],
  ['serializer_formato', 'Formato ausente vale 1; maior que o conhecido, ou fora de inteiro >= 1, é erro.',
    [{ op: 'carregar', dados: { entidades: [{ nome: 'sem_formato' }] } },
     { op: 'carregar', dados: { formato: 2, entidades: [] } }, { op: 'carregar', dados: { formato: 0, entidades: [] } },
     { op: 'carregar', dados: { formato: 1.5, entidades: [] } }, { op: 'carregar', dados: { formato: '1', entidades: [] } },
     { op: 'carregar', dados: null }, { op: 'carregar', dados: { formato: 1 } }, { op: 'carregar', dados: [] },
     { op: 'carregar', dados: { formato: 1, estado: [], entidades: [] } }, { op: 'serializar' }]],
  ['serializer_transacional', 'Save inválido nunca destrói a cena atual.',
    [cr({ nome: 'original' }),
     { op: 'carregar', dados: { formato: 1, entidades: [{ id: 2, nome: 'ok' }, { id: 3, nome: 'ruim', Transform: { x: 'a', y: 0 } }] } },
     { op: 'carregar', dados: { formato: 1, entidades: [{ id: 2 }, { id: 2 }] } },
     { op: 'carregar', dados: { formato: 1, entidades: [5] } }, { op: 'query', comp: [] }]],
  ['serializer_pai', 'Pai precisa existir no save e não pode formar ciclo.',
    [{ op: 'carregar', dados: { formato: 1, entidades: [{ id: 1, nome: 'filho', Pai: { id: 7 } }] } },
     { op: 'carregar', dados: { formato: 1, entidades: [{ id: 1, Pai: { id: 2 } }, { id: 2, Pai: { id: 1 } }] } },
     { op: 'carregar', dados: { formato: 1, entidades: [{ id: 1, nome: 'pai' }, { id: 2, nome: 'filho', Pai: { id: 1 } }] } },
     { op: 'query', comp: [] }]],
  ['serializer_ids_e_contador', 'Entidades sem id recebem o próximo; id explícito sobe o contador; carregar zera as marcações de remoção.',
    [cr({ nome: 'antes' }), { op: 'destroy', id: 1 },
     { op: 'carregar', dados: { formato: 1, entidades: [{ nome: 'a' }, { id: 7, nome: 'b' }, { nome: 'c' }] } },
     { op: 'query', comp: [] }, cr({ nome: 'd' })]],
];

const todos = CENARIOS.map(([n, d, p]) => gravar(n, d, p));
const serializar = v => JSON.stringify(v, null, 1) + '\n';
const [a, b] = process.argv.slice(2);
if (a === '--verificar') {
  let falhas = 0;
  for (const v of todos) {
    const f = path.join(b, v.nome + '.json');
    const ok = fs.existsSync(f) && fs.readFileSync(f, 'utf8') === serializar(v);
    console.log((ok ? 'OK   ' : 'FALHA ') + v.nome); if (!ok) falhas++;
  }
  const extras = fs.readdirSync(b).filter(f => f.endsWith('.json') && !todos.some(v => v.nome + '.json' === f));
  for (const f of extras) { console.log('FALHA arquivo sem cenário: ' + f); falhas++; }
  process.exit(falhas ? 1 : 0);
} else if (a) {
  fs.mkdirSync(a, { recursive: true });
  for (const f of fs.readdirSync(a)) if (f.endsWith('.json')) fs.unlinkSync(path.join(a, f));
  for (const v of todos) fs.writeFileSync(path.join(a, v.nome + '.json'), serializar(v));
  console.log(todos.length + ' vetores em ' + a);
} else { console.error('uso: node tests/gerar-vetores.js <pasta> | --verificar <pasta>'); process.exit(2); }
