// Rode com: node tests/test-core.js
const fs=require('fs'),vm=require('vm');
for(const f of ['events','scene','serializer','systems/controles','systems/ui','systems/scripts','systems/fisica','systems/animacao','systems/camera','engine'])vm.runInThisContext(fs.readFileSync(__dirname+'/../core/'+f+'.js','utf8'));
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
console.log(falhas?falhas+' falha(s)':'todos os testes passaram');process.exit(falhas?1:0);
