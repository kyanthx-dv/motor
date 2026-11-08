# Núcleo da Engine

- Jogar o exemplo: abra `index.html` no navegador (duplo clique). Console: objeto `jogo`.
- Testes do núcleo: `npm test` (ou `node tests/test-core.js`).
- Testes de navegador: `npm run test:navegador` (requer as dependências instaladas e os navegadores do Playwright; use `npx playwright install chromium` quando necessário).
- Arquitetura e marcos: `docs/ARQUITETURA.md`.
- Núcleo em `core/` (sem navegador), adaptadores em `adapters/`, jogo exemplo em `games/futebol/`.
- Para integrar em um app: crie `new Core.Engine({renderer, input})`, registre scripts, monte a cena com `engine.scene.create({...})` e chame `engine.iniciar()`.
- Segundo exemplo (câmera + sprites animados): abra `mundo.html`.
- Câmera: `scene.estado.camera = { x, y, zoom, seguir:'nome', suavizar, limites:{x0,y0,x1,y1} }`.
- Sprite com imagem: `Sprite:{imagem:'nome', quadroW, quadroH, escala}` + `Animacao:{atual, animacoes:{nome:{linha,quadros,fps,repetir}}}`; imagens via `Core.Assets` (`carregar({nome:url})` ou `registrar(nome, canvas)`).
- Terceiro exemplo (cenas, menus, camadas, salvar/carregar): abra `aventura.html`.
- Cenas: `engine.registrarCena('nome', { montar(engine, dados) {...} })` e `engine.irPara('nome', dados)`.
- Botões: entidade com `Botao:{acao:{irPara:'cena'}}` + `Sprite:{fixo:true, w, h, rotulo}` (fixo = não anda com a câmera).
- Camadas: `Body:{camada:'jogador', colide:['cenario','item']}`. Sem `colide` colide com tudo.
- Depurador: botão **Depurar** (ou F2) em qualquer exemplo. Clique numa entidade para selecioná-la e edite os componentes.
