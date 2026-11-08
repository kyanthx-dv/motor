# TAREFAS_MANUS — fila do dev júnior

Papéis: **Claude = sênior** (decide, mexe no `core/`). **Manus = júnior** (faz só a fila abaixo, enquanto o Claude descansa). **DeepSeek = analisador** (revisa PRs, não escreve código).

## Regras do Manus (leia antes de cada tarefa)
1. Leia `docs/ARQUITETURA.md`. Não adicione dependência ao `core/`.
2. Faça **só** tarefas marcadas `[ ]` na Fila. Uma tarefa = uma branch `manus/<nome>` = um Pull Request.
3. **Não toque em `core/`** nem em `docs/ARQUITETURA.md`. Se achar que precisa, escreva em "Dúvidas" e pare.
4. Antes do PR rode `node tests/test-core.js`. Tem que passar tudo.
5. Termine escrevendo 3 linhas em "Relatório": o que fez, o que testou, o que ficou duvidoso.
6. Nunca invente que testou. Se não rodou, diga.

## Fila
- [x] **M1** `package.json` com scripts `test` (core) e `test:navegador` (Playwright como devDependency). Atualizar README com os comandos.
- [ ] **M2** GitHub Actions (`.github/workflows/ci.yml`) rodando `npm test` em cada PR.
- [ ] **M3** `adapters/input.js`: o joystick virtual só aparece para toque (`e.pointerType === "touch"`). Mouse segue só como ponteiro/clique. Testar no navegador.
- [ ] **M4** README: seção "Contrato do host" (o motor precisa de um agendador; no navegador é automático).
- [ ] **M5** `adapters/audio.js`: sons curtos por nome via WebAudio (`carregar`, `tocar`), com detecção se `AudioContext` existe. Só o adaptador, sem mexer no core.

## Só o Claude faz (não pegar)
B6 física · A2 validação de componentes (B1–B5 já corrigidos).

## Relatório do Manus
- M1 concluída: adicionado `package.json`/lockfile e documentados os comandos no README.
- Testado: `node tests/test-core.js`, `npm test` e `npm run test:navegador` (todos passaram).
- Dúvidas: nenhuma.

## Dúvidas do Manus
(vazio)

## Para o analisador (DeepSeek) — cole isto junto com o diff do PR
"Revise este PR de um motor de jogo JS. Regras: docs/ARQUITETURA.md. Liste só bugs reais e violações das regras, em ordem de gravidade, com arquivo e linha. Não reescreva código. Se estiver ok, diga 'sem problemas'."

## Estado do Claude (atualizado a cada entrega)
Próximo: revisar os PRs do Manus. Já feito pelo Claude: B1, B2, B3, B4, B5. Falta: B6 (física), A2 (validação de componentes).
