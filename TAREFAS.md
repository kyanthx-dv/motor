# Tarefas do motor

## Feito
- [x] M1 Loop de passo fixo, cena, entidades e componentes, desenho em Canvas
- [x] M2 Entrada (teclado, mouse, toque) e física com colisão, gravidade e gatilhos
- [x] M3 Salvar e carregar cena em JSON
- [x] M4 Scripts por entidade e eventos
- [x] Câmera (seguir, zoom, limites), sprites, animação e carregador de imagens
- [x] Testes automáticos do núcleo (`node tests/test-core.js`)

- [x] Cenas e menus (`registrarCena`, `irPara`, botões com `Botao`)
- [x] Colisão por camadas (`Body.camada` e `Body.colide`)

- [x] Revisão sênior (Manus): A1 agendador do host, A2/A3 docs alinhados ao código, B1 migração finita, B2 um ponteiro principal, B3 ids únicos, B4 eventos descartados contados, B5 política de tempo documentada, R1 validação, R2 subpassos, R3 save sem campos de runtime, R4 guarda de carregamento, R6 teste de navegador

- [x] Depurador (inspecionar e editar entidades, pausa, passo a passo, tempo por sistema)

## Próximo
- [ ] Assets em hosts sem `Image` e som (R5)
- [ ] Módulos ES / pacote (R4, quando for integrar em app)
- [ ] Som
- [ ] Retângulos que giram
- [ ] Adaptador Phaser (opcional)
- [ ] Editor (Flux Engine gera cenas e scripts)

## Regras (resumo; detalhes em docs/ARQUITETURA.md)
- Uma tarefa por vez. Rodar `node tests/test-core.js` antes de salvar (commit).
- Nada de dependências em `core/`.
- Mudou o formato da cena? Subir `Serializer.FORMATO` e escrever a migração.

- [x] Variáveis no motor (`engine.vars`) · [x] Editor E1 (`editor/index.html`)
- [ ] Editor E2: mover/criar/remover/Play (Manus, M7) · E3a: scripts JS na cena [x] · E3b: blocos gerando esse JS [x]; depois: arrastar e soltar, mais blocos (criar objeto, esperar, repetir), Flux por nós como 2º modo · isolar código de terceiros (Worker/iframe) antes de abrir projetos alheios
