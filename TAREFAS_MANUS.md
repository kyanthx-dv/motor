# TAREFAS_MANUS — fila do dev júnior

Papéis: **Claude = sênior** (decide, mexe no `core/`). **Manus = júnior** (faz só a fila abaixo, enquanto o Claude descansa). **DeepSeek = analisador** (revisa PRs, não escreve código).

## Regras do Manus (leia antes de cada tarefa)
1. Leia `docs/ARQUITETURA.md`. Não adicione dependência ao `core`.
2. Faça **só** tarefas marcadas `[ ]` na Fila. Uma tarefa = uma branch `manus/<nome>` = um Pull Request.
3. **Não toque em `core/`** nem em `docs/ARQUITETURA.md`. Se achar que precisa, escreva em "Dúvidas" e pare.
4. Antes do PR rode `node tests/test-core.js`. Tem que passar tudo.
5. Termine escrevendo 3 linhas em "Relatório": o que fez, o que testou, o que ficou duvidoso.
6. Nunca invente que testou. Se não rodou, diga.

## Fila
- [x] **M1** `package.json` com scripts `test` (core) e `test:navegador` (Playwright como devDependency). Atualizar README com os comandos.
- [x] **M2** GitHub Actions (`.github/workflows/ci.yml`) rodando `npm test` em cada PR.
- [x] **M3** `adapters/input.js`: o joystick virtual só aparece para toque (`e.pointerType === "touch"`). Mouse segue só como ponteiro/clique. Testar no navegador.
- [x] **M4** README: seção "Contrato do host" (o motor precisa de um agendador; no navegador é automático).
- [x] **M5** `adapters/audio.js`: sons curtos por nome via WebAudio (`carregar`, `tocar`), com detecção se `AudioContext` existe. Só o adaptador, sem mexer no core.
- [x] **M6** `adapters/input.js`: guardar listeners e fornecer `destruir()`; testar no navegador que o teclado deixa de ter efeito.
- [x] **M7 (E2)** `editor/editor.js`: arrastar o objeto selecionado no canvas para mover (atualiza Transform.x/y e o painel); botão "Novo objeto" (círculo ou retângulo, com Transform, Body e Sprite válidos); botão "Remover" e "Duplicar"; botões Play/Parar (Play: salva o JSON, roda `engine.iniciar()`; Parar: `engine.parar()` e recarrega o JSON salvo). Testes no `tests/test-navegador.js`. NÃO mexer em `core/`. Use sempre `aplicar()`/validação do motor, sem regras próprias.
- [x] **M8** `editor/editor.js`: criar `Core.Input` somente no Play, atribuir a `engine.input`, destruir no Parar e testar seta movendo o jogador com Controller.

## Só o Claude faz (não pegar)
(nada pendente: a revisão 2 foi toda corrigida).

## Relatório do Manus
- M1 concluída: adicionado `package.json`/lockfile e documentados os comandos no README.
- Testado: `node tests/test-core.js`, `npm test` e `npm run test:navegador` (todos passaram).
- M6 concluída: `Input` guarda os listeners e `destruir()` remove teclado, janela e canvas; teste de teclado adicionado.
- Testado: `node tests/test-core.js`, `node tests/test-navegador.js` e `node --check` nos arquivos alterados (todos passaram).
- Dúvidas: nenhuma.
- M3 concluída: joystick virtual restrito a toque; mouse permanece apenas como ponteiro/clique, com testes de navegador adicionados.
- Testado: `node tests/test-core.js`, `node tests/test-navegador.js` e `node --check` nos arquivos alterados (todos passaram).
- Dúvidas: nenhuma.
- M2 concluída: workflow do GitHub Actions configurado para instalar dependências e rodar `npm test` em cada Pull Request.
- Testado: `node tests/test-core.js` e validação sintática do workflow YAML (todos passaram).
- Dúvidas: nenhuma.
- M7 concluída: editor E2 com arraste, criação, duplicação, remoção e controles Play/Parar.
- Testado: `node tests/test-core.js`, `node tests/test-navegador.js`, `node --check` e validação do fluxo E2 no navegador (todos passaram).
- Dúvidas: nenhuma.
- M8 concluída: Input temporário integrado ao editor durante Play, destruído no Parar, com controle por seta no jogador.
- Testado: `node tests/test-core.js`, `node tests/test-navegador.js` e `node --check` nos arquivos alterados (todos passaram).
- Dúvidas: nenhuma.
- M4 concluída: README documenta o contrato do agendador do host, padrões do navegador/Node e uso explícito em outros hosts.
- Testado: `node tests/test-core.js` e revisão textual da seção adicionada (passaram/conferida).
- Dúvidas: nenhuma.
- M5 concluída: adaptador WebAudio com detecção de suporte, carregamento de buffers por nome e reprodução com volume.
- Testado: `node tests/test-core.js`, `node tests/test-navegador.js`, `node --check adapters/audio.js` e `node --check tests/test-navegador.js` (todos passaram).
- Dúvidas: nenhuma.

## Dúvidas do Manus
(vazio)

## Para o analisador (DeepSeek) — cole isto junto com o diff do PR
"Revise este PR de um motor de jogo JS. Regras: docs/ARQUITETURA.md. Liste só bugs reais e violações das regras, em ordem de gravidade, com arquivo e linha. Não reescreva código. Se estiver ok, diga 'sem problemas'."

## Estado do Claude (atualizado a cada entrega)
Próximo: revisar os PRs do Manus. Já feito pelo Claude: B1, B2, B3, B4, B5. Revisão 2 inteira resolvida (B1–B6, A2, scripts isolados, SEM_INPUT).
