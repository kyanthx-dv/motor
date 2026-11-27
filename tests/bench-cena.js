// Benchmark comparável de Scene/Serializer (par do exemplo bench_cena do motor-runtime: mesmo cenário, mesmas operações).
//   node tests/bench-cena.js [N=20000] [repeticoes=5]
// Saída: uma linha JSON por operação { motor, n, op, min_ms, mediana_ms }, o mesmo formato do lado Rust.
// "construcao" (montar/parsear dados) é medida à parte das operações quentes. JSON NÃO é usado dentro das operações quentes
// (só em parse_json/stringify, que medem exatamente o custo de ler/gravar o save).
const fs = require('fs'), vm = require('vm'), path = require('path');
for (const f of ['events', 'scene', 'variaveis', 'listas', 'serializer'])
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'core', f + '.js'), 'utf8'));
const C = globalThis.Core;
const N = +(process.argv[2] || 20000), REP = +(process.argv[3] || 5);

// Cenário: entidade i tem nome e(i%100), Transform, Velocity, Attr; as de i%10 != 0 são filhas da primeira do grupo de 10.
const dado = i => {
  const d = { nome: 'e' + (i % 100), Transform: { x: i, y: i * 2 }, Velocity: { vx: 1, vy: 2 }, Attr: { vida: i % 10, tag: 't' } };
  if (i % 10 !== 0) d.Pai = { id: i - (i % 10) + 1, dx: 0, dy: 0 };
  return d;
};
const dados = Array.from({ length: N }, (_, i) => dado(i));
const criar = () => { const s = new C.Scene(); for (const d of dados) s.create(d); return s; };

const resultados = {};
const medir = (op, preparar, fn) => {
  const t = [];
  for (let r = 0; r < REP; r++) { const ctx = preparar(); const a = process.hrtime.bigint(); const sink = fn(ctx); t.push(Number(process.hrtime.bigint() - a) / 1e6); if (sink === Symbol()) console.log(); }
  t.sort((a, b) => a - b); resultados[op] = { min_ms: t[0], mediana_ms: t[t.length >> 1] };
};
const nada = () => null;

medir('create', nada, () => criar());
const base = criar();
medir('query_todos', nada, () => { let n = 0; for (let k = 0; k < 20; k++) n += base.query('Transform', 'Velocity').length; return n; });
medir('query_rara', nada, () => { let n = 0; for (let k = 0; k < 20; k++) n += base.query('Pai').length; return n; });
medir('find_inexistente', nada, () => { let n = 0; for (let k = 0; k < 20; k++) n += base.find('nada') ? 1 : 0; return n; });
medir('find_primeiro', nada, () => { let n = 0; for (let k = 0; k < 2000; k++) n += base.find('e99') ? 1 : 0; return n; });
medir('destroy_flush_20_arvores', () => criar(), s => { for (let k = 0; k < 20; k++) s.destroy(1 + 10 * k); s.flush(); return s.entities.size; });
medir('serializar_objeto', nada, () => C.Serializer.paraJSON(base));
const texto = JSON.stringify(C.Serializer.paraJSON(base));
const objeto = C.Serializer.paraJSON(base);
medir('stringify_json', nada, () => JSON.stringify(objeto).length);
medir('parse_json', nada, () => JSON.parse(texto));
medir('carregar_objeto', () => new C.Scene(), s => C.Serializer.deJSON(s, objeto));

for (const [op, r] of Object.entries(resultados)) console.log(JSON.stringify({ motor: 'js', n: N, op, min_ms: +r.min_ms.toFixed(3), mediana_ms: +r.mediana_ms.toFixed(3) }));
