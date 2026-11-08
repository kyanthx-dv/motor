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
