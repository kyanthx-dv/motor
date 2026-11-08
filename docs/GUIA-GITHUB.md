# Enviar o projeto para o GitHub (primeira vez)

1. Crie uma conta em github.com e clique em **New repository**. Nome: `motor` (ou outro). Deixe **sem** README e sem .gitignore. Clique em **Create**.
2. Descompacte o zip e abra a pasta `engine` no VS Code (Arquivo > Abrir Pasta).
3. Abra o terminal do VS Code (Terminal > Novo Terminal) e rode, trocando seu nome, e-mail e a URL do seu repositório:

```
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
git init
git add .
git commit -m "Primeira versão do núcleo"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/motor.git
git push -u origin main
```

4. O navegador pede para entrar na sua conta. Depois disso o código está no GitHub.
5. Para ver os exemplos online: no repositório, **Settings > Pages**, escolha branch `main` e pasta `/ (root)`. Em um minuto, `index.html` e `mundo.html` abrem pelo link que o GitHub mostrar.

## Rotina do dia a dia
- Terminou algo que funciona: `git add .` e `git commit -m "o que mudou"` e `git push`.
- Deu errado: `git restore .` volta ao último ponto salvo.
- Antes de salvar: `node tests/test-core.js` (precisa do Node.js instalado).
