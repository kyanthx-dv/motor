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
- Limpeza do repositório ✅: removidos os arquivos legados (artefatos antigos, filas de tarefas, guias obsoletos). Os demos `games/` ficam como exemplos de uso do núcleo.

**v1.2 — Distribuição sem limites**
- Exportar como **pasta/ZIP com assets em arquivos** ✅ **feito** (botão "Exportar jogo (pasta web .zip)": index.html + motor.js + projeto/cenas/assets + manifest + sw; carregamento sob demanda ainda não). O .html único continua para jogos pequenos.
- WebGL (Pixi) no jogo exportado ✅ (na pasta web, quando o seletor de render do editor está em "gráficos"; cai para Canvas 2D se falhar).
- ~~PWA do editor~~ **feito** (puxado para frente para chegar ao app mais cedo). PWA do jogo exportado ✅ (na pasta web).
- Exportar minificado (dificulta cópia do código; não impede — o código chega ao jogador de qualquer jeito).

**v1.3 — Conteúdo**
- Editor de animação ✅ (clipes por spritesheet, pré-visualização no inspetor), escala no Transform ✅ (visual; física não muda), camadas de tiles múltiplas ✅ (cada objeto Tiles é uma camada) e autotile ✅ (paleta com `auto`).
- Blocos/modelos prontos: diálogo, inventário, vida, menu.

**v1.4 — Aparência e primeiros passos do editor**
- Tema Scratch dos blocos ✅ em CSS (cor sólida, valores em pílula, "C" com corpo, encaixe; feito sem mexer na estrutura) (referência: cores sólidas, encaixe, valores em pílula, blocos em C para se/repetir). Exige mexer na estrutura dos blocos, não só no CSS.
- Temas do editor: seletor com temas prontos + arquivo JSON importável. Um tema só muda variáveis de CSS de uma lista permitida (cores, fontes), nunca CSS livre nem JavaScript. Loja de temas: só com contas e servidor, junto com a rede social do app (depois do v2.0).
- Camadas ✅: atalhos 👁/🔒 Mundo/Interface e painel ☰ Camadas (camadas nomeadas salvas no projeto: ordem, opacidade, paralaxe no jogo, ocultar, travar, mover o selecionado; `estado.camadas` + `Sprite.grupo`).
- Exportar: ajustes finos ✅ (⚙ Exportação: nome do app, orientação, encaixe inteiro, cor de fundo). Ícone próprio ✅ (PNG recortado no centro e redimensionado para 192/512; manifesto, favicon e apple-touch-icon) e imagens sob demanda ✅ (só as da cena inicial seguram a abertura; as outras cenas carregam em segundo plano). Faltam: minificação (precisa de um minificador de verdade, ex.: terser, com internet); FPS fica de fora (mudaria a física).
- Scripts de cena ✅: botão "Rodar na cena" na aba Scripts (roda sem objeto; `estado.scriptsCena`). Galeria: exemplos Pega-moedas e Mini-RPG ✅ (mais exemplos depois).
- Tutorial interativo de 5 minutos dentro do editor ✅ (botão Tutorial: 7 passos que avançam sozinhos); galeria de mini-jogos.
- Modelos prontos de RPG ✅ (menu ＋ Novo objeto): diálogo com escolhas, inventário com slots/quantidades/uso, vida com dano e invulnerabilidade; conversam por eventos (`dialogo-abrir`, `inv-adicionar`, `dano`, `curar`). Código editável na aba Scripts.
- Testar tudo no celular real.

**v2.0 — App e plugins**
- Casca Flutter (WebView) carregando o jogo exportado e o editor. **Repositório separado** (sugestão: `motor-app`, criado pelo dono; build do APK por GitHub Actions). O app baixa o pacote web de uma release do `motor`, então atualizar o motor não exige recompilar o app.
- Plugin de física Matter.js (corpos rotativos, juntas), carregado por projeto.
- Rede/multiplayer só depois, e só se houver um jogo que precise.

**v3.0 — Rede social + engine** (plano; nada disso está construído)
Objetivo: um lugar onde as pessoas criam no editor, publicam jogos, postam, compartilham assets e têm perfil com foto e avatar 2D (referências: Buildaa/Julian's Editor). A engine continua independente: a rede é uma camada em cima.

*Etapas (cada uma entrega algo usável sozinho):*
1. **Contas e perfil** ✅ (código pronto: e-mail + senha, usuário único, nome, bio; falta só rodar `supabase/0001_perfis.sql` no projeto e testar no aparelho). Depois: login com GitHub/Google e foto. Sem isso nada mais existe.
2. **Publicar e jogar** — botão "Publicar" no editor envia o pacote do jogo (o mesmo da exportação em pasta) + capa + título + descrição; página do jogo; jogar no navegador e no app.
3. **Descoberta** — página inicial com recentes/populares, busca, curtidas, contagem de jogadas, "remixar" (copiar o projeto de quem permitiu para o editor).
4. **Posts e comentários** — feed de quem se segue, comentários em jogos, seguir/deixar de seguir.
5. **Assets compartilhados** — imagens, sons e modelos (RPG, física) publicados com licença; importar com um toque no editor.
6. **Avatar 2D** — editor de avatar (partes em camadas: corpo, cabelo, roupa) guardado no perfil; vira um objeto/imagem usável nos jogos.
Fora até segunda ordem: multiplayer em tempo real, chat privado, loja/pagamentos.

*Backend (proposta, decisão do dono):* **Supabase** (banco Postgres + login + armazenamento de arquivos + regras de acesso por linha, plano grátis para começar, sem servidor para manter). Alternativa: Firebase (mais conhecido, regras mais difíceis de auditar). O editor continua funcionando 100% offline; só publicar/entrar exige internet. Cuidado fixo: nunca guardar chaves secretas no código do editor (só a chave pública do Supabase; o acesso é limitado por regras no banco).

*Segurança dos jogos de terceiros (bloqueia a etapa 2):* um jogo publicado roda código JavaScript de desconhecidos. Regras: (a) o jogo roda em `iframe sandbox` sem `allow-same-origin` e de **outro domínio** do que o editor/login, para não alcançar sessão nem dados do dono; (b) o motor já roda dentro de Worker com travamento detectado; (c) sem acesso a câmera/microfone/localização por padrão; (d) o salvamento do jogo fica separado por jogo; (e) tamanho máximo do pacote e das imagens/sons no envio.

*Moderação e abuso:* denunciar jogo/post/comentário/perfil; fila de revisão para o dono; remoção e banimento; filtro básico de palavras e limite de publicações por hora; checagem de tipo e tamanho dos arquivos; termos de uso e política de privacidade escritos antes de abrir ao público.

*Menores e leis (precisa ser definido antes do lançamento):* é provável que muitos usuários sejam menores. Decidir idade mínima (13+ costuma ser o padrão; LGPD/GDPR e COPPA exigem cuidado e consentimento dos responsáveis abaixo de certas idades), coletar o mínimo de dados, perfil sem localização/contato público por padrão, sem anúncios personalizados, e como apagar a conta e os dados a pedido. Isso é jurídico: buscar orientação de um profissional antes de publicar o serviço.

*Ordem de trabalho:* (1) escrever termos/privacidade e decidir idade mínima; (2) protótipo de etapas 1–2 só com o dono como usuário; (3) beta fechado com poucos amigos; (4) abrir aos poucos. O app (Flutter) ganha abrir/salvar arquivos no celular depois da etapa 2.

**v2.5 — Editor mobile nativo (Flutter)** (decisão do dono: o editor do celular é outro produto; só a engine é reaproveitada)
Hoje o app (`motor-app`) é só uma casca que abre o editor web do PC dentro de uma WebView — isso é **provisório** (serve para testar a engine no aparelho). O editor do celular terá interface própria em Flutter.

*Arquitetura:* Flutter desenha **toda a interface** (projetos, lista de objetos, inspetor, paleta e editor de blocos, console, menus). A WebView vira só a **janela do jogo** (um canvas com a engine). Contrato único entre os dois: o **JSON da cena** + a **ponte** `MotorAPI`.
- Flutter → engine: `carregar(json)`, `json()`, `play()`, `parar()`, `selecionar(id)`, `criar(def)`, `definir(id, componente, campo, valor)`, `mover(id, x, y)`, `excluir(id)`, `camera(x, y, zoom)`, `gerarCodigo(blocos)`, `desfazer()/refazer()`.
- Engine → Flutter (eventos): `selecionou`, `moveu` (arrastar no canvas), `mudou(json)`, `console`, `erro`, `jogando`.
- Gestos na janela do jogo: toque seleciona, arrastar move o objeto, dois dedos fazem pan/zoom.
- Fonte única de verdade: catálogos em JSON gerados pelo motor (componentes e campos para o inspetor, blocos e valores para o editor de blocos), para o Flutter não duplicar regras.

*Fases (cada uma testável sozinha):*
1. **Ponte + janela do jogo (repo `motor`)**: `MotorAPI` e uma página só com o canvas; testada em navegador automatizado, sem precisar de Flutter.
2. **Casca Flutter**: tela de projetos, janela do jogo, barra Play/Parar/Desfazer, lista de objetos, inspetor nativo (campos gerados do catálogo), abrir/salvar arquivo no celular.
3. **Editor de blocos nativo**: blocos desenhados em Flutter a partir do catálogo; o código gerado continua vindo do gerador do motor.
4. **Código, imagens, sons, camadas, interface e exportação** em telas nativas.
5. **Conta e publicar** (Supabase) integrados ao app.
O editor web do PC continua existindo, separado; o app **não** reutiliza o código dele.

*Riscos:* muito trabalho em Dart (inspetor, blocos) — por isso os catálogos em JSON; a ponte precisa ser estável (versionada) para o app e o motor evoluírem separados; testes: a ponte no navegador automatizado e `flutter test` no CI do `motor-app`.

## Linguagens de script (decisão)
Blocos + JavaScript continuam sendo a única opção até a v2.0. **Linguagem própria: não** (custo enorme, sem ganho sobre JS). **Lua** pode entrar depois, como linguagem opcional de script via **Fengari** (VM Lua em JS, ~200 KB), rodando no mesmo Worker; **pré-requisitos:** API de scripts (`ctx`) congelada e documentada, Play do editor no Worker (v1.1) e mapeamento de erros com linha. **Luau** (Roblox) não tem porta madura para JS (só WASM pesado): fora.

## Fora do escopo (decisão)
3D / Babylon.js; reescrever o núcleo em C++ (o gargalo é o desenho, não a lógica); IA dentro do jogo.

## Estado dos limites atuais (guarda-corpos conhecidos)
Imagens e sons ficam embutidos no JSON da cena: sons até 10 por cena e ~350 KB cada; imagens reduzidas na importação. O formato em pasta (v1.2) remove esses tetos.
