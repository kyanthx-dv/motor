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
- Exportar como **pasta/ZIP com assets em arquivos** (sem limite de tamanho de data URL; carregamento sob demanda). O .html único continua para jogos pequenos.
- WebGL (Pixi) no jogo exportado, opcional (arquivo ao lado).
- PWA: manifest + service worker (instalar e jogar offline).

**v1.3 — Conteúdo**
- Editor de animação (clipes por spritesheet), escala no Transform, camadas de tiles múltiplas e autotile.
- Blocos/modelos prontos: diálogo, inventário, vida, menu.

**v2.0 — App e plugins**
- Casca Flutter (WebView) carregando o jogo exportado e o editor.
- Plugin de física Matter.js (corpos rotativos, juntas), carregado por projeto.
- Rede/multiplayer só depois, e só se houver um jogo que precise.

## Fora do escopo (decisão)
3D / Babylon.js; reescrever o núcleo em C++ (o gargalo é o desenho, não a lógica); IA dentro do jogo.

## Estado dos limites atuais (guarda-corpos conhecidos)
Imagens e sons ficam embutidos no JSON da cena: sons até 10 por cena e ~350 KB cada; imagens reduzidas na importação. O formato em pasta (v1.2) remove esses tetos.
