# Versão 1.0.0 — primeira versão pública

**Para quê:** jogos 2D simples (RPG top-down, plataforma, arcade) feitos com blocos + JavaScript, dentro do navegador (PC e celular).

## O que tem
- **Núcleo (`core/`, sem navegador):** entidades/componentes, física própria (círculo, retângulo, polígono convexo, sensores), tiles com colisão, hierarquia (com rotação), câmera, animação por spritesheet, cenas, variáveis e listas, tempo (esperar/tween), pathfinding A*, efeitos (tremor, fade, partículas), salvar/carregar partida.
- **Adaptadores (`adapters/`):** Canvas 2D (padrão), WebGL via PixiJS (opcional), teclado/mouse/toque, áudio (efeitos sintetizados e arquivos), dispositivo e sistema (hora, tipo de aparelho, tela, idioma, vibrar, tela cheia), armazenamento.
- **Editor (`editor/`):** cena com grade, inspetor, árvore de objetos, blocos + código, Output/variáveis, imagens e sons, tiles, projetos em pasta/ZIP, qualidade gráfica (Compatibilidade, Gráficos, Simples).
- **Projetos de exemplo:** `projetos/pega-moedas`, `projetos/mini-rpg`.
- **Qualidade:** testes do núcleo e do navegador rodam em cada PR (GitHub Actions).

## Peso
Código do núcleo + adaptadores ≈ 120 KB (≈ 30 KB compactado). Com o editor ≈ 300 KB (≈ 86 KB compactado). PixiJS (666 KB) só é baixado quando se escolhe Gráficos (WebGL). Total máximo ≈ 1 MB.

## Limitações conhecidas (v1.0)
- Os scripts rodam na mesma thread da página: um laço infinito trava o jogo e **não se deve abrir projetos de terceiros sem ler os scripts**. (Próximo passo: Worker.)
- Física própria: sem rotação de corpos, juntas ou polígonos côncavos. (Opcional futuro: Matter.js.)
- Sem escala no Transform, sem rede/multiplayer, sem editor de animação, sem empacotamento como app (PWA e Flutter são os próximos passos).
- Salvamento automático na pasta só em Chrome/Edge/Android; nos outros, use ZIP.

## Como publicar uma versão
1. Todos os testes passam (CI verde). 2. Atualize `Core.VERSAO` em `core/engine.js` e esta página. 3. Crie uma *release* com a tag `vX.Y.Z` no GitHub.
