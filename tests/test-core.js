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
console.log(falhas?falhas+' falha(s)':'todos os testes passaram');process.exit(falhas?1:0);
