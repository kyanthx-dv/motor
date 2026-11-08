# Núcleo da Engine
- Jogar o exemplo: abra `index.html` no navegador (duplo clique). Console: objeto `jogo`.
- Testes do núcleo: `node tests/test-core.js`
- Arquitetura e marcos: `docs/ARQUITETURA.md`
- Núcleo em `core/` (sem navegador), adaptadores em `adapters/`, jogo exemplo em `games/futebol/`.
- Para integrar em um app: crie `new Core.Engine({renderer, input})`, registre scripts, monte a cena com `engine.scene.create({...})` e chame `engine.iniciar()`.
- Segundo exemplo (câmera + sprites animados): abra `mundo.html`.
- Câmera: `scene.estado.camera = { x, y, zoom, seguir:'nome', suavizar, limites:{x0,y0,x1,y1} }`.
- Sprite com imagem: `Sprite:{imagem:'nome', quadroW, quadroH, escala}` + `Animacao:{atual, animacoes:{nome:{linha,quadros,fps,repetir}}}`; imagens via `Core.Assets` (`carregar({nome:url})` ou `registrar(nome, canvas)`).
