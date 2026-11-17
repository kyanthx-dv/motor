# Cola do `ctx` (scripts em código)

Um script é JavaScript com estas funções opcionais. `e` é o objeto dono do script, `ctx` é a "caixa de ferramentas" da engine.

```js
function iniciar(e, ctx) { }                 // uma vez, quando a cena começa
function atualizar(e, dt, ctx) { }           // 60x por segundo; dt = segundos do quadro
var eventos = {                              // opcional
  colisao(e, d, ctx) { /* d.outro = id do outro objeto */ },
  clique(e, d, ctx) { },                     // tocaram/clicaram neste objeto
  gatilho(e, d, ctx) { }                     // entrou/ficou numa zona
};
```

## O objeto `e`
`e.Transform.x / y / rot / escala` · `e.Sprite.cor / w / h / raio / rotulo / opacidade / invisivel` · `e.Body.vx / vy` (velocidade) · `e.Animacao.atual` · `e.Attr.minhaCoisa` (atributos próprios) · `e.Etiquetas` (lista de textos).

## Os 15 mais úteis

| Quero... | Código |
|---|---|
| mover com as setas | `e.Transform.x += ctx.input.axes.x * 120 * dt;` |
| tecla apertada agora | `ctx.input.keys.has("z")` (segurando) · `ctx.input.keysPressed.has(" ")` (acabou de apertar) |
| toque/mouse | `ctx.input.pointer` → `{ x, y, down }` |
| joystick virtual | `ctx.input.joystick` → `{ dx, dy, forca, angulo }` |
| variável do jogo | `ctx.vars.definir("pontos", 0)` · `ctx.vars.ler("pontos")` · `ctx.vars.somar("pontos", 1)` |
| lista | `ctx.listas.adicionar("itens", "espada")` · `.item("itens", 0)` · `.tamanho("itens")` · `.remover("itens", 0)` |
| achar objeto | `ctx.scene.find("jogador")` · `ctx.scene.get(id)` · `ctx.scene.query("Etiquetas")` |
| criar / apagar | `ctx.scene.create({ nome: "bala", Transform: { x: 0, y: 0 }, Sprite: { w: 6, h: 6, cor: "#fff" } })` · `ctx.scene.destroy(e.id)` |
| clonar modelo | `ctx.scene.clonar(modelo, { x: 100, y: 50 })` |
| tocar animação | `ctx.scene.animar(e, "andar")` |
| esperar | `ctx.depois(2, () => { ... })` (segundos; respeita pausa) |
| mudar aos poucos | `ctx.tween(e.Sprite, "opacidade", 0, 1)` (alvo, campo, valor final, segundos) |
| som | `ctx.audio.tocar("musica")` · `ctx.audio.efeito("pulo")` |
| efeitos | `ctx.efeitos.tremer(ctx.scene, 8, 0.3)` · `ctx.efeitos.fade(ctx.scene, "#000", 0, 1, 1)` (cor, de, para, segundos) |
| andar até um ponto (A*) | `ctx.caminho.ir(ctx.scene, e, 400, 225, 90)` |
| trocar de cena / reiniciar | `ctx.engine.irPara("fase2")` · `ctx.engine.reiniciar()` |
| salvar / carregar | `ctx.salvarPartida("slot1")` · `ctx.carregarPartida("slot1")` |
| aparelho | `ctx.dispositivo.vibrar(80)` · `ctx.dispositivo.telaCheia(true)` |
| escrever no Output | `ctx.escrever("olá")` |

| Matter.js (objetos com `Corpo`) | `ctx.matter.forca(e, fx, fy)` · `ctx.matter.velocidade(e, vx, vy)` · `ctx.matter.ler(e)` → `{vx, vy, giro}` |
| eventos | `ctx.events.on("dano", d => ...)` · `ctx.events.emit("dano", { qtd: 1 })` |
| camadas | `ctx.scene.estado.camadas[i].visivel = false` (ou `.opacidade`, `.paralaxe`) |
| script de cena | na aba Scripts, **Rodar na cena** (sem objeto; `e.id` é -1) |

Modelos prontos (menu ＋ Novo objeto): diálogo (`dialogo-abrir {id}`), inventário (`inv-adicionar {item,qtd}`, `inv-usar`), vida (`dano {qtd}`, `curar {qtd}`, evento `morreu`).

Outros: `ctx.engine.aleatorio(1, 6)` (inteiro), `ctx.engine.tempo` (segundos desde o início), `ctx.tela.largura / altura`, `ctx.sobre(objeto)` (ponteiro está em cima?).

> Os nomes são os mesmos dos blocos: se não lembrar um comando, monte o bloco e use **ver código gerado** para ver como ele fica em código. No editor de código, digite `ctx.` para o autocompletar (ou Ctrl+Espaço; dentro de aspas ele sugere variáveis, objetos e sons da cena).
