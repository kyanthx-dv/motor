# Como contribuir

Obrigado por ajudar! O projeto é uma engine 2D por camadas (núcleo `core/`, adaptadores `adapters/`, editor `editor/`). Leia `docs/ARQUITETURA.md` e `docs/PLANO.md` antes de começar.

## Regras (as mesmas do plano)
1. **Uma tarefa por PR**, pequena e com objetivo claro.
2. **Testes**: `node tests/test-core.js` e `node tests/test-navegador.js` (precisa do Playwright). Todo comportamento novo ganha teste.
3. **CI verde** (jobs `test` e `navegador`) antes de mesclar.
4. O **núcleo não conhece o navegador**: nada de `document`, `window` ou `canvas` em `core/`. Coisas de aparelho vão em `adapters/`.
5. Mudou a API dos scripts (`ctx`)? Atualize `docs/CTX.md` e a lista de autocompletar em `editor/codigo.js`.
6. Mudou o formato de projeto/cena? Atualize `core/serializer.js` e documente na `ARQUITETURA.md` (seções numeradas).
7. Sem dependências novas sem conversar antes; o editor roda direto do arquivo, sem build.

## Rodando
Abra `editor/index.html` (ou sirva a pasta com `python3 -m http.server`). Alguns recursos (PWA, Worker, projeto por URL) só funcionam por http.

## Bom começo
Procure issues com `good first issue`: exemplos de jogo em `projetos/`, blocos novos em `editor/gerador.js`, melhorias de texto/documentação.
