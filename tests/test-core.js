// Rode com: node tests/test-core.js
const fs=require('fs'),vm=require('vm');
for(const f of ['events','scene','variaveis','serializer','systems/controles','systems/ui','systems/scripts','systems/fisica','systems/animacao','systems/camera','engine'])vm.runInThisContext(fs.readFileSync(__dirname+'/../core/'+f+'.js','utf8'));
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
// 10) perfil por sistema
{const e=nova();e.perfil=true;e.scene.create({Transform:{x:0,y:0},Velocity:{vx:1,vy:0}});for(let i=0;i<5;i++)e.passo();
 ok(['controles','ui','scripts','fisica','animacao','camera'].every(n=>typeof e.tempos[n]==='number'&&e.tempos[n]>=0),'perfil mede o tempo de cada sistema');
 const f=nova();f.passo();ok(Object.keys(f.tempos).length===0,'sem perfil não mede nada');}
console.log(falhas?falhas+' falha(s)':'todos os testes passaram');process.exit(falhas?1:0);
