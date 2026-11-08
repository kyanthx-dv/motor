# Tarefas do motor

## Feito
- [x] M1 Loop de passo fixo, cena, entidades e componentes, desenho em Canvas
- [x] M2 Entrada (teclado, mouse, toque) e física com colisão, gravidade e gatilhos
- [x] M3 Salvar e carregar cena em JSON
- [x] M4 Scripts por entidade e eventos
- [x] Câmera (seguir, zoom, limites), sprites, animação e carregador de imagens
- [x] Testes automáticos do núcleo (`node tests/test-core.js`)

## Próximo
- [ ] Cenas e menus (trocar de fase, tela inicial)
- [ ] Colisão por camadas (o que colide com o quê)
- [ ] Som
- [ ] Retângulos que giram
- [ ] Ferramentas de depuração (inspecionar entidades)
- [ ] Adaptador Phaser (opcional)
- [ ] Editor (Flux Engine gera cenas e scripts)

## Regras (resumo; detalhes em docs/ARQUITETURA.md)
- Uma tarefa por vez. Rodar `node tests/test-core.js` antes de salvar (commit).
- Nada de dependências em `core/`.
- Mudou o formato da cena? Subir `Serializer.FORMATO` e escrever a migração.
