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
- **Painel "＋ Novo objeto"** (`editor/mais.js`): no painel Objetos, abre os tipos (círculo com física, retângulo sólido, sensor, texto, botão, mapa de tiles, imagem…). O "Criar" do topo saiu. Cuidado de CSS: a classe `.topo` é usada também pelas linhas dos blocos; as regras da barra do topo agora são `header.topo`.

## 32. Variáveis locais e botões com estados
- **Locais:** blocos "criar/definir/somar variável local" e o valor "variável local" geram `var _v_nome` dentro do evento/script (não entram em `estado.vars`, não aparecem no painel, somem ao fim do evento; ler uma local inexistente dá 0). Para valor que persiste entre quadros use **atributo do objeto** (`Attr`) ou variável global.
- **Botões:** `Botao.apertado` (segurando em cima) além de `sobre`. Estilo em `Sprite`: `cor`, `corSobre`, `corApertado`, `borda`, `larguraBorda`, `arredondar`, `sombra`. Painel "▭ Painel (interface)" no "＋ Novo objeto". Interface = `Sprite.fixo:true` (em coordenadas da janela, acima do mundo por `camada`, sem física).

## 33. Blocos: seletor com busca, cores por categoria, duplicar e recolher
- **Seletor de blocos** (`＋ bloco`/`＋ evento`): popover com busca (sem acento), chips de categoria e lista colorida; Enter insere o primeiro resultado, Esc fecha. O `<select class="add">` continua no DOM (acessível e usado pelos testes): o botão só dispara o mesmo `change`.
- **Visual:** cada categoria tem uma cor (`--cat`) usada na borda, no fundo suave, nos rótulos (ENTÃO/SENÃO/FAÇA) e no seletor. Cada bloco tem **duplicar** (⧉) e **recolher/expandir** (▾/▸; `recolhido` é guardado no bloco e ignorado pelo gerador).
- **Output** agrupa mensagens iguais seguidas (`texto ×N`), na lista e no overlay de tela cheia (8 linhas, somem em 15 s).

## 34. Salvar e carregar partida
- **`adapters/armazem.js`**: armazém com `get/set/remove/has`; `Armazem.memoria()` (padrão) e `Armazem.navegador(prefixo)` (localStorage com queda para memória). O editor usa `motor.partida.v1.`; os espaços são compartilhados entre projetos (mesmo nome = mesmo espaço).
- **Engine:** `salvarPartida(nome)`, `carregarPartida(nome)` (aplicada no fim do quadro; `false` se vazio/corrompido), `existePartida`, `apagarPartida`; também em `ctx`. Guarda a cena inteira (objetos, variáveis, listas) via `Serializer`. Nome: letras, números, `_`, `-` (até 30). Limite de 2 milhões de caracteres.
- **Blocos:** "salvar partida no espaço", "carregar partida do espaço (se existir)", condição "existe partida salva".

## 35. Animação por spritesheet
`Animacao {atual, animacoes:{nome:{linha,quadros,fps,repetir}}}` + `Sprite {imagem,quadroW,quadroH}` já recortam a folha (uma linha por animação). Novo: `scene.animar(e, nome, reiniciar?)` troca de animação (reinicia só se mudou) e o bloco "tocar animação". `Animacao.terminou` indica fim de animações sem repetição.

## 36. Som por arquivo
`estado.sons {nome: data URL de áudio}` (até 10, ~350 KB cada, validado no save). No Play, o editor chama `audio.carregar(estado.sons)`. `Audio.tocar(nome,{volume,repetir})`, `parar(nome)`, `pararTudo()`, `tem(nome)`. Blocos "tocar som importado" e "parar som"; painel Sons (importar, ouvir, remover).

## 37. Hitbox poligonal
`Body {forma:'poligono', pontos:[[x,y],...]}` (3 a 16 pontos, convexo, relativos ao Transform, sem rotação). Colisão por eixos separadores (SAT) contra círculo, retângulo e outro polígono; serve também para sensores. `Sprite {forma:'poligono', pontos}` desenha a forma. Retângulo já era suportado. Botão "△ Triângulo" no painel ＋. Côncavo: combine vários polígonos convexos.

## 38. Qualidade gráfica (Canvas 2D / WebGL)
Seletor no editor (também `?render=`): **Compatibilidade** (Canvas 2D, padrão), **Gráficos** (WebGL via PixiJS 8, `adapters/vendor/pixi.min.js`, carrega só quando escolhido) e **Simples** (Canvas 2D sem sombras e sem alta resolução, para aparelhos fracos). `Core.PixiRenderer.criar(canvas, opcoes)` herda de `CanvasRenderer` (câmera, entrada e HUD continuam na tela 2D) e desenha o mundo numa tela WebGL sobreposta; devolve `null` se WebGL falhar e o editor cai para Canvas 2D. Só vale no Play (o editor usa Canvas 2D por causa das guias). Limitações: sem sombra de botão e sem espelhar formas.

## 39. Projeto em pasta (formato 2)
`projeto.json` (`{formato:2, nome, cenaAtual, cenas:[{nome,arquivo}]}`) + `cenas/<nome>.json` + `assets/imagens/*` + `assets/sons/*`. As cenas guardam caminhos `assets/...` em `estado.imagens/sons`; ao abrir, os arquivos voltam a ser embutidos (modelo interno inalterado). `editor/pasta.js`: `PastaProjeto.empacotar/desempacotar` (puro), `zipar/deszipar` (ZIP próprio, sem biblioteca), `gravarPasta/lerPasta` (File System Access API). Botões na aba Projetos: Salvar na pasta / Abrir pasta (Chrome, Edge, Android) e Baixar ZIP / Abrir ZIP (qualquer navegador). Abrir valida os caminhos (só `assets/imagens|sons/nome.ext`). Próximo passo: o projeto aberto passa a ser a fonte única (salvar automático na pasta), em vez do localStorage.

## 40. Projeto como fonte editável (passo 2)
- **Salvamento automático:** com uma pasta aberta/escolhida (Chrome, Edge, Android), o editor regrava a pasta quando o projeto muda (a cada 1,5 s, nunca durante o Play).
- **`?projeto=<caminho>`:** abre um projeto publicado (`projeto.json` + `cenas/` + `assets/`) por URL, ex.: `editor/?projeto=../projetos/pega-moedas/`. Serve para versionar projetos no repositório, abrir no GitHub Pages e permitir que IAs/pessoas editem os arquivos direto.
- Exemplo no repositório: `projetos/pega-moedas/`.

## 41. Pathfinding (A*)
`core/systems/caminho.js` (opcional): `Core.Caminho.achar(scene, de, para, {mapa?, raio?})` → lista de pontos do mundo ou `null`. A* em 8 direções sobre o mapa `Tiles` (células com `solido` são parede; não corta quina), com alisamento por linha de visão (`raio` = folga do corpo) e limite de 20000 nós. Destino dentro de parede vai para a célula livre mais próxima (até 3 células). `Caminho.ir(scene, e, x, y, vel)` põe `Rota` na entidade e o sistema `caminho` a move até chegar, emitindo o evento `chegou` (`eventos.chegou` do script). Blocos "ir até um ponto" e "parar rota". `ctx.caminho` disponível nos scripts.

## 42. Rotação na hierarquia
`Pai {id, dx, dy, girar?, rot?}`: com `girar:true` o filho gira com o pai (deslocamento rotacionado por `Transform.rot` do pai; `Transform.rot` do filho = rot do pai + `Pai.rot`). Padrão continua só posição. Ordem de desenho já existia (`Sprite.camada`, `ordenarY`, `fixo` para interface). Escala herdada ainda não existe (não há escala de Transform).

## 43. Efeitos: tremor, fade e partículas
`core/systems/efeitos.js` (opcional). `ctx.efeitos.tremer(scene, forca, dur)` (a câmera balança e acalma), `fade(scene, cor, de, para, dur)` (cobre a tela com a cor; ao terminar em 1 fica escuro até outro fade para 0) e `particulas(scene, x, y, {n, cor, tamanho, vel, vida, gravidade, espalhar:'cima'|todos})` (entidades `_particula` com `Particula`, no máximo 400). Estado de execução em `scene.efeitos` (não é salvo; `clear` zera). Novo `Sprite.opacidade` (0–1) nos dois renderers. No modo WebGL a tela 2D fica por cima do WebGL (HUD e fade). Blocos: tremer a câmera, fade, soltar partículas.

## 44. Toque no celular
`Input` agora põe `touch-action:none` (e sem seleção/realce) na tela do jogo: sem isso o Chrome do celular assume o gesto como rolagem, cancela o ponteiro e o joystick virtual (arrastar em qualquer ponto) nunca anda. O fade de tela passa a ser desenhado **abaixo** da interface (`Sprite.fixo`), nos dois renderers, para o texto de vitória/derrota continuar legível. Mini-RPG: depois de perder/vencer, tocar na tela (ou Espaço/Enter) recomeça, pois no celular não existe F5.

## 45. Exportar jogo
Botão "Exportar jogo (.html)" (aba Projetos): `EditorExportar.gerar()` junta núcleo + adaptadores (sem PixiJS/depuração) + `adapters/player.js` + o projeto inteiro (todas as cenas, imagens e sons) num **único .html** (~110 KB mais os assets) que roda sozinho, sem editor e sem rede, em qualquer navegador (inclusive celular). `Core.Player.iniciar({nome, atual, cenas})` cria a tela cheia, entrada, áudio, dispositivo e armazenamento, e mostra o botão "Jogar" (necessário para liberar áudio e tela cheia). Só funciona com o editor aberto por http(s) (lê os próprios arquivos com fetch). Base do PWA/app. Testado, incluindo arrastar o dedo (toque simulado) movendo o jogador.

## 46. Motor num Web Worker (jogo exportado)
`adapters/worker-host.js` (`Core.WorkerHost`): o jogo exportado roda o **motor inteiro num Worker** (física, scripts); a página só desenha (CanvasRenderer), ouve entrada e toca som. A cada passo o worker manda um retrato da cena (entidades, câmera, efeitos, variáveis); entrada, áudio, armazém e dispositivo viram mensagens. O código do motor vai num bloco `<script type="text/plain" id="motor-codigo">` que a página e o worker executam.
- **Vigia:** sem quadros por 3 s o worker é encerrado e a página mostra "O jogo parou de responder" com o botão "Reiniciar o jogo" (laço infinito não trava mais a página).
- **Isolamento:** scripts não alcançam `document`, `localStorage` nem cookies (só o armazém de partidas, por mensagem).
- **Limites conhecidos:** sem interpolação entre passos (a página desenha o último retrato); a cena inteira é copiada a cada passo (custo proporcional ao número de objetos); o **editor ainda roda o Play na própria página** (laço infinito no Play do editor ainda trava a aba — próximo passo: mesmo host no Play); sem Worker disponível o Player cai para o modo direto (`Core.Player.modo`).

## 47. PWA do editor
`editor/manifest.webmanifest` + `editor/sw.js` + ícones (`editor/icones/`). O editor pode ser **instalado** (Chrome/Android: menu ⋮ → "Instalar app" / "Adicionar à tela inicial") e abre **offline** depois da primeira visita. Estratégia do service worker: **rede primeiro, cache como reserva** (online recebe sempre a versão nova, sem Ctrl+F5); só guarda GET do mesmo site; nova versão de cache = mudar `VERSAO` em `sw.js`. Só registra em http(s), não em `file://`. Próximo (v2.0): casca Flutter/WebView carregando o mesmo editor.

## 48. Joystick virtual configurável
`scene.estado.joystick = { modo:'flutuante'|'fixo'|'desligado', visivel, x, y (0–1, posição do fixo), raio, zonaMorta, zona:'tela'|'esquerda'|'direita' }` (ausente = flutuante, visível, como antes). `flutuante` nasce onde o dedo toca (opcionalmente só na metade esquerda/direita); `fixo` fica sempre na mesma posição e só ativa se o toque começa perto da base; `desligado` ignora o toque como direção (o ponteiro continua funcionando para botões). Dados para scripts em `ctx.input.joystick`: `{ativo, dx, dy, forca (0–1), angulo (graus, 0 = direita, 90 = baixo), modo}`; `ctx.input.axes` continua somando teclado + joystick. `Input.configurar(cfg)` é chamado pelo motor a cada passo (e pelo `WorkerHost` na página). Editor: controles "joystick" na barra da cena (`editor/entrada.js`). Validado em `serializer`.

## 49. Estilo de botões e inspetor completo
`Sprite`: `cor2` + `gradiente` ('vertical'|'horizontal'), `opacidade` (0–1), `sombra` com `sombraCor`/`sombraBlur`/`sombraY`, `negrito` (padrão sim), `italico`, `corTextoSobre`, além do que já havia (`arredondar`, `borda`, `larguraBorda`, `corSobre`, `corApertado`, `fonte`, `tamanhoTexto`, `alinhar`). `Botao.desativado`: sem hover nem clique e desenhado a 45% de opacidade. Canvas 2D e WebGL desenham tudo isso (no WebGL ainda sem sombra). **Inspetor:** agora mostra todas as propriedades dos componentes do objeto, inclusive as que ele ainda não tem (apagadas, "(padrão)"): preencher cria, esvaziar remove. `Transform.rot` (radianos) e `Body.forma = poligono` aparecem no inspetor.

## 50. Joystick como objeto de cena

O joystick virtual é o componente `Joystick` de uma entidade (botão **+ Joystick** do editor; um por cena): `modo` (flutuante/fixo/desligado), `zona` (`base` = padrão: só pega o toque dentro do raio do joystick, o resto é clique normal; `tela`/`esquerda`/`direita` = qualquer toque na área), `visivel`, `x`/`y` (posição do fixo, 0–1), `raio`, `zonaMorta`, `zona`. A posição é a do objeto na cena (arraste o marcador azul; vale para o modo fixo); o resto fica no inspetor. `Core.joystickDe(scene)` escolhe a configuração: o componente, ou o antigo `estado.joystick` (projetos antigos continuam funcionando). Os scripts leem `ctx.input.joystick` como antes. Durante o Play a caixa de seleção do editor não é desenhada.

## 51. Editor de código

`editor/codigo.js` melhora o `<textarea id="sc-fonte">` sem biblioteca: números de linha, cores (comentário, texto, número, palavra-chave, `ctx`/`e`/`dt`, chamadas), Tab/Shift+Tab, auto-indent entre `{ }`, fechamento de `( [ { " '`, Ctrl+/ comenta, autocompletar (`ctx.`, `ctx.vars.`, `e.Transform.`…) e marcação da linha do erro (vinda das mensagens "linha N"). O textarea segue sendo a fonte da verdade; a lista da API fica em `API` no arquivo (atualizar quando a API do `ctx` mudar). Um editor completo (CodeMirror/Monaco) pode vir no app, quando houver rede para empacotá-lo.

Sem objeto `Joystick` na cena (e sem `estado.joystick`), **não há joystick**: o toque/clique não vira direção. Com o objeto, o joystick funciona com dedo e mouse, aparece parado na posição do objeto (flutuante ou fixo, se `visivel`) e a bolinha nunca sai do anel (raio). Ao levantar o dedo o ponteiro deixa de "pairar", então botões não ficam no estado `sobre`.

## 52. Camadas nomeadas
`scene.estado.camadas = [{ id, nome, tipo:'mundo'|'interface', opacidade 0–1, paralaxe 0–3, visivel, bloqueada }]` (a primeira fica atrás) e `Sprite.grupo = id`. Camadas ordenam dentro do mundo e dentro da interface (a interface continua sendo `Sprite.fixo`: mover um objeto para uma camada de interface liga `fixo`). Opacidade multiplica a do objeto; `visivel:false` esconde também no jogo (scripts podem mudar `estado.camadas[i]`); paralaxe só vale no jogo (1 = normal, 0.5 = anda metade da câmera) para o editor mostrar os objetos onde estão. Sem `estado.camadas` nada muda. Código: `Core.Camadas` (scene.js), CanvasRenderer/PixiRenderer, `editor/camadas.js`.

## 53. Plugin Matter.js (física com rotação e juntas)
Opcional e por objeto: não substitui a física normal (`Body`). Componentes: `Corpo {tipo dinamico|estatico, forma, w, h, raio, densidade, atrito, elasticidade, amortecimento, rotacaoFixa}` e `Junta {com, tipo pino|mola, comprimento, rigidez, amortecimento, ax, ay, bx, by}` (precisa de `Corpo`). Cena: `estado.matter = {gravidadeX, gravidadeY}`. O sistema `core/systems/matter.js` só roda se `window.Matter` existir (`adapters/vendor/matter.min.js`, MIT, v0.20.0) e houver `Corpo` na cena; escreve `Transform.x/y/rot`; teletransporte por script é respeitado; emite `colisao {para, outro}`; `ctx.matter.forca/velocidade/ler`. Na exportação a biblioteca (~80 KB) só vai junto se algum objeto usar `Corpo`. No editor: menu ＋ Novo objeto > "Física Matter.js".

## 54. Componentes de UI: Barra, slider e Alternar
Objetos com `Sprite` (normalmente `fixo:true`) ligados a variáveis. `Barra {var, min=0, max (número ou nome de variável), cor, arrastavel}`: enche conforme a variável (vida, progresso); com `arrastavel:true` vira slider (arrasta e grava na variável; evento `barra-mudou`). `Alternar {var, textoLigado, textoDesligado, corLigado, corDesligado}`: clique liga/desliga a variável booleana, troca rótulo e cor (evento `alternou`). Sistema `ui` (core/systems/ui.js); o preenchimento da barra é desenhado pelo CanvasRenderer (`Barra._r` é calculado a cada passo). Editor: menu ＋ Novo objeto > "Componentes de interface". Ainda faltam: campo de texto digitável e lista com rolagem.
Modelos prontos (editor/modelos.js): o que é uma coisa só fica um objeto só (barra de vida = `Barra` + `Script` num objeto); o que tem partes fica como filhos da raiz via `Pai` (diálogo: caixa + nome + fala + 3 botões; inventário: painel + 6 slots), então mover o pai move o grupo. O pêndulo Matter fica com dois objetos soltos porque a hierarquia sobrescreve a posição de corpos dinâmicos.

## 55. Campo de texto e Lista rolável
- `Campo { var, dica, max, senha, desativado }` (+ Transform e Sprite): tocar abre o teclado; o texto digitado vai para a variável `var` (texto). Eventos: `campo-mudou`, `campo-enviado` (Enter). Mostra `dica` quando vazio e cursor piscando.
- Como funciona: o adaptador `Input` cria um `<input>` escondido e o foca no `pointerup` (necessário para abrir o teclado do celular). Ele acha o campo com `input.campoEm(p)` (`Core.campoEm(scene,p)`, na thread principal — no modo Worker usa a cena espelhada). O texto vai em `poll().texto = {foco,id,valor,envios}`.
- `Lista { lista, var, itemAltura, corSel, desativado }`: mostra os itens da lista do jogo `lista`; arrastar rola, tocar escolhe (grava o índice em `var`, evento `lista-escolheu {indice, valor}`). Só os itens visíveis (`_vis`) vão para o desenho.
- Menu "Componentes de interface" do editor: ⌨ Campo de texto e ☰ Lista (já criam a variável/lista necessária).

## 56. Catálogo de valores dos blocos (seletor inteligente)
- `EditorBlocos.CATALOGO`: cada tipo de valor (`num`, `x`, `op`, `item`…) tem **grupo** (Valores, Este objeto, Contas, Entrada, Listas, Cena, Relógio e data, Aparelho), **tipo** que produz (`num`/`txt`/`any`) e, às vezes, **onde** pode aparecer.
- `EditorBlocos.valoresPara(esperado, cx, atual)` devolve os grupos/itens do seletor: campo numérico esconde valores de texto; campo de texto esconde contas e números; `outro objeto` só em colisão/gatilho; `item atual` só dentro de "para cada". O valor já escolhido nunca some (projetos antigos continuam abrindo).
- Campo `esp` nos blocos (`'num'` por padrão, `'any'` quando aceita tudo, como "mudar o texto" e "definir variável"). Em `comparar`, o lado B segue o tipo do lado A.
- Visual: a pílula do valor usa a cor do grupo (`--vg`) e escurece conforme o aninhamento (`--esc`).
- Próximos passos (PLANO): B = layout horizontal sem quebra de linha; C = zoom/arrastar no editor de blocos e idiomas (pt-BR/en/es).

## 57. Blocos em linha única
- Os parâmetros não quebram mais de linha: `.topo` e `.val` são `nowrap`, o bloco cresce para a direita e a área `.blocos` rola na horizontal (dedo ou mouse). Os botões ↑ ↓ ⧉ ✕ ficam `sticky` na borda direita visível.
- Valores sem campo de digitar (x, variável, atributo, conta…) mostram o nome em vez de só a setinha (`.val.com-nome`).
- Os parênteses `( )` de contas aparecem em cada `conta` aninhada; o código gerado já agrupa cada operação, então a precedência é a que se vê.
