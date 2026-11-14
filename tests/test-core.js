// Rode com: node tests/test-core.js
const fs=require('fs'),vm=require('vm');
for(const f of ['events','scene','variaveis','listas','serializer','systems/controles','systems/ui','systems/scripts','systems/fisica','systems/animacao','systems/camera','systems/hierarquia','systems/tempo','systems/tiles','systems/caminho','engine'])vm.runInThisContext(fs.readFileSync(__dirname+'/../core/'+f+'.js','utf8'));
const C=globalThis.Core;let falhas=0;const ok=(c,m)=>{console.log((c?'OK   ':'FALHA ')+m);if(!c)falhas++;};
const nova=()=>new C.Engine();
// 1) bola quica no chão e fica em repouso
{const e=nova();e.scene.estado.gravidade={x:0,y:900};
 e.scene.create({nome:'chao',Transform:{x:0,y:400},Body:{forma:'retangulo',w:2000,h:20,massa:0}});
 const b=e.scene.create({nome:'b',Transform:{x:0,y:100},Velocity:{vx:0,vy:0},Body:{forma:'circulo',raio:10,massa:1,elasticidade:0.8}});
 let min=0;for(let i=0;i<900;i++){e.passo();min=Math.max(min,b.Transform.y);}
 ok(min<=391,'bola não atravessa o chão (y máx '+min.toFixed(1)+')');ok(Math.abs(b.Transform.y-380)<2&&Math.abs(b.Velocity.vy)<10,'bola fica em repouso sobre o chão');}
// 2) colisão elástica entre massas iguais troca as velocidades
{const e=nova();const a=e.scene.create({Transform:{x:0,y:0},Velocity:{vx:100,vy:0},Body:{raio:10,massa:1,elasticidade:1}});
 const b=e.scene.create({Transform:{x:25,y:0},Velocity:{vx:0,vy:0},Body:{raio:10,massa:1,elasticidade:1}});
 for(let i=0;i<30;i++)e.passo();ok(Math.abs(a.Velocity.vx)<2&&Math.abs(b.Velocity.vx-100)<2,'colisão elástica troca velocidades');}
// 3) sensor avisa e não empurra
{const e=nova();let n=0;e.events.on('gatilho',()=>n++);
 e.scene.create({Transform:{x:50,y:0},Body:{forma:'retangulo',w:20,h:40,massa:0,sensor:true}});
 const b=e.scene.create({Transform:{x:0,y:0},Velocity:{vx:100,vy:0},Body:{raio:5,massa:1}});
 for(let i=0;i<60;i++)e.passo();ok(n>0,'sensor emite gatilho');ok(Math.abs(b.Velocity.vx-100)<1,'sensor não altera a velocidade');}
// 4) scripts, eventos para a entidade e controles
{const e=nova();let ev=0;e.registrarScript('c',{atualizar(en){en.Script.estado.n=(en.Script.estado.n||0)+1;},eventos:{ping(){ev++;}}});
 const s=e.scene.create({Script:{nome:'c'}});for(let i=0;i<10;i++)e.passo();ok(s.Script.estado.n===10,'script roda 1x por passo');
 e.events.emit('ping',{para:s.id});e.passo();ok(ev===1,'evento chega ao script da entidade');
 const p=e.scene.create({Transform:{x:0,y:0},Velocity:{vx:0,vy:0},Controller:{aceleracao:1000,velMax:100}});
 e.input={poll:()=>({down:new Set(),pressed:new Set(),released:new Set(),axes:{x:1,y:0},pointer:{}})};
 for(let i=0;i<60;i++)e.passo();ok(Math.abs(p.Velocity.vx-100)<0.01,'Controller respeita velMax');}
// 5) salvar/carregar em JSON e determinismo
{const mk=()=>{const e=nova();e.scene.estado={x:1,gravidade:{x:0,y:500}};
 e.scene.create({Transform:{x:0,y:200},Body:{forma:'retangulo',w:900,h:20,massa:0}});
 for(let i=0;i<5;i++)e.scene.create({Transform:{x:i*30,y:i*20},Velocity:{vx:50,vy:0},Body:{raio:12,massa:1,elasticidade:.6}});return e;};
 const a=mk(),b=mk();for(let i=0;i<300;i++){a.passo();b.passo();}
 const ja=JSON.stringify(C.Serializer.paraJSON(a.scene));ok(ja===JSON.stringify(C.Serializer.paraJSON(b.scene)),'simulação determinística');
 const c=nova();C.Serializer.deJSON(c.scene,JSON.parse(ja));ok(JSON.stringify(C.Serializer.paraJSON(c.scene))===ja,'JSON ida e volta idêntico');
 let erro=false;try{C.Serializer.deJSON(c.scene,{formato:99,entidades:[]});}catch(x){erro=true;}ok(erro,'rejeita save de versão futura');}
// 6) animação e câmera
{const e=nova();const a=e.scene.create({Animacao:{atual:'x',animacoes:{x:{linha:1,quadros:4,fps:10},u:{linha:0,quadros:3,fps:10,repetir:false}}}});
 for(let i=0;i<9;i++)e.passo();ok(a.Animacao.quadro===1&&a.Animacao.linha===1,'animação avança e escolhe a linha (quadro '+a.Animacao.quadro+')');
 for(let i=0;i<30;i++)e.passo();ok(a.Animacao.quadro<4,'animação repete dentro do limite');
 a.Animacao.atual='u';for(let i=0;i<60;i++)e.passo();ok(a.Animacao.quadro===2&&a.Animacao.terminou===true,'animação sem repetição para no último quadro');
 const f=nova();f.scene.estado.camera={x:0,y:0,zoom:1,seguir:'alvo',suavizar:8,limites:{x0:0,y0:0,x1:2000,y1:1000}};
 f.scene.create({nome:'alvo',Transform:{x:1000,y:500}});for(let i=0;i<120;i++)f.passo();
 ok(Math.abs(f.scene.estado.camera.x-1000)<1&&Math.abs(f.scene.estado.camera.y-500)<1,'câmera segue o alvo');
 f.scene.find('alvo').Transform.x=5000;f.scene.find('alvo').Transform.y=-900;for(let i=0;i<200;i++)f.passo();
 ok(f.scene.estado.camera.x===2000-400&&f.scene.estado.camera.y===225,'câmera respeita os limites do mundo');}
// 7) camadas de colisão
{const passa=(ca,cb,colA,colB)=>{const e=nova();const a=e.scene.create({Transform:{x:0,y:0},Velocity:{vx:100,vy:0},Body:{raio:10,massa:1,elasticidade:1,camada:ca,colide:colA}});
  e.scene.create({Transform:{x:40,y:0},Body:{raio:10,massa:0,camada:cb,colide:colB}});for(let i=0;i<60;i++)e.passo();return a.Transform.x>40;};
 ok(!passa('a','b'),'sem filtro colide (comportamento antigo)');
 ok(passa('a','b',['c']),'camada fora da lista atravessa');
 ok(!passa('a','b',['b'],['a']),'camadas que se aceitam colidem');
 ok(passa('a','b',['b'],['x']),'os dois lados precisam aceitar');}
// 8) cenas e interface
{const e=nova();const log=[];e.registrarCena('menu',{montar(en,d){log.push('menu');en.scene.create({nome:'m'});}});
 e.registrarCena('jogo',{montar(en,d){log.push('jogo:'+d.fase);en.scene.create({nome:'j'});}});
 e.irPara('menu');ok(e.scene.estado.cena==='menu'&&e.scene.find('m'),'irPara fora do passo monta na hora');
 e.registrarScript('troca',{atualizar(en,dt,ctx){ctx.engine.irPara('jogo',{fase:3});ok(ctx.scene.find('m')!==null,'dentro do passo a troca espera o fim');}});
 e.scene.create({Script:{nome:'troca'}});e.passo();
 ok(e.scene.estado.cena==='jogo'&&e.scene.find('j')&&!e.scene.find('m')&&log.join()==='menu,jogo:3','cena nova monta com dados e limpa a anterior');
 let erro=false;try{e.irPara('nada');}catch(x){erro=true;}ok(erro,'cena inexistente dá erro claro');
 const u=nova();let foi=null;u.registrarCena('alvo',{montar(){foi='alvo';}});
 u.scene.create({Transform:{x:100,y:50},Botao:{acao:{irPara:'alvo'}},Sprite:{fixo:true,w:80,h:30}});
 u.input={poll:()=>({down:new Set(),pressed:new Set(),released:new Set(),axes:{x:0,y:0},pointer:{tx:300,ty:300,pressed:true}})};u.passo();ok(foi===null,'clique fora do botão não faz nada');
 u.scene.find('')||0;u.input={poll:()=>({down:new Set(),pressed:new Set(),released:new Set(),axes:{x:0,y:0},pointer:{tx:110,ty:55,pressed:true}})};u.passo();ok(foi==='alvo','clique no botão troca de cena');}
// 9) correções da revisão sênior
{ // A1: o motor roda com um agendador do host (sem navegador)
  let cb=null,agora=0;const e=new C.Engine({agendador:{agora:()=>agora,pedir:f=>{cb=f;return 1;},cancelar:()=>{cb=null;}}});
  e.scene.create({Transform:{x:0,y:0},Velocity:{vx:60,vy:0}});e.iniciar();for(let i=0;i<30;i++){agora+=1000/60;cb(agora);}e.parar();
  ok(e.passos>=29&&e.passos<=30&&cb===null,'Engine roda e para com agendador do host (passos '+e.passos+')');
  // B5: tempo perdido fica contado
  const f=new C.Engine({agendador:{agora:()=>0,pedir:g=>{cb=g;return 1;},cancelar:()=>{}}});f.iniciar();cb(10000);f.parar();
  ok(f.passos===5&&f.tempoPerdido>9,'passos limitados e tempo perdido contado ('+f.tempoPerdido.toFixed(1)+' s)');}
{ // B1: migração que não avança dá erro em vez de travar
  const S=C.Serializer,F0=S.FORMATO;S.FORMATO=3;S.migracoes[1]=d=>d;S.migracoes[2]=d=>({...d,formato:'x'});
  let m1=false,m2=false;try{S.deJSON(new C.Scene(),{formato:1,entidades:[]});}catch(x){m1=/não avançou/.test(x.message);}
  try{S.deJSON(new C.Scene(),{formato:2,entidades:[]});}catch(x){m2=/não avançou/.test(x.message);}
  let m3=false;try{S.deJSON(new C.Scene(),{formato:'abc',entidades:[]});}catch(x){m3=true;}
  S.FORMATO=F0;delete S.migracoes[1];delete S.migracoes[2];ok(m1&&m2&&m3,'migração inválida e formato inválido dão erro finito');}
{ // B3: id duplicado
  const s=new C.Scene();s.create({id:7});let d1=false;try{s.create({id:7});}catch(x){d1=true;}ok(d1&&s.entities.size===1,'id duplicado é rejeitado');
  s.create({id:1,nome:'antes'});let d2=false;try{C.Serializer.deJSON(s,{formato:1,entidades:[{id:2},{id:2}]});}catch(x){d2=true;}
  ok(d2&&s.find('antes'),'save com ids duplicados falha sem destruir a cena atual');}
{ // revisão 2: carga transacional, migração v+1, save malformado, dt inválido
  const S=C.Serializer,s=new C.Scene();s.create({id:1,nome:'atual'});
  const falha=d=>{try{S.deJSON(s,d);return false;}catch(x){return true;}};
  ok(falha({formato:1,entidades:[{id:2},{id:3,Transform:{x:NaN,y:0}}]})&&s.find('atual')&&s.entities.size===1,'save com entidade inválida preserva a cena atual');
  ok(falha({formato:1,entidades:[null]})&&falha({formato:1,entidades:[{id:'a'}]})&&falha({formato:1,entidades:[{id:1.5}]})&&falha({formato:1,estado:5,entidades:[]})&&s.find('atual'),'save malformado falha sem destruir a cena');
  const F0=S.FORMATO;S.FORMATO=3;S.migracoes[1]=d=>({...d,formato:3});let salto=false;try{S.deJSON(new C.Scene(),{formato:1,entidades:[]});}catch(x){salto=true;}S.FORMATO=F0;delete S.migracoes[1];ok(salto,'migração que pula formato é rejeitada');
  const e=nova(),bad=v=>{try{e.passo(v);return false;}catch(x){return x instanceof RangeError;}};
  ok(bad(NaN)&&bad(Infinity)&&bad(0)&&bad(-1)&&bad('1')&&e.tempo===0,'passo(dt) recusa tempo inválido sem alterar o estado');}
{ // revisão 3: física sem tunneling em várias velocidades/espessuras, scripts isolados, validação
  let furos=[];
  for(const v of [300,800,1200,1600])for(const esp of [2,4,10])for(const raio of [3,12])for(const gy of [0,900]){
    const e=nova();e.scene.estado.gravidade={x:0,y:gy};
    e.scene.create({nome:'p',Transform:{x:200,y:0},Body:{forma:'retangulo',w:esp,h:600,massa:0}});
    const b=e.scene.create({nome:'b',Transform:{x:100,y:0},Velocity:{vx:v,vy:0},Body:{forma:'circulo',raio:raio,massa:1,elasticidade:0.5,semGravidade:true}});
    for(let i=0;i<40;i++)e.passo();
    if(b.Transform.x>200+esp/2)furos.push(v+'/'+esp+'/'+raio+'/'+gy);}
  ok(furos.length===0,'sem tunneling em 48 combinações de velocidade/espessura/raio/gravidade'+(furos.length?' FUROS: '+furos.join(' '):''));
  const e=nova();e.scene.create({nome:'s',Transform:{x:200,y:0},Body:{forma:'retangulo',w:2,h:100,massa:0,sensor:true}});
  e.scene.create({nome:'b',Transform:{x:100,y:0},Velocity:{vx:1600,vy:0},Body:{forma:'circulo',raio:3,massa:1}});let gat=0;e.events.on('gatilho',()=>gat++);for(let i=0;i<10;i++)e.passo();ok(gat>0,'sensor fino sem Velocity também é detectado');
  const e2=nova();e2.registrarScript('quebra',{atualizar(){throw new Error('boom');}});e2.registrarScript('ok',{atualizar(en){en.Transform.x+=1;}});
  e2.scene.create({Script:{nome:'quebra'}});const k=e2.scene.create({Transform:{x:0,y:0},Script:{nome:'ok'}});const w=console.warn;let av=0;console.warn=()=>av++;e2.passo();e2.passo();console.warn=w;
  ok(k.Transform.x===2&&e2.errosScript===2&&av===1,'erro em script não derruba as outras entidades (avisa uma vez, conta todas)');
  const sc=new C.Scene(),f=d=>{try{sc.create(d);return false;}catch(x){return true;}},T={x:0,y:0};
  ok(f({Transform:T,Body:{forma:'triangulo',w:5,h:5}})&&f({Transform:T,Body:{raio:5,elasticidade:2}})&&f({Transform:T,Body:{raio:5,amortecimento:-1}})&&f({Transform:T,Body:{raio:5,camada:3}})&&f({Transform:T,Body:{raio:5,colide:'x'}})&&f({Controller:{velMax:0}})&&f({Animacao:{animacoes:{a:{quadros:0}}}})&&f({Animacao:{animacoes:{a:{quadros:2,fps:-1}}}}),'A2: formas, elasticidade, camadas, Controller e Animacao inválidos são recusados');
  ok(new C.Engine().scene&&(()=>{const i=C.Engine.prototype;return true;})(),'engine segue construindo');
  let c1=false;try{C.Serializer.deJSON(new C.Scene(),{formato:1,estado:{camera:{zoom:0}},entidades:[]});}catch(x){c1=true;}ok(c1,'save com câmera de zoom inválido é recusado');}
{ // variáveis: tipos, erros claros, evento, save/load e troca de cena
  const e=nova(),v=e.vars,evs=[];e.events.on('variavel-mudou',d=>evs.push(d));
  v.declarar('pontos',0);v.declarar('fase','A');v.declarar('som',true);v.somar('pontos',3);v.definir('fase','B');v.definir('pontos',3);e.passo();
  ok(v.ler('pontos')===3&&v.tipo('som')==='booleano'&&evs.length===5&&evs[4].antes==='A'&&evs[4].valor==='B','declarar/ler/definir/somar emitem variavel-mudou só quando muda');
  const f=fn=>{try{fn();return false;}catch(x){return true;}};
  ok(f(()=>v.ler('pontso'))&&f(()=>v.definir('pontos','x'))&&f(()=>v.somar('fase'))&&f(()=>v.declarar('pontos',1))&&f(()=>v.declarar('1x',1))&&f(()=>v.declarar('n',NaN))&&f(()=>v.declarar('o',{})),'nome errado, tipo trocado, redeclarar e valor inválido dão erro claro');
  const j=JSON.parse(JSON.stringify(C.Serializer.paraJSON(e.scene))),e2=nova();C.Serializer.deJSON(e2.scene,j);
  ok(e2.vars.ler('pontos')===3&&e2.vars.ler('fase')==='B','variáveis vão e voltam no save');
  let ruim=false;try{C.Serializer.deJSON(e2.scene,{formato:1,estado:{vars:{x:{}}},entidades:[]});}catch(x){ruim=true;}ok(ruim&&e2.vars.ler('pontos')===3,'save com variável inválida é recusado sem destruir a cena');
  e.registrarCena('a',{montar(){}});e.registrarCena('b',{montar(){}});e.irPara('a');e.passo();v.definir('pontos',9);e.irPara('b');e.passo();ok(v.ler('pontos')===9&&e.scene.estado.cena==='b','variáveis atravessam a troca de cena');
  const e3=nova();e3.registrarScript('s',{atualizar(en,dt,ctx){ctx.vars.somar('n');}});e3.vars.declarar('n',0);e3.scene.create({Script:{nome:'s'}});e3.passo();e3.passo();ok(e3.vars.ler('n')===2,'scripts usam ctx.vars');}
{ // scripts com fonte dentro da cena
  const e=nova();e.vars.declarar('n',0);
  e.scene.estado.scripts={mover:{fonte:'function iniciar(en,ctx){ctx.vars.somar("n",10);}\nfunction atualizar(en,dt,ctx){en.Transform.x+=60*dt;}\nconst eventos={colisao(en,d,ctx){ctx.vars.somar("n");}};'},
    quebrado:{fonte:'function atualizar( {'},ruim:{fonte:123}};
  const a=e.scene.create({Transform:{x:0,y:0},Script:{nome:'mover'}});const w=console.warn;let av=0;console.warn=()=>av++;const erros=e.compilarScripts();console.warn=w;
  for(let i=0;i<60;i++)e.passo();
  ok(erros.length===2&&av===2&&Math.abs(a.Transform.x-60)<0.01&&e.vars.ler('n')===10,'scripts da cena compilam e rodam; erro de sintaxe/forma vira erro listado, sem derrubar');
  e.registrarScript('doJogo',{});e.scene.estado.scripts={doJogo:{fonte:''}};console.warn=()=>{};const e2=e.compilarScripts();console.warn=w;ok(e2.length===1&&/já existe/.test(e2[0].mensagem)&&!e.scripts.mover,'nome igual ao de script do jogo é recusado e scripts antigos da cena são removidos');
  const s=new C.Scene(),f=d=>{try{C.Serializer.deJSON(s,{formato:1,estado:{scripts:d},entidades:[]});return false;}catch(x){return true;}};
  ok(f(5)&&f({'1x':{fonte:''}})&&f({a:{}})&&f({a:{fonte:'x'.repeat(50001)}})&&!f({a:{fonte:'function atualizar(){}'}}),'save valida a forma de estado.scripts');}
{ // E3b: blocos -> código -> motor (comportamento real, não só texto)
  vm.runInThisContext(fs.readFileSync(__dirname+'/../editor/gerador.js','utf8'));const G=EditorBlocos;
  const e=nova();e.vars.declarar('pontos',0);e.vars.declarar('fase','A');
  const se=G.novo('se');se.c={k:'cmp',a:{k:'x'},op:'>',b:{k:'num',v:50}};se.f=[G.novo('var_somar')];se.s=[{t:'vel_x',v:{k:'num',v:7}}];
  const somarSe=G.novo('var_somar');somarSe.v={k:'num',v:10};somarSe.var='pontos';
  const colisao=[{t:'evento_colisao',f:[{t:'var_definir',var:'fase',v:{k:'txt',v:'bateu'}},G.novo('remover_outro')]}];
  const blocos=[{t:'evento_inicio',f:[Object.assign(G.novo('var_somar'),{v:{k:'num',v:5},var:'pontos'})]},{t:'evento_quadro',f:[G.novo('mover_x'),se]},...colisao];
  se.f[0].var='pontos';
  e.scene.estado.scripts={b:{blocos,fonte:G.gerar(blocos)}};
  const a=e.scene.create({nome:'a',Transform:{x:0,y:0},Velocity:{vx:0,vy:0},Body:{raio:10,massa:1},Script:{nome:'b'}});
  const o=e.scene.create({nome:'o',Transform:{x:200,y:0},Body:{raio:10,massa:0}});
  ok(e.compilarScripts().length===0,'código gerado dos blocos compila');
  for(let i=0;i<60;i++)e.passo();
  ok(e.vars.ler('pontos')>=10&&a.Transform.x>60&&a.Transform.x<70&&a.Velocity.vx===7,'blocos: iniciar, mover, se/senão e variáveis funcionam no motor');
  a.Transform.x=195;e.passo();e.passo();ok(e.vars.ler('fase')==='bateu'&&!e.scene.get(o.id),'blocos: evento de colisão + remover o outro objeto');
  const f=b=>{try{G.gerar(b);return false;}catch(x){return true;}};
  ok(f([{t:'mover_x'}])&&f([{t:'evento_quadro',f:[{t:'nao_existe'}]}])&&f([{t:'evento_quadro',f:[{t:'var_somar',var:'x y',v:{k:'num',v:1}}]}])&&f([{t:'evento_quadro',f:[{t:'mover_x',v:{k:'num',v:'abc'}}]}])&&f([{t:'evento_quadro',f:[{t:'se',c:{k:'tecla',acao:'zzz'},f:[]}]}]),'gerador recusa bloco desconhecido, variável/número/tecla inválidos');
  ok(G.gerar([{t:'evento_quadro',f:[{t:'cor',cor:'"; alert(1); "'}]}]).includes('"\\"; alert(1); \\""'),'texto digitado é escapado (sem injeção de código)');
  const s2=new C.Scene(),bom={formato:1,estado:{scripts:{x:{fonte:'',blocos:[]}}},entidades:[]};C.Serializer.deJSON(s2,bom);let ruim=false;try{C.Serializer.deJSON(s2,{formato:1,estado:{scripts:{x:{fonte:'',blocos:5}}},entidades:[]});}catch(x){ruim=true;}ok(ruim,'save valida estado.scripts[].blocos');}
{ // tecla livre: gerador e SEM_INPUT
  const G=EditorBlocos,c=(t,m)=>G.gerar([{t:'evento_quadro',f:[{t:'se',c:{k:'tecla',tecla:t,modo:m},f:[],s:[]}]}]);
  ok(c('Z','down').includes('ctx.input.keys.has("z")')&&c(' ','pressed').includes('keysPressed.has(" ")'),'tecla livre gera keys/keysPressed (minúsculas, aceita espaço)');
  let f1=false,f2=false;try{c('','down');}catch(x){f1=true;}try{c('x'.repeat(21),'down');}catch(x){f2=true;}ok(f1&&f2,'tecla livre vazia ou longa demais é recusada');
  const e=nova();e.vars.declarar('n',0);e.registrarScript('t',{atualizar(en,dt,ctx){if(ctx.input.keys.has('z')||ctx.input.keysPressed.has('z'))ctx.vars.somar('n');}});e.scene.create({Script:{nome:'t'}});e.passo();ok(e.vars.ler('n')===0,'motor sem Input expõe keys/keysPressed vazios (sem erro)');}
{ // blocos novos: criar objeto, temporizador, aleatório, bipe
  const G=EditorBlocos,R=(c,min,max)=>({k:'rand',min,max});
  const e=nova(),n0=e.scene.entities.size;e.vars.declarar('pontos',0);
  const cri=G.novo('criar');cri.vx={k:'num',v:100};cri.vy={k:'num',v:50};cri.tipo='parado';
  const sem=Object.assign(G.novo('criar'),{forma:'retangulo',tipo:'sem'});
  const tmp=G.novo('temporizador');tmp.v={k:'num',v:0.5};tmp.f=[Object.assign(G.novo('var_somar'),{var:'pontos'})];
  const ruim=Object.assign(G.novo('criar'),{tam:{k:'num',v:-5}});
  const bl=[{t:'evento_inicio',f:[cri,sem,ruim]},{t:'evento_quadro',f:[tmp]}];
  e.scene.estado.scripts={m:{blocos:bl,fonte:G.gerar(bl)}};e.scene.create({Transform:{x:0,y:0},Script:{nome:'m'}});
  const w=console.warn;let av=0;console.warn=()=>av++;e.compilarScripts();for(let i=0;i<120;i++)e.passo();console.warn=w;
  const criados=[...e.scene.entities.values()].filter(x=>x.nome==='criado');
  ok(criados.length===2&&criados.some(x=>x.Body&&x.Body.massa===0&&x.Transform.x===100)&&criados.some(x=>!x.Body&&x.Sprite.w===32),'criar objeto: círculo parado e quadrado sem colisão (tamanho inválido só isola o erro)');
  ok(e.vars.ler('pontos')>=3&&e.vars.ler('pontos')<=4&&av>=1,'temporizador a cada 0,5 s dispara ~2 vezes por segundo');
  const A=nova(),B=nova(),C2=nova();A.scene.estado.semente=7;B.scene.estado.semente=7;C2.scene.estado.semente=8;
  const sa=[1,2,3,4].map(()=>A.aleatorio(0,100)),sb=[1,2,3,4].map(()=>B.aleatorio(0,100)),sc2=[1,2,3,4].map(()=>C2.aleatorio(0,100));
  ok(sa.join()===sb.join()&&sa.join()!==sc2.join()&&sa.every(x=>x>=0&&x<100),'aleatório: mesma semente = mesma sequência, dentro do intervalo');
  const J=JSON.parse(JSON.stringify(C.Serializer.paraJSON(A.scene))),A2=nova();C.Serializer.deJSON(A2.scene,J);ok(A2.aleatorio(0,100)===A.aleatorio(0,100),'aleatório continua igual depois de salvar e carregar');
  ok(G.gerar([{t:'evento_quadro',f:[{t:'var_somar',var:'pontos',v:R(0,1,5)}]}]).includes('ctx.engine.aleatorio(1, 5)'),'valor aleatório gera ctx.engine.aleatorio(min, max)');
  const chamadas=[],e2=nova();e2.registrarScript('s',{atualizar(en,dt,ctx){if(ctx.audio)ctx.audio.bipe(440,0.1);}});e2.scene.create({Script:{nome:'s'}});e2.passo();e2.audio={bipe:(f,d)=>chamadas.push([f,d])};e2.passo();
  ok(chamadas.length===1&&chamadas[0][0]===440,'ctx.audio só existe quando o host fornece (sem áudio = sem erro)');
  const osc=[],fakeCtx=class{constructor(){this.currentTime=0;this.destination={};this.state='running';}createOscillator(){const o={frequency:{value:0},connect(){},start(t){osc.push(['start',o.frequency.value]);},stop(){}};return o;}createGain(){return{gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){}};}};
  globalThis.AudioContext=fakeCtx;vm.runInThisContext(fs.readFileSync(__dirname+'/../adapters/audio.js','utf8'));const au=new C.Audio();
  au.bipe(99999,0.1);au.bipe(NaN,0.1);const r=au.bipe(440,0.1);delete globalThis.AudioContext;ok(osc.length===2&&osc[0][1]===20000&&r&&!new C.Audio().bipe(440,0.1),'Audio.bipe limita a frequência, recusa NaN e é seguro sem AudioContext');}
{ // do blocos-v2: depois de N s, reiniciar, som pronto, dt em iniciar/eventos
  const G=EditorBlocos,f=(t,ex)=>Object.assign(G.novo(t),ex||{});
  const e=nova();e.vars.declarar('n',0);
  const dep=f('depois',{v:{k:'num',v:1},f:[f('var_somar',{var:'n',v:{k:'num',v:100}})]});
  e.scene.estado.scripts={d:{blocos:[{t:'evento_quadro',f:[dep]}],fonte:G.gerar([{t:'evento_quadro',f:[dep]}])}};e.scene.create({Script:{nome:'d'}});e.iniciar();e.parar();
  for(let i=0;i<150;i++)e.passo();ok(e.vars.ler('n')===100,'"depois de 1 s" roda uma única vez');
  const e2=nova();e2.vars.declarar('n',0);const bl=[{t:'evento_quadro',f:[f('var_somar',{var:'n',v:{k:'num',v:1}}),f('se',{c:{k:'cmp',a:{k:'var',n:'n'},op:'>',b:{k:'num',v:5}},f:[f('reiniciar')],s:[]})]}];
  e2.scene.estado.scripts={r:{blocos:bl,fonte:G.gerar(bl)}};e2.scene.create({nome:'p',Transform:{x:0,y:0},Script:{nome:'r'}});e2.iniciar();e2.parar();let max=0;for(let i=0;i<30;i++){e2.passo();max=Math.max(max,e2.vars.ler('n'));}
  ok(max===5&&e2.vars.ler('n')<=5&&e2.scene.find('p'),'reiniciar volta variáveis ao estado inicial (no fim do passo)');
  ok(G.gerar([{t:'evento_colisao',f:[f('mover_x')]},{t:'evento_inicio',f:[f('mover_x')]}]).split('const dt = ctx.dt;').length===3,'início e eventos também têm dt (blocos de movimento não quebram)');
  const sons=[],e3=nova(),bl3=[{t:'evento_quadro',f:[f('som',{som:'moeda'})]}];e3.scene.estado.scripts={s:{blocos:bl3,fonte:G.gerar(bl3)}};e3.scene.create({Script:{nome:'s'}});e3.audio={efeito:n=>sons.push(n)};e3.compilarScripts();e3.passo();e3.passo();ok(sons.join()==='moeda,moeda','tocar som pronto chama audio.efeito');
  let ruim=false;try{G.gerar([{t:'evento_quadro',f:[f('som',{som:'x'})]}]);}catch(x){ruim=true;}ok(ruim,'som desconhecido é recusado');
  const ops=[],FC=class{constructor(){this.currentTime=0;this.sampleRate=8000;this.destination={};this.state='running';}createOscillator(){return{type:'',frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){ops.push('osc');},stop(){}};}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}createBuffer(c,n){return{getChannelData:()=>new Float32Array(n)};}createBufferSource(){return{connect(){},start(){ops.push('ruido');},stop(){}};}};
  globalThis.AudioContext=FC;vm.runInThisContext(fs.readFileSync(__dirname+'/../adapters/audio.js','utf8'));const au=new C.Audio();ok(au.efeito('moeda')&&au.efeito('explosao')&&!au.efeito('x')&&ops.join()==='osc,osc,ruido','Audio.efeito sintetiza os sons prontos e ignora nome desconhecido');delete globalThis.AudioContext;}
{ // Exemplo "Pega-moedas" ponta a ponta (blocos -> código -> motor): spawn, coletar, bomba reinicia
  vm.runInThisContext(fs.readFileSync(__dirname+'/../editor/exemplos.js','utf8'));
  const e=nova();C.Serializer.deJSON(e.scene,EditorExemplos.pegaMoedas());const er=e.compilarScripts();e.iniciar();e.parar();
  const w=console.warn;let av=0;console.warn=()=>av++;
  for(let i=0;i<130;i++)e.passo();
  const nome=n=>[...e.scene.entities.values()].filter(x=>x.nome===n),jog=nome('jogador')[0];
  ok(er.length===0&&av===0&&nome('moeda').length>=1&&e.scene.find('placar').Sprite.rotulo==='Pontos: 0','exemplo: compila sem erros, moedas nascem sozinhas, placar mostra 0');
  const m=nome('moeda')[0];jog.Transform.x=m.Transform.x;jog.Transform.y=m.Transform.y;jog.Velocity={vx:0,vy:0};e.passo();e.passo();
  ok(e.vars.ler('pontos')===1&&!e.scene.get(m.id)&&e.scene.find('placar').Sprite.rotulo==='Pontos: 1','exemplo: encostar na moeda soma ponto, remove a moeda e atualiza o placar');
  for(let i=0;i<200&&!nome('bomba').length;i++)e.passo();const b=nome('bomba')[0];jog.Transform.x=b.Transform.x;jog.Transform.y=b.Transform.y;e.passo();e.passo();console.warn=w;
  ok(b&&e.vars.ler('pontos')===0&&nome('bomba').length===0&&nome('moeda').length===0,'exemplo: encostar na bomba reinicia o jogo (pontos 0, objetos criados somem)');}
{ // B4: cascata de eventos deixa rastro
  const ev=new C.Events();ev.on('x',()=>ev.emit('x'));ev.emit('x');ev.aoDescartar=()=>{};ev.flush();ok(ev.descartados>0&&ev.fila.length===0,'cascata acima do limite é contada ('+ev.descartados+')');}
{ // R3: campos de runtime não vão para o save
  const e=nova();e.scene.estado.camera={x:10,y:20,zoom:1};e.scene.create({Transform:{x:0,y:0}});e.passo();e.passo();
  const j=C.Serializer.paraJSON(e.scene);ok(!('px' in j.estado.camera)&&!('px' in j.entidades[0].Transform),'save não inclui px/py');}
{ // R1: validação na criação
  const s=new C.Scene(),falha=d=>{try{s.create(d);return false;}catch(x){return true;}};
  ok(falha({Transform:{x:NaN,y:0}})&&falha({Transform:{x:0,y:0},Body:{forma:'circulo'}})&&falha({Transform:{x:0,y:0},Body:{w:10,h:0}})&&falha({Body:{raio:5}})&&falha({Transform:{x:0,y:0},Body:{raio:5,massa:-1}}),'componentes inválidos são recusados com erro claro');
  ok(!falha({Transform:{x:0,y:0},Body:{raio:5,massa:1}}),'componentes válidos continuam aceitos');}
{ // R2: objeto rápido não atravessa parede fina
  const e=nova();e.scene.create({Transform:{x:300,y:0},Body:{forma:'retangulo',w:4,h:200,massa:0}});
  const b=e.scene.create({Transform:{x:0,y:0},Velocity:{vx:1500,vy:0},Body:{raio:6,massa:1,elasticidade:.5}});
  for(let i=0;i<30;i++)e.passo();ok(b.Transform.x<300,'bola a 1500 px/s não atravessa parede de 4 px (x '+b.Transform.x.toFixed(0)+')');}
// 9b) blocos genéricos: atributo de objeto, contas e lógica
{const G=EditorBlocos,e=nova(),f=(t,o)=>Object.assign(G.novo(t),o),n=x=>({k:'num',v:x});
 const alvo=e.scene.create({nome:'alvo',Transform:{x:10,y:0},Sprite:{forma:'circulo',raio:5,cor:'#fff'}});
 const bl=[{t:'evento_quadro',f:[f('mudar_attr',{o:'n:alvo',a:'vx',v:{k:'op',a:{k:'attr',o:'proprio',a:'x'},o:'*',b:n(2)}}),f('somar_attr',{o:'n:alvo',a:'y',v:n(3)}),f('mudar_attr',{o:'n:alvo',a:'texto',v:{k:'txt',v:'oi'}}),f('se',{c:{k:'e',a:{k:'cmp',a:{k:'x'},op:'>=',b:n(0)},b:{k:'nao',a:{k:'cmp',a:{k:'x'},op:'>',b:n(5)}}},f:[f('mudar_attr',{o:'proprio',a:'cor',v:{k:'txt',v:'#123456'}})],s:[]})]}];
 e.scene.estado.scripts={s:{blocos:bl,fonte:G.gerar(bl)}};const dono=e.scene.create({Transform:{x:3,y:0},Sprite:{forma:'circulo',raio:5,cor:'#fff'},Script:{nome:'s'}});
 ok(e.compilarScripts().length===0,'blocos de atributo compilam');e.passo();
 ok(alvo.Velocity&&alvo.Velocity.vx===6&&alvo.Transform.y===3&&alvo.Sprite.rotulo==='oi'&&dono.Sprite.cor==='#123456','mudar/somar atributo, contas e lógica e/não funcionam');
 let msg='';try{G.gerar([{t:'evento_quadro',f:[f('mudar_attr',{a:'inexistente'})]}])}catch(x){msg=x.message}ok(/desconhecido/.test(msg),'atributo inexistente é recusado');}
// 9c) Fase A: atributos próprios, etiquetas, modelos, laços, chance, observar
{const G=EditorBlocos,f=(t,o)=>Object.assign(G.novo(t),o),n=x=>({k:'num',v:x}),rodar=(bl,cria,passos=1)=>{const e=nova();cria(e);e.scene.estado.scripts={s:{blocos:bl,fonte:G.gerar(bl)}};const er=e.compilarScripts();ok(er.length===0,'compila: '+bl[0].f.map(b=>b.t).join(','));for(let i=0;i<passos;i++)e.passo();return e;};
 // atributo próprio: definir, somar, ler em condição, e leitura em outro objeto pelo nome
 let e=rodar([{t:'evento_quadro',f:[f('mudar_attr',{o:'proprio',a:'a:vida',v:n(3)}),f('somar_attr',{o:'proprio',a:'a:vida',v:n(2)}),f('mudar_attr',{o:'n:alvo',a:'x',v:{k:'attr',o:'proprio',a:'a:vida'}})]}],e=>{e.scene.create({nome:'alvo',Transform:{x:0,y:0}});e.scene.create({nome:'dono',Transform:{x:0,y:0},Script:{nome:'s'}});});
 ok(e.scene.find('dono').Attr.vida===5&&e.scene.find('alvo').Transform.x===5,'atributo próprio: definir, somar e ler');
 // etiquetas: contar, para cada, tem etiqueta, mais próximo; modelo + clonar
 e=rodar([{t:'evento_quadro',f:[f('para_cada',{tag:'inimigo',f:[f('somar_attr',{o:'cada',a:'a:golpes',v:n(1)})]}),f('mudar_attr',{o:'proprio',a:'a:total',v:{k:'contar',tag:'inimigo'}}),f('mudar_attr',{o:'proprio',a:'a:perto',v:{k:'attr',o:'p:inimigo',a:'x'}}),f('se',{c:{k:'etiq',o:'proprio',tag:'heroi'},f:[f('mudar_attr',{o:'proprio',a:'a:heroi',v:n(1)})]})]}],e=>{e.scene.create({nome:'i1',Transform:{x:10,y:0},Etiquetas:['inimigo']});e.scene.create({nome:'i2',Transform:{x:200,y:0},Etiquetas:['inimigo']});e.scene.create({nome:'m',Transform:{x:0,y:0},Etiquetas:['inimigo'],Modelo:{}});e.scene.create({nome:'dono',Transform:{x:0,y:0},Etiquetas:['heroi'],Script:{nome:'s'}});});
 const d=e.scene.find('dono');ok(e.scene.find('i1').Attr.golpes===1&&e.scene.find('i2').Attr.golpes===1&&d.Attr.total===2&&d.Attr.perto===10&&d.Attr.heroi===1,'etiquetas: para cada, contar, mais próximo e tem etiqueta (modelo fica de fora)');
 ok(!e.scene.find('m').Attr,'modelo não participa do jogo');
 e=rodar([{t:'evento_inicio',f:[f('clonar',{nome:'m',vx:n(50),vy:n(60)})]}],e=>{e.scene.create({nome:'m',Transform:{x:0,y:0},Modelo:{},Sprite:{forma:'circulo',raio:3,cor:'#fff'}});e.scene.create({nome:'dono',Transform:{x:0,y:0},Script:{nome:'s'}});});
 const cps=e.scene.findAll('m');ok(cps.length===2&&cps[1].Transform.x===50&&cps[1].Modelo===undefined&&e.scene.query('Sprite').length===1,'clonar cria cópia sem a marca Modelo e o molde some do jogo');
 // laços e controle
 e=rodar([{t:'evento_quadro',f:[f('repetir',{n:n(4),f:[f('somar_attr',{o:'proprio',a:'a:c',v:n(1)})]}),f('enquanto',{c:{k:'cmp',a:n(1),op:'=',b:n(1)},f:[f('somar_attr',{o:'proprio',a:'a:inf',v:n(1)})]}),f('chance',{p:n(100),f:[f('mudar_attr',{o:'proprio',a:'a:ch',v:n(1)})]}),f('observar',{rot:'c',v:{k:'attr',o:'proprio',a:'a:c'}}),f('comentario',{txt:'oi\nx'}),f('sair'),f('mudar_attr',{o:'proprio',a:'a:depois',v:n(1)})]}],e=>{e.scene.create({nome:'dono',Transform:{x:0,y:0},Script:{nome:'s'}});});
 const o=e.scene.find('dono');ok(o.Attr.c===4&&o.Attr.inf===10000&&o.Attr.ch===1&&o.Attr.depois===undefined&&e.observados.c===4,'repetir, enquanto (limitado), chance, observar, comentário e sair');
 const lim=(fn)=>{try{fn();return''}catch(x){return x.message}};
 const sc=()=>new C.Scene();
 ok(/atributo/.test(lim(()=>sc().create({Attr:{'1x':1}})))&&/Attr/.test(lim(()=>sc().create({Attr:{a:{}}})))&&/Etiquetas/.test(lim(()=>sc().create({Etiquetas:['']})))&&/Modelo/.test(lim(()=>sc().create({Modelo:5}))),'validação de Attr, Etiquetas e Modelo');
 const cj=nova();cj.scene.create({nome:'a',Transform:{x:1,y:2},Attr:{vida:3},Etiquetas:['x'],Modelo:{}});const js=JSON.stringify(C.Serializer.paraJSON(cj.scene)),c2=nova();C.Serializer.deJSON(c2.scene,JSON.parse(js));const a2=c2.scene.find('a');ok(a2.Attr.vida===3&&a2.Etiquetas[0]==='x'&&a2.Modelo,'Attr, Etiquetas e Modelo salvam e carregam');}
// 9d) Fase C1: clique, mouse, cenas por JSON, câmera por blocos
{const G=EditorBlocos,f=(t,o)=>Object.assign(G.novo(t),o),n=x=>({k:'num',v:x});
 const ptr=(x,y,pressed)=>({poll:()=>({keys:new Set(),keysPressed:new Set(),down:new Set(),pressed:new Set(),released:new Set(),axes:{x:0,y:0},pointer:{x,y,tx:x,ty:y,down:!!pressed,pressed:!!pressed}})});
 const mk=(bl,cria)=>{const e=nova();cria(e);e.scene.estado.scripts={s:{blocos:bl,fonte:G.gerar(bl)}};ok(e.compilarScripts().length===0,'compila: '+bl.map(h=>h.t).join(','));return e;};
 // evento clique: só o objeto sob o ponteiro recebe; fora não
 let e=mk([{t:'evento_clique',f:[f('somar_attr',{o:'proprio',a:'a:cliques',v:n(1)})]}],e=>{e.scene.create({nome:'a',Transform:{x:100,y:100},Body:{forma:'circulo',raio:20,massa:0},Script:{nome:'s'}});e.scene.create({nome:'b',Transform:{x:300,y:100},Sprite:{w:40,h:40,cor:'#fff'},Script:{nome:'s'}});});
 e.input=ptr(105,100,true);e.passo();e.input=ptr(300,119,true);e.passo();e.input=ptr(300,125,true);e.passo();e.input=ptr(100,100,false);e.passo();
 ok(e.scene.find('a').Attr.cliques===1&&e.scene.find('b').Attr.cliques===1,'evento "quando clicarem neste objeto": círculo (Body) e retângulo (Sprite), só dentro da forma e só ao apertar');
 // condição mouse sobre / mouse apertado e posição do mouse
 e=mk([{t:'evento_quadro',f:[f('se',{c:{k:'sobre',o:'proprio'},f:[f('mudar_attr',{o:'proprio',a:'a:sobre',v:n(1)})]}),f('se',{c:{k:'mouse',modo:'down'},f:[f('mudar_attr',{o:'proprio',a:'a:mx',v:{k:'mx'}}),f('mudar_attr',{o:'proprio',a:'a:my',v:{k:'my'}})]})]}],e=>{e.scene.create({nome:'a',Transform:{x:100,y:100},Sprite:{w:40,h:40,cor:'#fff'},Script:{nome:'s'}});});
 e.input=ptr(110,90,true);e.passo();const a=e.scene.find('a');ok(a.Attr.sobre===1&&a.Attr.mx===110&&a.Attr.my===90,'condições "mouse sobre" e "mouse apertado" e valores x/y do mouse');
 // texto: atributos novos
 e=mk([{t:'evento_inicio',f:[f('mudar_attr',{o:'proprio',a:'tamanhoTexto',v:n(30)}),f('mudar_attr',{o:'proprio',a:'alinhar',v:{k:'txt',v:'esquerda'}})]}],e=>{e.scene.create({nome:'t',Transform:{x:0,y:0},Sprite:{rotulo:'x'},Script:{nome:'s'}});});e.passo();ok(e.scene.find('t').Sprite.tamanhoTexto===30&&e.scene.find('t').Sprite.alinhar==='esquerda','atributos de texto: tamanho e alinhamento');
 // cenas por JSON: ir para a cena mantém variáveis e religa scripts
 e=nova();const base=nova();base.scene.create({nome:'c2obj',Transform:{x:5,y:5},Script:{nome:'p2'}});base.scene.estado.vars={extra:7};
 const bl2=[{t:'evento_inicio',f:[f('var_somar',{var:'pontos',v:n(10)})]}];base.scene.estado.scripts={p2:{blocos:bl2,fonte:G.gerar(bl2)}};
 e.registrarCenaJSON('fase2',C.Serializer.paraJSON(base.scene));
 const bl1=[{t:'evento_quadro',f:[f('ir_cena',{cena:'fase2'})]}];e.scene.estado.scripts={p1:{blocos:bl1,fonte:G.gerar(bl1)}};e.scene.create({nome:'c1',Transform:{x:0,y:0},Script:{nome:'p1'}});e.compilarScripts();e.vars.declarar('pontos',1);
 e.passo();e.passo();ok(e.scene.estado.cena==='fase2'&&e.scene.find('c2obj')&&!e.scene.find('c1')&&e.vars.ler('pontos')===11&&e.vars.ler('extra')===7,'ir para a cena: troca, religa scripts e mantém variáveis (cenas novas só acrescentam as suas)');
 // câmera
 e=mk([{t:'evento_inicio',f:[f('camera_seguir',{nome:'alvo'}),f('camera_zoom',{v:n(2)})]}],e=>{e.scene.create({nome:'alvo',Transform:{x:50,y:60}});e.scene.create({nome:'d',Transform:{x:0,y:0},Script:{nome:'s'}});});e.passo();
 ok(e.scene.estado.camera.seguir==='alvo'&&e.scene.estado.camera.zoom===2,'blocos de câmera: seguir e zoom');
 let m='';try{G.gerar([{t:'evento_inicio',f:[f('ir_cena',{cena:''})]}])}catch(x){m=x.message}ok(/cena/.test(m),'ir para a cena exige escolher a cena');}
// 9e) revisão do C1: clique só no objeto do topo, ctx.sobre sem sistema ui, ponteiro ainda ausente
{const G=EditorBlocos,f=(t,o)=>Object.assign(G.novo(t),o),n=x=>({k:'num',v:x});
 const ptr=(x,y,pressed,ativo)=>({poll:()=>({keys:new Set(),keysPressed:new Set(),down:new Set(),pressed:new Set(),released:new Set(),axes:{x:0,y:0},pointer:{x,y,tx:x,ty:y,down:!!pressed,pressed:!!pressed,ativo}})});
 const bl=[{t:'evento_clique',f:[f('somar_attr',{o:'proprio',a:'a:c',v:n(1)})]}];
 let e=nova();e.scene.estado.scripts={s:{blocos:bl,fonte:G.gerar(bl)}};
 e.scene.create({nome:'baixo',Transform:{x:50,y:50},Sprite:{w:40,h:40,camada:0},Script:{nome:'s'}});e.scene.create({nome:'topo',Transform:{x:50,y:50},Sprite:{w:40,h:40,camada:5},Script:{nome:'s'}});e.scene.create({nome:'topo2',Transform:{x:50,y:50},Sprite:{w:40,h:40,camada:0},Script:{nome:'s'}});
 e.compilarScripts();e.input=ptr(50,50,true,true);e.passo();
 ok((e.scene.find('baixo').Attr||{}).c===undefined&&e.scene.find('topo').Attr.c===1&&(e.scene.find('topo2').Attr||{}).c===undefined,'clique vai só para o objeto do topo (maior camada)');
 e=nova();e.scene.create({nome:'a',Transform:{x:0,y:0},Sprite:{w:40,h:40,fixo:true},Script:{nome:'s'}});e.scene.estado.scripts={s:{blocos:bl,fonte:G.gerar(bl)}};e.compilarScripts();
 e.input=ptr(0,0,true,false);e.passo();ok(!e.scene.find('a').Attr,'ponteiro ainda ausente (ativo:false) não conta como clique no canto');
 const sem=new C.Engine({padrao:false});sem.scene.create({nome:'a',Transform:{x:0,y:0},Sprite:{w:10,h:10}});sem.input=ptr(0,0,false,true);sem.passo();ok(sem.ctx.sobre(sem.scene.find('a'))===true,'ctx.sobre funciona com padrao:false (sem o sistema ui)');}
// 9f) câmera: limites sem tamanho são ignorados (antes prendiam a câmera em 0,0)
{const e=nova();e.scene.create({nome:'a',Transform:{x:300,y:200}});e.scene.estado.camera={x:400,y:225,zoom:2,suavizar:50,seguir:'a',limites:{x0:0,y0:0,x1:0,y1:0}};for(let i=0;i<60;i++)e.passo();ok(Math.abs(e.scene.estado.camera.x-300)<1&&Math.abs(e.scene.estado.camera.y-200)<1,'câmera segue o alvo mesmo com limites 0,0,0,0 (ignorados)');}
// 9g) hierarquia: filhos seguem o pai, remoção em cascata, ciclos recusados, save checado
{const e=nova(),S=e.scene,pai=S.create({nome:'pai',Transform:{x:100,y:100},Velocity:{vx:60,vy:0}}),fil=S.create({nome:'filho',Transform:{x:0,y:0},Pai:{id:pai.id,dx:10,dy:-5}}),neto=S.create({nome:'neto',Transform:{x:0,y:0},Pai:{id:fil.id,dx:1,dy:1}});
 e.passo();ok(Math.abs(fil.Transform.x-(pai.Transform.x+10))<1e-9&&fil.Transform.y===95&&Math.abs(neto.Transform.x-(fil.Transform.x+1))<1e-9,'filho e neto seguem o pai (posição + deslocamento)');
 const pf=nova(),A=pf.scene.create({nome:'a',Transform:{x:0,y:0}}),B=pf.scene.create({nome:'b',Transform:{x:50,y:20}});ok(pf.scene.adotar(B,A)&&B.Pai.dx===50&&B.Pai.dy===20&&!pf.scene.adotar(A,B)&&!pf.scene.adotar(A,A),'adotar mantém a posição e recusa ciclo e auto-adoção');
 pf.scene.soltar(B);ok(!B.Pai,'soltar remove o pai');pf.scene.adotar(B,A);pf.scene.destroy(A.id);pf.scene.flush();ok(!pf.scene.get(B.id),'remover o pai remove os filhos');
 const lim=fn=>{try{fn();return''}catch(x){return x.message}};
 ok(/Pai/.test(lim(()=>nova().scene.create({Pai:{id:'x'}})))&&/Pai/.test(lim(()=>nova().scene.create({id:3,Pai:{id:3}}))),'validação do componente Pai');
 const sv=C.Serializer.paraJSON(S);const e2=nova();C.Serializer.deJSON(e2.scene,JSON.parse(JSON.stringify(sv)));ok(e2.scene.find('neto').Pai.id===fil.id,'Pai salva e carrega');
 const ruim=JSON.parse(JSON.stringify(sv));ruim.entidades.find(x=>x.nome==='filho').Pai.id=999;ok(/pai que não existe/.test(lim(()=>C.Serializer.deJSON(nova().scene,ruim))),'save com pai inexistente é recusado');
 const ciclo=JSON.parse(JSON.stringify(sv));ciclo.entidades.find(x=>x.nome==='pai').Pai={id:neto.id,dx:0,dy:0};ok(/ciclo/.test(lim(()=>C.Serializer.deJSON(nova().scene,ciclo))),'save com ciclo de pais é recusado');}
// 10) perfil por sistema
{const e=nova();e.perfil=true;e.scene.create({Transform:{x:0,y:0},Velocity:{vx:1,vy:0}});for(let i=0;i<5;i++)e.passo();
 ok(['controles','ui','scripts','fisica','animacao','camera'].every(n=>typeof e.tempos[n]==='number'&&e.tempos[n]>=0),'perfil mede o tempo de cada sistema');
 const f=nova();f.passo();ok(Object.keys(f.tempos).length===0,'sem perfil não mede nada');}

// imagens e tamanho da cena no save
{
  const base = () => ({ formato: C.Serializer.FORMATO, estado: {}, entidades: [] });
  const tenta = f => { const d = base(); f(d); try { C.Serializer.deJSON(new C.Scene(), d); return null; } catch (x) { return x.message; } };
  ok(tenta(d => { d.estado.imagens = { a: 'data:image/png;base64,AAAA' }; }) === null, 'save aceita imagem png em data URL');
  ok(/imagem/.test(tenta(d => { d.estado.imagens = { a: 'http://x/y.png' }; })), 'save recusa imagem que não é data URL');
  ok(/imagem/.test(tenta(d => { d.estado.imagens = { a: 'data:image/png;base64,' + 'A'.repeat(600001) }; })), 'save recusa imagem enorme');
  ok(/tamanho/.test(tenta(d => { d.estado.tamanho = { largura: 5, altura: 450 }; })), 'save recusa tamanho de cena inválido');
  ok(tenta(d => { d.estado.tamanho = { largura: 1600, altura: 900 }; }) === null, 'save aceita tamanho de cena válido');
}

// 9h. esperar (ctx.depois) e tween (ctx.tween)
{
  const e = nova(), en = e.scene.create({ nome: 'a', Transform: { x: 0, y: 0 } }); let n = 0;
  e.ctx.depois(0.5, () => n++);
  for (let i = 0; i < 29; i++) e.passo(); ok(n === 0, 'depois: ainda não passou 0,5 s (29 passos)');
  for (let i = 0; i < 2; i++) e.passo(); ok(n === 1, 'depois: roda uma vez depois de 0,5 s');
  for (let i = 0; i < 30; i++) e.passo(); ok(n === 1, 'depois: não repete');
  let fim = 0; e.ctx.tween(en.Transform, 'x', 100, 1, 'linear', () => fim++);
  for (let i = 0; i < 30; i++) e.passo(); ok(Math.abs(en.Transform.x - 50) < 2, 'tween linear: na metade do tempo está perto da metade (' + en.Transform.x.toFixed(1) + ')');
  for (let i = 0; i < 31; i++) e.passo(); ok(en.Transform.x === 100 && fim === 1, 'tween termina exatamente no valor e chama o callback uma vez');
  e.ctx.tween(en.Transform, 'x', 0, 1, 'suave'); for (let i = 0; i < 30; i++) e.passo(); ok(Math.abs(en.Transform.x - 50) < 2, 'tween suave: metade do tempo, metade do caminho');
  e.ctx.tween(en.Transform, 'x', 500, 0); ok(en.Transform.x === 500, 'tween com duração 0 aplica na hora');
  e.ctx.tween(en.Transform, 'y', 100, 2); for (let i = 0; i < 10; i++) e.passo(); e.ctx.tween(en.Transform, 'y', 0, 1); for (let i = 0; i < 61; i++) e.passo(); ok(en.Transform.y === 0, 'tween novo no mesmo campo substitui o antigo');
  let erros = 0; for (const f of [() => e.ctx.depois(-1, () => {}), () => e.ctx.depois(1, 5), () => e.ctx.tween(en.Transform, 'zzz', 1, 1), () => e.ctx.tween(en.Transform, 'x', NaN, 1), () => e.ctx.tween(en.Transform, 'x', 1, -1), () => e.ctx.tween(en.Transform, 'x', 1, 1, 'mola')]) { try { f(); } catch (x) { erros++; } }
  ok(erros === 6, 'depois/tween recusam argumentos inválidos');
  let boom = null; e.events.on('erro-script', d => { boom = d; }); e.ctx.depois(0, () => { throw new Error('x'); }); e.passo(); ok(boom && /x/.test(boom.mensagem), 'erro dentro do depois vira erro-script e não derruba o motor');
  let rodou = 0; e.ctx.depois(0.1, () => rodou++); e.reiniciar(); for (let i = 0; i < 20; i++) e.passo(); ok(rodou === 0, 'reiniciar cancela temporizadores pendentes');
}

// 9i. listas
{
  const e = nova(), L = e.listas;
  ok(L.tamanho('inv') === 0 && L.item('inv', 0) === undefined && !L.existe('inv'), 'lista inexistente lê como vazia (sem criar)');
  L.adicionar('inv', 'espada'); L.adicionar('inv', 3); L.adicionar('inv', true);
  ok(L.tamanho('inv') === 3 && L.item('inv', 0) === 'espada' && L.contem('inv', 3) && !L.contem('inv', 'arco'), 'adicionar, tamanho, item e contem');
  L.definir('inv', 1, 9); ok(L.item('inv', 1) === 9, 'definir troca o item');
  ok(L.remover('inv', 0) === 'espada' && L.tamanho('inv') === 2 && L.item('inv', 0) === 9, 'remover tira e devolve o item');
  let erros = 0; for (const f of [() => L.adicionar('inv', NaN), () => L.adicionar('inv', {}), () => L.adicionar('1x', 1), () => L.definir('inv', 5, 1), () => L.remover('inv', -1), () => L.adicionar('inv', 'x'.repeat(201))]) { try { f(); } catch (x) { erros++; } }
  ok(erros === 6, 'listas recusam item inválido, nome inválido e posição fora');
  for (let i = 0; i < 1000; i++) { try { L.adicionar('cheia', i); } catch (x) { break; } } let cheia = false; try { L.adicionar('cheia', 1); } catch (x) { cheia = true; } ok(L.tamanho('cheia') === 1000 && cheia, 'lista tem limite de 1000 itens');
  const json = C.Serializer.paraJSON(e.scene), e2 = nova(); C.Serializer.deJSON(e2.scene, JSON.parse(JSON.stringify(json))); ok(e2.listas.item('inv', 0) === 9 && e2.listas.tamanho('inv') === 2, 'listas salvam e carregam');
  const ruim = JSON.parse(JSON.stringify(json)); ruim.estado.listas.inv = [{ a: 1 }]; let rec = false; try { C.Serializer.deJSON(nova().scene, ruim); } catch (x) { rec = /lista/.test(x.message); } ok(rec, 'save com item de lista inválido é recusado');
  e.listas.limpar('inv'); ok(e.listas.tamanho('inv') === 0, 'limpar esvazia'); 
  const e3 = nova(); e3.registrarCena('a', { montar() {} }); e3.registrarCena('b', { montar() {} }); e3.listas.adicionar('bolsa', 1); e3.irPara('a'); e3.irPara('b'); ok(e3.listas.tamanho('bolsa') === 1, 'listas atravessam a troca de cena');
}

// 9j. mapa de tiles
{
  const e = nova(), dados = []; for (let i = 0; i < 12; i++) dados.push(i < 4 || i >= 8 ? 2 : (i % 4 === 0 || i % 4 === 3 ? 2 : 1));   // 4x3: paredes em volta, grama no meio
  const mapa = e.scene.create({ nome: 'mapa', Transform: { x: 100, y: 50 }, Tiles: { tamanho: 10, colunas: 4, linhas: 3, paleta: [{ cor: '#0a0' }, { cor: '#888', solido: true }], dados } });
  e.passo(); const cols = [...e.scene.entities.values()].filter(x => x.nome === '_tile');
  ok(mapa.Tiles.gerado === true && cols.length === 4 && cols.some(c => c.Body.w === 40 && c.Transform.y === 55) && cols.some(c => c.Body.w === 10), 'tiles: colisores gerados e juntados por linha (4: topo, base e 2 laterais)');
  ok(C.Tiles.em(mapa, 115, 65) === 1 && C.Tiles.em(mapa, 101, 51) === 2 && C.Tiles.em(mapa, 0, 0) === 0, 'tiles: ler célula pelo mundo');
  C.Tiles.definir(e.scene, mapa, 115, 65, 2); e.scene.flush(); { const t = [...e.scene.entities.values()].filter(x => x.nome === '_tile'); ok(t.length === 4 && t.some(c => c.Body.w === 20), 'tiles: pintar célula sólida refaz os colisores (junta 2 células)'); }
  const bola = e.scene.create({ nome: 'b', Transform: { x: 125, y: 65 }, Velocity: { vx: -80, vy: 0 }, Body: { forma: 'circulo', raio: 3, massa: 1 } }); const x0 = bola.Transform.x; for (let i = 0; i < 90; i++) e.passo(); ok(bola.Transform.x > 119, 'tiles: parede sólida segura o corpo (x=' + bola.Transform.x.toFixed(1) + ')');
  let erros = 0; for (const t of [{ tamanho: 2 }, { colunas: 0 }, { dados: [1] }, { dados: dados.map(() => 9) }, { paleta: [] }]) { try { new C.Scene().create({ Transform: { x: 0, y: 0 }, Tiles: { tamanho: 10, colunas: 4, linhas: 3, paleta: [{ cor: '#000' }], dados: dados.map(() => 1), ...t } }); } catch (x) { erros++; } }
  ok(erros === 5, 'tiles: dados e limites inválidos são recusados');
  const json = C.Serializer.paraJSON(nova().scene); const e2 = nova(); C.Serializer.deJSON(e2.scene, JSON.parse(JSON.stringify(C.Serializer.paraJSON(e.scene)))); ok([...e2.scene.entities.values()].filter(x => x.nome === '_tile').length === 4 && e2.scene.find('mapa').Tiles.gerado, 'tiles: salvar e carregar mantém mapa e colisores');
}

// 9k. salvar e carregar partida
{
  vm.runInThisContext(fs.readFileSync(__dirname + '/../adapters/armazem.js', 'utf8'));
  const e = nova(); e.vars.declarar('pontos', 0); const j = e.scene.create({ nome: 'j', Transform: { x: 10, y: 20 } });
  e.vars.definir('pontos', 7); e.listas.adicionar('bolsa', 'chave'); j.Transform.x = 111;
  ok(e.existePartida('slot1') === false && e.carregarPartida('slot1') === false, 'partida: espaço vazio não existe e não carrega');
  e.salvarPartida('slot1'); ok(e.existePartida('slot1'), 'partida: salvar cria o espaço');
  e.vars.definir('pontos', 99); e.listas.limpar('bolsa'); j.Transform.x = 5; e.scene.create({ nome: 'extra', Transform: { x: 0, y: 0 } }); e.scene.flush();
  ok(e.carregarPartida('slot1') === true && e.vars.ler('pontos') === 7 && e.listas.item('bolsa', 0) === 'chave' && e.scene.find('j').Transform.x === 111 && !e.scene.find('extra'), 'partida: carregar restaura variáveis, listas e objetos');
  let erros = 0; for (const f of [() => e.salvarPartida('../x'), () => e.salvarPartida(''), () => e.existePartida(5), () => e.carregarPartida('a'.repeat(31))]) { try { f(); } catch (x) { erros++; } } ok(erros === 4, 'partida: nome de espaço inválido é recusado');
  e.armazem.set('partida:ruim', '{lixo'); ok(e.carregarPartida('ruim') === false, 'partida: arquivo corrompido não derruba (devolve false)');
  const e2 = nova(); e2.armazem = e.armazem; e2.vars.declarar('pontos', 0); e2.scene.create({ nome: 'j', Transform: { x: 0, y: 0 } }); e2.carregarPartida('slot1'); ok(e2.vars.ler('pontos') === 7, 'partida: outro motor lê o mesmo armazém');
  const e3 = nova(); e3.scene.create({ nome: 'p', Transform: { x: 0, y: 0 }, Velocity: { vx: 60, vy: 0 } }); e3.salvarPartida('m'); for (let i = 0; i < 60; i++) e3.passo(); e3.scene.find('p').Script = undefined; e3.ctx.carregarPartida('m'); e3.passo(); ok(Math.abs(e3.scene.find('p').Transform.x) < 5, 'partida: carregar no meio do passo é aplicado no fim do quadro');
}
{const e=nova();const a=e.scene.create({Animacao:{atual:'x',animacoes:{x:{linha:0,quadros:4,fps:10},u:{linha:2,quadros:3,fps:10,repetir:false}}}});
 for(let i=0;i<20;i++)e.passo();
 ok(e.scene.animar(a,'u')===true&&a.Animacao.atual==='u'&&a.Animacao.quadro===0,'animar troca e reinicia');
 for(let i=0;i<60;i++)e.passo();ok(a.Animacao.terminou&&a.Animacao.linha===2,'animar: toca até o fim na linha certa');
 ok(e.scene.animar(a,'nada')===false&&a.Animacao.atual==='u','animar: nome inexistente é ignorado');}
{const base=()=>JSON.parse(JSON.stringify(C.Serializer.paraJSON(new C.Engine().scene)));const v=so=>{const d=base();d.estado=d.estado||{};d.estado.sons=so;try{C.Serializer.deJSON(new C.Scene(),d);return true}catch(x){return false}};
 ok(v({a:'data:audio/wav;base64,AAAA'})===true,'save aceita som em data URL');
 ok(v({a:'http://x/y.wav'})===false&&v({a:'data:image/png;base64,AA'})===false,'save recusa som que não é áudio data URL');
 const ch=[];const au=new C.Audio();ok(typeof au.parar==='function'&&au.parar('x')===false,'Audio.parar sem som em repetição é seguro');}
{const cr=(b,t,v)=>{const e=nova();e.scene.estado.gravidade={x:0,y:0};return e.scene.create(Object.assign({nome:'p',Transform:t||{x:0,y:0}},b,v||{}))};
 const tri=[[-30,30],[30,30],[0,-30]];
 const f=b=>{try{nova().scene.create({Transform:{x:0,y:0},Body:b});return true}catch(x){return false}};
 ok(f({forma:'poligono',pontos:tri,massa:0})&&!f({forma:'poligono',pontos:[[0,0],[1,1]]})&&!f({forma:'poligono',pontos:[[0,0],[10,0],[20,0]]})&&!f({forma:'poligono',pontos:[[0,0],[10,0],[2,2],[10,10],[0,10]]})&&!f({forma:'poligono'}),'polígono: aceita convexo; recusa poucos pontos, reta e côncavo');
 const e=nova();e.scene.estado.gravidade={x:0,y:300};
 e.scene.create({nome:'chao',Transform:{x:0,y:100},Body:{forma:'poligono',pontos:[[-200,-10],[200,-10],[200,10],[-200,10]],massa:0}});
 const bola=e.scene.create({nome:'bola',Transform:{x:0,y:0},Velocity:{vx:0,vy:0},Body:{forma:'circulo',raio:10,massa:1}});
 for(let i=0;i<240;i++)e.passo();
 ok(bola.Transform.y<=91&&bola.Transform.y>80,'círculo pousa em polígono (y '+bola.Transform.y.toFixed(1)+')');
 const e2=nova();e2.scene.estado.gravidade={x:0,y:300};
 e2.scene.create({nome:'rampa',Transform:{x:0,y:100},Body:{forma:'poligono',pontos:tri.map(q=>[q[0]*3,q[1]]),massa:0}});
 const cx=e2.scene.create({nome:'caixa',Transform:{x:0,y:20},Velocity:{vx:0,vy:0},Body:{forma:'retangulo',w:20,h:20,massa:1}});
 for(let i=0;i<300;i++)e2.passo();
 ok(Number.isFinite(cx.Transform.y)&&cx.Transform.y<130,'retângulo não atravessa polígono (y '+cx.Transform.y.toFixed(1)+')');
 const e3=nova();e3.scene.estado.gravidade={x:0,y:0};let g=0;e3.events.on('gatilho',()=>g++);
 e3.scene.create({nome:'zona',Transform:{x:0,y:0},Body:{forma:'poligono',pontos:tri,massa:0,sensor:true}});
 e3.scene.create({nome:'pe',Transform:{x:5,y:5},Velocity:{vx:0,vy:0},Body:{forma:'circulo',raio:5,massa:1}});
 e3.passo();ok(g>0,'sensor poligonal avisa gatilho');
 const e4=nova();e4.scene.estado.gravidade={x:0,y:0};let g4=0;e4.events.on('gatilho',()=>g4++);
 e4.scene.create({nome:'zona',Transform:{x:0,y:0},Body:{forma:'poligono',pontos:tri,massa:0,sensor:true}});
 e4.scene.create({nome:'longe',Transform:{x:200,y:0},Velocity:{vx:0,vy:0},Body:{forma:'circulo',raio:5,massa:1}});
 e4.passo();ok(g4===0,'sem contato, sem gatilho');}
{const mk=()=>{const e=nova();e.scene.estado.gravidade={x:0,y:0};
 // mapa 10x7 (tamanho 20): parede vertical na coluna 5, com abertura só na linha 6
 const dados=Array(70).fill(0);for(let r=0;r<6;r++)dados[r*10+5]=1;
 e.scene.create({nome:'mapa',Transform:{x:0,y:0},Tiles:{tamanho:20,colunas:10,linhas:7,paleta:[{cor:'#444',solido:true}],dados}});return e};
 const e=mk();e.passo();const mapa=e.scene.find('mapa');
 const r=C.Caminho.achar(e.scene,{x:30,y:30},{x:170,y:30});
 ok(r&&r.length>=2&&r[r.length-1].x===170,'A*: acha caminho contornando a parede ('+(r?r.length+' pontos':'nenhum')+')');
 ok(r&&r.some(p=>p.y>=120),'A*: o caminho passa pela abertura (embaixo)');
 const bloq=mk();bloq.passo();const m2=bloq.scene.find('mapa');for(let r2=0;r2<7;r2++)m2.Tiles.dados[r2*10+5]=1;
 ok(C.Caminho.achar(bloq.scene,{x:30,y:30},{x:170,y:30})===null,'A*: sem passagem devolve null');
 ok(C.Caminho.achar(e.scene,{x:110,y:30},{x:170,y:30})===null,'A*: origem dentro da parede devolve null');
 const rp=C.Caminho.achar(e.scene,{x:30,y:30},{x:110,y:30});ok(rp&&rp.length>=1&&(Math.abs(rp[rp.length-1].x-90)<1||Math.abs(rp[rp.length-1].x-130)<1),'A*: destino na parede vai para a célula livre mais próxima');
 const ee=mk();let chegou=0;ee.events.on('chegou',()=>chegou++);ee.passo();
 const n=ee.scene.create({nome:'npc',Transform:{x:30,y:30}});
 ok(C.Caminho.ir(ee.scene,n,170,30,200)===true,'ir: calcula a rota');
 for(let i=0;i<600&&n.Rota;i++)ee.passo();
 ok(!n.Rota&&Math.hypot(n.Transform.x-170,n.Transform.y-30)<6&&chegou===1,'ir: o seguidor chega ao destino e emite "chegou" (x '+n.Transform.x.toFixed(1)+', y '+n.Transform.y.toFixed(1)+')');
 const lg=mk();lg.passo();ok(C.Caminho.achar(lg.scene,{x:30,y:30},{x:30,y:120}).length===1,'A*: linha reta livre vira um único ponto');}
console.log(falhas?falhas+' falha(s)':'todos os testes passaram');process.exit(falhas?1:0);
