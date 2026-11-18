/* Editor · conta (rede social, etapa 1): entrar / criar conta / perfil. Conta é opcional: só precisa para publicar (etapas seguintes). */
(function (root) {
  const cfg = root.MOTOR_SOCIAL, C = root.Core; if (!C || !C.Social) return;
  const S = root.EditorConta = new C.Social({ url: cfg && cfg.url, chave: cfg && cfg.chave });
  const ref = document.getElementById('ex-ajustes') || document.getElementById('jogo-exportar-zip') || document.querySelector('header.topo .acoes'); if (!ref) return;
  const el = (t, txt, cl) => { const x = document.createElement(t); if (txt !== undefined) x.textContent = txt; if (cl) x.className = cl; return x; };
  const b = el('button', '👤 Conta'); b.type = 'button'; b.id = 'conta-abrir'; b.title = 'Entrar ou criar sua conta (necessária só para publicar jogos)'; (ref.after ? ref.after(b) : ref.append(b));
  const p = el('div', undefined, 'mais-painel'); p.id = 'conta-painel'; p.hidden = true; p.style.cssText = 'position:fixed;top:48px;right:8px;z-index:60;max-width:96vw;width:300px'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Conta'); document.body.append(p);
  let msg = null, ocupado = false;
  const aviso = (t, erro) => { if (!msg) return; msg.textContent = t || ''; msg.className = 'msg' + (erro ? ' erro' : ''); };
  const campo = (rot, tipo, id, valor, extra) => { const l = el('label', rot); l.style.cssText = 'display:grid;gap:3px;margin:6px 0'; const i = el('input'); i.type = tipo; i.id = id; if (valor) i.value = valor; Object.assign(i, extra || {}); l.append(i); p.append(l); return i; };
  const acao = async fn => { if (ocupado) return; ocupado = true; aviso('Aguarde…'); try { await fn(); } catch (x) { aviso(x.message, true); } ocupado = false; };
  async function desenhar() {
    p.innerHTML = ''; p.append(el('p', '👤 Conta', 't')); msg = el('div', '', 'msg'); msg.id = 'conta-msg';
    if (!S.configurado) { p.append(el('small', 'A rede social ainda não está configurada neste editor.'), msg); return; }
    if (!S.logado) {
      const em = campo('E-mail', 'email', 'conta-email', '', { autocomplete: 'email' }), se = campo('Senha (8+ caracteres)', 'password', 'conta-senha', '', { autocomplete: 'current-password' });
      const idade = el('label'); idade.style.cssText = 'display:flex;gap:6px;align-items:center;margin:6px 0;font-size:12px'; const ck = el('input'); ck.type = 'checkbox'; ck.id = 'conta-idade'; idade.append(ck, el('span', 'Tenho 13 anos ou mais (necessário para criar conta)')); p.append(idade);
      const e = el('button', 'Entrar'); e.type = 'button'; e.id = 'conta-entrar'; e.addEventListener('click', () => acao(async () => { await S.entrar(em.value, se.value); await desenhar(); }));
      const c = el('button', 'Criar conta'); c.type = 'button'; c.id = 'conta-criar'; c.addEventListener('click', () => acao(async () => { if (!ck.checked) throw new Error('é preciso ter 13 anos ou mais para criar conta'); const r = await S.cadastrar(em.value, se.value); if (r.logado) await desenhar(); else aviso('Conta criada! Confirme seu e-mail (veja também o spam) e depois toque em Entrar.'); }));
      p.append(e, c, msg, el('small', 'Conta é opcional: o editor e seus jogos funcionam sem ela. Ela serve para publicar e ter perfil.')); return;
    }
    let perfil = null; try { perfil = await S.perfil(); } catch (x) { p.append(msg); aviso(x.message, true); }
    p.append(el('small', 'Conectado como ' + S.email));
    const us = campo('Nome de usuário (a–z, 0–9, _)', 'text', 'conta-usuario', perfil ? perfil.usuario : '', { maxLength: 20, autocapitalize: 'off', disabled: false });
    const no = campo('Nome para exibir', 'text', 'conta-nome', perfil && perfil.nome, { maxLength: 40 }), bi = campo('Sobre você', 'text', 'conta-bio', perfil && perfil.bio, { maxLength: 280 });
    const sv = el('button', perfil ? 'Salvar perfil' : 'Criar perfil'); sv.type = 'button'; sv.id = 'conta-salvar'; sv.addEventListener('click', () => acao(async () => { const novo = us.value.trim().toLowerCase(); if (!perfil || novo !== perfil.usuario) { if (!C.Social.usuarioValido(novo)) throw new Error('usuário: 3 a 20 letras minúsculas, números ou _'); if (!(await S.usuarioLivre(novo))) throw new Error('esse nome de usuário já existe'); } perfil = await S.salvarPerfil({ usuario: novo, nome: no.value, bio: bi.value }); aviso('Perfil salvo: @' + perfil.usuario); }));
    const so = el('button', 'Sair'); so.type = 'button'; so.id = 'conta-sair'; so.addEventListener('click', () => acao(async () => { await S.sair(); await desenhar(); }));
    p.append(sv, so, msg);
  }
  b.addEventListener('click', () => { p.hidden = !p.hidden; if (!p.hidden) desenhar(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') p.hidden = true; });
})(window);
