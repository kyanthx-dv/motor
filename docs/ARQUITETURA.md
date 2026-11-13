# ARQUITETURA — Núcleo da Engine

Versão 0.1 · rascunho para revisão. Nome provisório do núcleo: **Core**.

## 1. Objetivo

Ter um núcleo de engine pequeno, entendível e portável. O núcleo roda um jogo: atualiza o mundo em passo fixo, lê a entrada, move e colide objetos, desenha e salva/carrega cenas. A linguagem (JavaScript agora; C# ou C++ depois) é uma decisão separada da arquitetura.

## 2. Princípios

1. **O núcleo não conhece o navegador nem o Phaser.** Ele só fala com interfaces (Renderer, Input, Assets). Quem pluga nelas pode ser Canvas 2D, Phaser, ou no futuro SDL/MonoGame.
2. **Dados separados de lógica.** Uma entidade é um id com componentes de dados puros. A lógica fica em sistemas.
3. **Tudo que é estado do jogo cabe em JSON.** Se não dá para salvar, não é estado do núcleo.
4. **Passo fixo.** A lógica roda a 60 Hz sempre, independente do desenho. Isso torna física e replay previsíveis.
5. **Zero dependências no núcleo.** Dependências só nos adaptadores.
6. **Pequeno primeiro.** Cada módulo faz uma coisa. Se um arquivo passa de ~300 linhas, divide.

## 3. Módulos

| Módulo | Responsabilidade |
|---|---|
| `Engine` | Loop de passo fixo, pausa, tempo, ordem dos sistemas |
| `Scene` | Guarda entidades, cria/remove, consulta por componente |
| `Entity` | Um id numérico. Sem métodos de jogo |
| `Component` | Dados puros: `Transform`, `Velocity`, `Sprite`, `Body`, `Script`… |
| `System` | Função `update(scene, dt, ctx)` que age sobre entidades com certos componentes |
| `Input` | Estado normalizado: botões, eixos, ponteiro. Teclado, mouse e toque viram o mesmo formato |
| `Physics` | Sistema: movimento, colisão círculo/retângulo, resposta elástica. Pode ser trocado |
| `Renderer` | Interface de desenho. Lê a cena, não altera |
| `Assets` | Carrega imagens/sons por nome. Interface com adaptador |
| `Events` | Mensagens entre sistemas (`colisão`, `entrou-na-cena`) sem acoplamento direto |
| `Serializer` | Cena ⇄ JSON, com versão do formato |

## 4. Modelo de dados (ECS simples)

- **Entidade:** `id`.
- **Componente:** objeto simples, por nome. Ex.: `Transform {x, y, rot}`, `Velocity {vx, vy}`, `Body {forma, raio|w|h, massa, elasticidade}`.
- **Sistema:** roda em ordem fixa a cada passo: `controles → ui → scripts → fisica → animacao → camera`, depois entrega os eventos e remove entidades marcadas. Entrada, UI e scripts vêm antes da física; animação e câmera depois, para usar as posições já atualizadas. Sistemas próprios entram com `engine.usar(nome, fn)` e rodam depois dos padrões.
- **Consulta:** `scene.query('Transform', 'Velocity')` devolve as entidades que têm todos esses componentes.

Entidades nunca chamam outras entidades. Elas se influenciam por componentes e eventos.

## 5. Loop

```
acumulador += tempoReal
enquanto acumulador >= 1/60:
    atualizar(1/60)
    acumulador -= 1/60
desenhar(alpha = acumulador / (1/60))   // interpolação opcional
```

**Política de tempo perdido (decisão do motor):** o jogo não tenta recuperar tempo que o aparelho perdeu. Cada quadro simula no máximo `maxPassos` (5) passos e ignora atrasos acima de `maxDelta` (0,25 s); o excedente fica somado em `engine.tempoPerdido`. Para replays e testes exatos, chame `engine.passo()` direto.

**Quem bate o relógio:** `Engine.iniciar()` usa o `agendador` do host (`agora/pedir/cancelar`). O padrão usa `requestAnimationFrame` quando existe e um temporizador em Node; outro host passa o seu em `new Engine({ agendador })`.

**Depuração:** `adapters/debug.js` (`new Core.Depurador(engine, renderer, canvas)`) abre com o botão Depurar ou F2. Lista entidades, seleciona por clique, edita componentes em JSON (validado antes de aplicar), pausa, avança um passo e mostra o tempo médio de cada sistema (`engine.perfil = true` liga a medição; `engine.tempos` guarda os valores).

**Física:** passos com algo rápido são divididos em até 8 subpassos para não atravessar paredes finas; eventos saem uma vez por par a cada passo.

## 6. Contratos dos adaptadores

**Renderer:** `redimensionar()`, `desenhar(scene, alpha, engine)`, `destruir()`. O `CanvasRenderer` também expõe `telaParaMundo` e `telaParaJanela`.
Padrão do projeto: Canvas 2D. Adaptador Phaser vem depois, sem mudar o núcleo.

**Input:** `poll()` devolve `{ down, pressed, released, axes: {x,y}, pointer: {x,y,tx,ty,down,pressed} }`. O canvas aceita **um ponteiro principal** por vez (um segundo dedo é ignorado); botões HTML funcionam em paralelo. O mapeamento tecla→ação fica em configuração, não no código dos sistemas.

**Assets:** `carregar(manifesto)` devolve uma promessa; `registrar(nome, recurso)` e `get(nome)`. Hoje só imagens e só no navegador (usa `Image`); som e hosts sem `Image` ficam para depois.

## 7. Formato de cena (JSON)

```json
{
  "formato": 1,
  "entidades": [
    { "id": 1, "nome": "bola",
      "Transform": { "x": 100, "y": 80, "rot": 0 },
      "Velocity": { "vx": 120, "vy": 0 },
      "Body": { "forma": "circulo", "raio": 12, "massa": 1, "elasticidade": 0.9 },
      "Sprite": { "cor": "#e05a47" } }
  ]
}
```

O campo `formato` permite migrar cenas antigas quando a estrutura mudar.

## 8. Pastas

```
core/        núcleo puro (sem navegador)
  engine.js  scene.js  events.js  serializer.js
  systems/   physics.js  scripts.js
adapters/    canvas-renderer.js  input.js  assets.js  (depois: phaser-renderer.js)
games/       exemplos (bolinha, etc.)
editor/      Flux Engine como editor de cenas (depois)
docs/        ARQUITETURA.md
```

## 9. Fora do escopo agora

Rede/multiplayer, 3D, partículas, animação por esqueleto, editor de mapas, áudio avançado. Entram depois, como sistemas ou adaptadores novos.

## 10. Marcos

1. **M1:** loop + cena + entidade + renderer Canvas + uma bolinha se movendo.
2. **M2:** input (teclado e toque) + física com colisão e rebote.
3. **M3:** salvar/carregar cena em JSON.
4. **M4:** scripts por entidade (lógica do jogo) e eventos.
5. **M5:** adaptador Phaser.
6. **M6:** Flux Engine como editor que gera cenas e scripts.

## 11. Portabilidade

Cada conceito tem equivalente direto em C# e C++: entidade = struct/id, componente = struct de dados, sistema = função, cena = contêiner (dicionário ou arrays por tipo), adaptador = interface (`interface` em C#, classe abstrata em C++). Por isso o núcleo em JS serve como protótipo do desenho final.

## 12. Regras para quem mexer no código (pessoa ou IA)

- Não adicionar dependência ao `core/`.
- Não guardar estado do jogo fora da cena.
- Sistema novo = arquivo novo em `core/systems/`, registrado em ordem.
- Mudou o formato da cena? Subir o número de `formato` e escrever a migração.
- Comentar o *porquê*, não o *quê*. O projeto também serve para aprender.

## 13. Variáveis (desde o E1)

`engine.vars` (e `ctx.vars` nos scripts): `declarar(nome, inicial)`, `ler`, `definir`, `somar`, `remover`, `existe`, `tipo`, `todas`. Ficam em `scene.estado.vars`, entram no save/load e **atravessam a troca de cena**. Três tipos: `numero`, `texto`, `booleano` (o tipo é o do valor declarado e não muda). Estrito de propósito: ler/definir uma variável não declarada, trocar o tipo ou usar nome inválido dá erro claro. Evento `variavel-mudou { nome, valor, antes }` a cada mudança real.

## 14. Editor (pasta `editor/`)

O editor só edita o **JSON da cena** e usa o próprio motor para validar (cria uma cópia da entidade numa `Scene` temporária; se o motor recusar, nada muda). Assim o editor de celular (Flutter/WebView) edita o mesmo formato. E1: lista de objetos, seleção por clique, propriedades, variáveis e JSON da cena (carga transacional).

## 15. Scripts com fonte na cena (E3a)

`scene.estado.scripts = { nome: { fonte } }` guarda código JavaScript dentro do projeto. `engine.compilarScripts()` (chamado por `iniciar()`) transforma cada fonte em script do motor. A fonte declara `function iniciar(e, ctx)`, `function atualizar(e, dt, ctx)` e/ou `const eventos = { colisao(e, d, ctx) {} }`. Erro de sintaxe não derruba nada: o script não é registrado e o erro fica em `engine.errosScripts`. Nome igual ao de um script registrado no código do jogo é recusado. Blocos visuais (E3b) vão gerar esse mesmo texto. **Segurança:** o código roda com os poderes da página; para projetos de terceiros será preciso isolar (Worker/iframe).

## 16. Blocos (E3b)

`editor/gerador.js` (sem DOM) transforma blocos em código: um script de blocos é `{ blocos: [...], fonte }` em `estado.scripts`; `fonte` é sempre refeita a partir dos blocos e é o que o motor compila (o motor não conhece blocos). Blocos são dados: `{ t: 'tipo', ...campos }`; eventos (`evento_inicio`, `evento_quadro`, `evento_colisao`, `evento_gatilho`) contêm listas de blocos (`f`), e `se` tem `f` (então) e `s` (senão). Valores: número, texto, variável, x/y, velocidade, setas, tempo, nome do outro objeto. O gerador recusa bloco ou valor inválido (nome de variável, número, tecla) e escapa textos. A interface (`editor/blocos-ui.js`) é uma lista indentada com ↑ ↓ ✕ e menus "+ bloco" (sem arrastar, funciona igual no celular); "Converter em código" solta o texto para edição manual (sem volta).

## 17. Mais blocos (E3c)

Novos blocos: **criar objeto** (círculo ou quadrado; com física, parado ou sem colisão), **a cada N segundos** (temporizador: o tempo acumulado fica em `Script.estado`, chave `t0`, `t1`...), **tocar bipe** e o valor **aleatório entre…**. `engine.aleatorio(min, max)` é determinístico (mulberry32; semente em `estado.semente`, estado em `estado.rng`, vai e volta no save), então replays e testes são previsíveis. `ctx.audio` existe só quando o host fornece (`engine.audio`); o editor liga `Core.Audio` durante o Play. `Audio.bipe(freq, dur, vol)` limita os valores e é seguro sem `AudioContext`. Ainda não há troca de cena no editor (projeto = uma cena).

## 18. Blocos de tempo, som pronto e reiniciar

**depois de N segundos (uma vez)**; **tocar som pronto** (`ctx.audio.efeito`: bip, moeda, pulo, acerto, explosao, sintetizados, sem arquivos); **reiniciar o jogo** (`engine.reiniciar()` volta objetos e variáveis ao estado de quando `iniciar()` foi chamado; dentro de um passo vale no fim dele). Início e eventos dos scripts gerados também têm `dt` (para os blocos de movimento).

## 19. Exemplo Pega-moedas (o que o jogo de teste revelou)

`editor/exemplos.js` monta um jogo inteiro só com blocos: o jogador anda (Controller), moedas e bombas nascem a cada 1 s e 3 s (`a cada N segundos` + `criar objeto` com posição aleatória), a moeda soma ponto, toca som e some, a bomba reinicia o jogo, o placar é um sprite fixo de tela cujo texto vem do bloco `mudar o texto`. O teste automático roda o jogo ponta a ponta (nascer, coletar, explodir/reiniciar). **Lacunas encontradas e corrigidas:** `criar objeto` ganhou **nome**, **sensor (atravessável)** e **script do objeto criado** (sem isso a moeda não conseguia reagir); `mudar o texto` (usa `Sprite.rotulo`) e os campos de texto do Sprite no painel de propriedades. **Ainda faltam:** criar objeto de texto/placar pela interface, tela de fim de jogo, vidas/tempo como exemplos, imagens e sons de arquivo, várias cenas.

## 20. Blocos genéricos de atributo
Em vez de um bloco por ação, há blocos com menus: **mudar / somar [objeto ▾] [atributo ▾]**, valor **atributo de um objeto**, **conta** (`+ − × ÷ resto menor maior`) e lógica **e / ou / não** nas condições (aninháveis). Objeto = este, o outro (colisão/gatilho) ou um objeto pelo nome (`n:nome`); objeto ausente é ignorado sem erro. Atributos: `x y vx vy cor texto corTexto raio` (tabela `EditorBlocos.ATTRS`; para ganhar um atributo novo basta uma linha). `vx/vy` criam `Velocity` se faltar. Tudo continua gerando JavaScript comum; o motor não conhece blocos.

## 21. Fase A: atributos próprios, etiquetas, modelos e controle
- **Componentes novos (core/scene.js, validados):** `Attr` (atributos próprios `{vida: 3}`: número, texto ≤200 ou booleano, até 50), `Etiquetas` (lista de até 20 textos) e `Modelo` (marca um objeto como molde).
- **Modelo:** durante o jogo (`scene.jogando`, ligado por `engine.passo`, desligado em `parar`/`clear`) `scene.query` ignora objetos com `Modelo`; no editor eles aparecem normalmente. `scene.clonar(origem, {x, y})` copia sem id e sem a marca.
- **Objetos nos blocos:** este, o outro, `cada` (dentro de "para cada"), o mais próximo com etiqueta, ou pelo nome. Atributos: os fixos + os próprios (`a:nome`, criados com "+ novo atributo…").
- **Blocos:** dar etiqueta, criar cópia (modelo), para cada objeto com etiqueta, repetir N (máx. 1000), repetir enquanto (máx. 10000 voltas), % de chance, sair do script, observar valor (`engine.observar`, aparece no editor durante o Play) e comentário. Valor "quantos com etiqueta" e condição "tem etiqueta".
- **Editor:** grupo "Marcas" no painel de propriedades (etiquetas, atributos `nome=valor`, caixa "modelo").

## 22. Fase C1: clique, mouse, cenas por JSON e câmera
- **Clique:** o sistema `ui` emite `clique {para: id}` ao objeto com `Script` que estiver sob o ponteiro quando ele é apertado (`C.sobre(e, ponteiro)`, em core/scene.js: usa o `Body` ou, sem ele, o `Sprite`; `Sprite.fixo` usa a posição na janela). O clique vai só para o objeto do topo (maior `Sprite.camada`; empate: o criado por último). O ponteiro só conta depois do primeiro movimento (`pointer.ativo`). Scripts recebem em `eventos.clique(e, d, ctx)`. `ctx.sobre(e)` é o mesmo teste, para qualquer objeto.
- **Blocos:** evento "quando clicarem neste objeto", condições "mouse (clicou agora / está apertado)" e "mouse sobre objeto", valores "mouse x/y (mundo)", atributos de texto (`tamanhoTexto`, `alinhar`, `fonte`), "ir para a cena", câmera (seguir objeto, zoom, ir para x/y).
- **Cenas por JSON:** `engine.registrarCenaJSON(nome, json)` registra uma cena salva pelo editor. Ao entrar, as variáveis existentes são mantidas (as da cena nova só acrescentam as que faltam) e os scripts da cena são religados. O editor deve registrar todas as cenas do projeto ao dar Play.

## 23. Várias cenas por projeto (editor)
A cena aberta no editor continua sendo a "viva" do projeto. As outras ficam em `localStorage` (`motor.editor.cenas.v1`: `{ projeto: { atual, cenas: { nome: json } } }`), trocadas por `EditorCenas.irPara`. No Play, `EditorCenas.registrar(engine)` registra todas com `engine.registrarCenaJSON`, e o bloco "ir para a cena" troca entre elas; "reiniciar o jogo" volta ao começo da cena atual. Renomear uma cena atualiza os blocos "ir para a cena" de todas. Ao baixar/abrir arquivo de projeto use `EditorCenas.exportar()`.

## 24. Hierarquia (pai e filhos)
- **Componente `Pai: { id, dx, dy }`** (validado em `core/scene.js`): o filho segue o pai, com `Transform = Transform do pai + (dx, dy)`. Só posição (não herda rotação). O sistema `hierarquia` (`core/systems/hierarquia.js`, opcional) roda antes e depois da física, então o filho nunca fica um quadro atrasado; ciclos são ignorados.
- **Uso típico:** sensores, armas, efeitos e textos presos a um objeto. Filhos com `Body` dinâmico são sobrescritos pelo pai; use sensores ou objetos sem física.
- **Cena:** `scene.adotar(filho, pai)` (mantém a posição atual; recusa ciclo e auto-adoção), `scene.soltar(filho)`, `scene.filhos(id)`, `scene.descendeDe(e, ancestral)`. `scene.destroy(pai)` remove todos os descendentes.
- **Save:** `Serializer.deJSON` recusa pai inexistente e ciclo de pais.
- **Blocos:** "tornar [objeto] filho de [objeto]", "soltar [objeto] do pai" e o objeto "o pai deste objeto".
- **Editor:** campo "pai" no painel Marcas; a lista de objetos mostra os filhos recuados sob o pai; mover o pai leva os filhos e mover um filho muda só o deslocamento dele.

## 25. Vista do editor, grade e tamanho da cena
- **`scene.estado.tamanho = {largura, altura}`** (100–10000, validado no `deJSON`). O renderer adota esse tamanho (`ctx.tela` também) e o Play usa a mesma janela lógica.
- **Vista do editor** (`renderer.vista = {cx, cy, z}`, só com o motor parado): a cena é um retângulo azul num espaço escuro, com pan (arrastar o fundo, botão do meio ou Espaço) e zoom (roda). `ajustarVista()` enquadra a cena. No Play a vista é desligada e vale o enquadramento do jogo.
- **Guias** (`_guias`, só na vista): grade com números nas bordas (passo adaptado ao zoom), moldura da cena e o retângulo tracejado da câmera do jogo (`estado.camera`). Nada disso aparece no Play nem na tela cheia.
- **Editor:** `editor/vista.js` (grade liga/desliga salva no navegador, campos largura × altura). Abas do dock esquerdo e inferior são reais; `?abas=todas` mostra tudo (usado nos testes). Scripts têm "Janela grande" (botão ou "Scripts ⤢"; Esc fecha). Tela cheia esconde todos os docks.

## 26. Imagens (sprites) e Play em tela cheia
- **`scene.estado.imagens = {nome: dataURL}`** (até 30 por cena, PNG/JPG/WEBP/GIF, ≤600 mil caracteres cada; validado no `deJSON`). O editor encolhe para no máximo 1024 px ao importar. `editor/imagens.js` registra cada uma em `renderer.assets`, então `Sprite.imagem` (com `quadroW`, `quadroH`, `escala`, `espelhar`) já desenha. Limitação: as imagens pertencem à cena onde foram importadas.
- **Importar:** aba "Imagens" (botão) ou arrastar o arquivo para o canvas (vira objeto na posição do mouse). "Usar" aplica ao objeto selecionado.
- **Play** agora entra direto em tela cheia (evita estados inconsistentes do editor); sair com Esc ou "Sair do jogo". A vista do editor é guardada e restaurada sem reenquadrar enquanto o layout ainda está em tela cheia (era o bug da grade depois do Play).

## 27. Inspetor de script e árvore por arrastar
- **Inspetor** (`editor/inspetor-script.js`): grupo "Script" no objeto selecionado: escolher, "+ Novo (blocos)" (cria `<objeto>_script` e abre a janela grande), "✎ Editar", "⧉ Copiar" (`_copia`, `_copia2`…) e "⬇ Baixar .js". Os scripts continuam em `estado.scripts`; o objeto guarda só `Script {nome}`.
- **Árvore:** na lista de Objetos, arrastar um item sobre outro o torna filho (`scene.adotar`); largar no fundo da lista o solta do pai. Recusa ciclos.

## 28. Tempo: esperar e tween
- **`core/systems/tempo.js`** (opcional, como a hierarquia): `ctx.depois(segundos, fn)` e `ctx.tween(alvo, campo, valor, duracao, curva, fim)`; curvas `linear`, `suave`, `entrada`, `saida`. Rodam no relógio do jogo (dt fixo): pausa pausa; `iniciar`, `reiniciar` e troca de cena cancelam tudo. Argumentos inválidos lançam erro claro; erro dentro do callback vira evento `erro-script`. Um tween novo no mesmo campo substitui o anterior. Limite de 5000 ativos.
- **Blocos:** "aguardar N segundos" (o que vem depois dele na mesma lista vira o callback; dentro de um laço, só o resto daquela volta espera) e "alterar [atributo] de [objeto] para V em N s, curva C" (só atributos numéricos).
- **Teste de núcleo:** o final de `tests/test-core.js` agora fica depois dos testes novos (antes alguns blocos finais nunca rodavam por causa do `process.exit`).

## 29. Listas
- **`core/listas.js`** (`engine.listas`, `ctx.listas`): listas em `scene.estado.listas = {nome: [itens]}`; até 50 listas × 1000 itens; item = número finito, texto (≤200) ou verdadeiro/falso. API: `adicionar, definir, remover, limpar, item, tamanho, contem, aleatorio, todos, nomes, garantir`. Leitura tolerante (inexistente → vazio/undefined); escrita inválida lança erro claro. Índices do núcleo começam em 0.
- Salvam/carregam (validadas no `deJSON`), voltam ao reiniciar e **atravessam a troca de cena** (inventário).
- **Blocos** (categoria Listas, índices começam em 1): adicionar, trocar item, remover item, esvaziar, para cada item (valor "item atual"); valores: item N, tamanho, item aleatório; condição "lista contém".

## 30. Mapa de tiles
- **Componente `Tiles`** `{tamanho, colunas, linhas, paleta:[{cor, solido?, imagem?}], dados:[0|k], acima?}` com `Transform` no canto superior esquerdo (validado em `scene.js`: tamanho 4–256, até 300×300 e 20000 células). `dados[i]=0` é vazio e `k` usa `paleta[k-1]`; `imagem` é o nome de uma imagem importada.
- **`core/systems/tiles.js`** (opcional): na primeira vez cria colisores estáticos (entidades `_tile` com etiqueta `solido`, um retângulo por sequência horizontal de células sólidas) e marca `Tiles.gerado`. `C.Tiles.em(e,x,y)` lê e `C.Tiles.definir(scene,e,x,y,k)` pinta (refazendo os colisores).
- **Renderer:** desenha só as células visíveis, abaixo dos sprites (ou acima com `acima:true`).
- **Editor** (`editor/tiles.js`): botão "Novo mapa de tiles", inspetor (colunas, linhas, tamanho, paleta com cor, sólido e imagem, borracha) e pintar arrastando no canvas.

## 31. Output e abas do centro
- **Centro:** abas **Cena | Scripts** (`EditorCentro.abrir`); o editor de scripts ocupa a área grande (o botão "Janela grande" ainda abre em tela inteira). **Embaixo:** **Output | Variáveis | JSON**.
- **Output** (`editor/output.js`): mostra `ctx.escrever(valor)` (evento `saida` da engine; bloco "escrever no output"), erros de script (`erro-script`) e marcas de Play/Parado; filtro "só erros" e Limpar. Em tela cheia as últimas mensagens aparecem num overlay no canto.
- Backlog: Matter.js como sistema de física opcional (`fisica-matter`, mesmo componente `Body`); 3D (Babylon) fora do escopo.
