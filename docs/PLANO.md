# Plano do projeto (fonte única do que vem a seguir)

## Princípios de trabalho
1. **Uma tarefa por PR**, com testes e documentação junto. Merge só com a CI verde (núcleo e navegador).
2. **Núcleo (`core/`) não conhece navegador, aparelho nem arquivo.** Tudo que depende de plataforma entra como adaptador (`adapters/`).
3. **Formato de projeto versionado.** Mudou o formato → sobe `formato` e o serializer ganha uma migração.
4. **Ordem importa.** Pedido que ainda é cedo ou arriscado recebe um "não agora" com o motivo e vai para o marco certo, em vez de entrar fora de ordem.
5. **Sem limite artificial para o dev**, mas com guarda-corpo explícito: todo limite (tamanho, quantidade, tempo) é uma constante documentada, não um acaso.

## Marcos
**v1.0 — feito.** Núcleo 2D completo (física, tiles, A*, efeitos, hierarquia, cenas, variáveis/listas, partida salva), editor, projeto em pasta/ZIP, exportar jogo em .html, Canvas 2D e WebGL (Pixi), dispositivo/sistema, CI, mini-RPG de exemplo, motor em Worker no jogo exportado.

**v1.1 — Robustez do editor** *(próximo)*
- Play do editor no `WorkerHost` (hoje um laço infinito ainda trava a aba do editor). Exige levar variáveis observadas, Output e erros de script para mensagens.
- Erros de script com nome do script e linha.
- Teste real do Play no celular (a causa do "não anda" no editor ainda é desconhecida; o jogo exportado anda).
- Limpeza do repositório: arquivos legados na raiz (`artifact-*.html`, `TAREFAS*.md`, `games/`) vão para `legado/`.

**v1.2 — Distribuição sem limites**
- Exportar como **pasta/ZIP com assets em arquivos** ✅ **feito** (botão "Exportar jogo (pasta web .zip)": index.html + motor.js + projeto/cenas/assets + manifest + sw; carregamento sob demanda ainda não). O .html único continua para jogos pequenos.
- WebGL (Pixi) no jogo exportado ✅ (na pasta web, quando o seletor de render do editor está em "gráficos"; cai para Canvas 2D se falhar).
- ~~PWA do editor~~ **feito** (puxado para frente para chegar ao app mais cedo). PWA do jogo exportado ✅ (na pasta web).
- Exportar minificado (dificulta cópia do código; não impede — o código chega ao jogador de qualquer jeito).

**v1.3 — Conteúdo**
- Editor de animação ✅ (clipes por spritesheet, pré-visualização no inspetor), escala no Transform ✅ (visual; física não muda), camadas de tiles múltiplas ✅ (cada objeto Tiles é uma camada) e autotile ✅ (paleta com `auto`).
- Blocos/modelos prontos: diálogo, inventário, vida, menu.

**v1.4 — Aparência e primeiros passos do editor**
- Tema Scratch dos blocos ✅ em CSS (cor sólida, valores em pílula, "C" com corpo, encaixe; feito sem mexer na estrutura) (referência: cores sólidas, encaixe, valores em pílula, blocos em C para se/repetir). Exige mexer na estrutura dos blocos, não só no CSS.
- Temas do editor: seletor com temas prontos + arquivo JSON importável. Um tema só muda variáveis de CSS de uma lista permitida (cores, fontes), nunca CSS livre nem JavaScript. Loja de temas: só com contas e servidor, junto com a rede social do app (depois do v2.0).
- Camadas ✅: atalhos 👁/🔒 Mundo/Interface e painel ☰ Camadas (camadas nomeadas salvas no projeto: ordem, opacidade, paralaxe no jogo, ocultar, travar, mover o selecionado; `estado.camadas` + `Sprite.grupo`).
- Exportar: ajustes finos ✅ (⚙ Exportação: nome do app, orientação, encaixe inteiro, cor de fundo). Faltam: ícone próprio, minificação, assets sob demanda; FPS fica de fora (mudaria a física).
- Scripts de cena ✅: botão "Rodar na cena" na aba Scripts (roda sem objeto; `estado.scriptsCena`). Galeria: exemplos Pega-moedas e Mini-RPG ✅ (mais exemplos depois).
- Tutorial interativo de 5 minutos dentro do editor ✅ (botão Tutorial: 7 passos que avançam sozinhos); galeria de mini-jogos.
- Modelos prontos de RPG ✅ (menu ＋ Novo objeto): diálogo com escolhas, inventário com slots/quantidades/uso, vida com dano e invulnerabilidade; conversam por eventos (`dialogo-abrir`, `inv-adicionar`, `dano`, `curar`). Código editável na aba Scripts.
- Testar tudo no celular real.

**v2.0 — App e plugins**
- Casca Flutter (WebView) carregando o jogo exportado e o editor. **Repositório separado** (sugestão: `motor-app`, criado pelo dono; build do APK por GitHub Actions). O app baixa o pacote web de uma release do `motor`, então atualizar o motor não exige recompilar o app.
- Plugin de física Matter.js (corpos rotativos, juntas), carregado por projeto.
- Rede/multiplayer só depois, e só se houver um jogo que precise.

## Linguagens de script (decisão)
Blocos + JavaScript continuam sendo a única opção até a v2.0. **Linguagem própria: não** (custo enorme, sem ganho sobre JS). **Lua** pode entrar depois, como linguagem opcional de script via **Fengari** (VM Lua em JS, ~200 KB), rodando no mesmo Worker; **pré-requisitos:** API de scripts (`ctx`) congelada e documentada, Play do editor no Worker (v1.1) e mapeamento de erros com linha. **Luau** (Roblox) não tem porta madura para JS (só WASM pesado): fora.

## Fora do escopo (decisão)
3D / Babylon.js; reescrever o núcleo em C++ (o gargalo é o desenho, não a lógica); IA dentro do jogo.

## Estado dos limites atuais (guarda-corpos conhecidos)
Imagens e sons ficam embutidos no JSON da cena: sons até 10 por cena e ~350 KB cada; imagens reduzidas na importação. O formato em pasta (v1.2) remove esses tetos.
