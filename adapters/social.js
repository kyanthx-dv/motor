/* Adaptador · rede social (Supabase por fetch, sem biblioteca). Só usa a chave PÚBLICA (publishable); o acesso é limitado pelas
   regras do banco (RLS, ver supabase/*.sql). Tudo injetável (fetch, armazenamento, relógio) para testar sem internet. */
(function (root) {
  const C = root.Core = root.Core || {};
  const USUARIO = /^[a-z0-9_]{3,20}$/;
  class Social {
    constructor(o) {
      this.url = String(o.url || '').replace(/\/+$/, ''); this.chave = o.chave || ''; this.f = o.fetch || (root.fetch && root.fetch.bind(root)); this.agora = o.agora || (() => Date.now());
      this.arm = o.armazem || { get: k => { try { return root.localStorage.getItem(k); } catch (x) { return null; } }, set: (k, v) => { try { root.localStorage.setItem(k, v); } catch (x) {} }, del: k => { try { root.localStorage.removeItem(k); } catch (x) {} } };
      this.K = 'motor.social.sessao'; this.s = null; try { this.s = JSON.parse(this.arm.get(this.K) || 'null'); } catch (x) { this.s = null; }
    }
    get configurado() { return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(this.url) && !!this.chave; }
    get logado() { return !!(this.s && this.s.access_token); }
    get usuarioId() { return this.s && this.s.user ? this.s.user.id : null; }
    get email() { return this.s && this.s.user ? this.s.user.email : null; }
    static usuarioValido(u) { return typeof u === 'string' && USUARIO.test(u); }
    async _req(caminho, { metodo = 'GET', corpo, auth = true, extra } = {}) {
      if (!this.configurado) throw new Error('rede social não configurada');
      if (auth && this.logado) await this._renovarSeVencido();
      const h = Object.assign({ apikey: this.chave, 'Content-Type': 'application/json' }, extra || {}); if (auth && this.logado) h.Authorization = 'Bearer ' + this.s.access_token; else h.Authorization = 'Bearer ' + this.chave;
      let r; try { r = await this.f(this.url + caminho, { method: metodo, headers: h, body: corpo === undefined ? undefined : JSON.stringify(corpo) }); } catch (x) { throw new Error('sem conexão com a internet'); }
      let j = null; const t = await r.text(); try { j = t ? JSON.parse(t) : null; } catch (x) { j = null; }
      if (!r.ok) { const e = new Error(Social.traduzir(j, r.status)); e.status = r.status; e.codigo = j && (j.code || j.error_code); throw e; }
      return j;
    }
    static traduzir(j, status) {
      const m = String((j && (j.msg || j.message || j.error_description || j.error)) || ''), c = String((j && (j.code || j.error_code)) || '');
      if (c === '23505' || /duplicate key/i.test(m)) return 'esse nome de usuário já existe';
      if (/invalid login/i.test(m)) return 'e-mail ou senha incorretos';
      if (/already registered|already been registered/i.test(m)) return 'esse e-mail já tem conta (use Entrar)';
      if (/email not confirmed/i.test(m)) return 'confirme seu e-mail (veja a caixa de entrada e o spam) e entre de novo';
      if (/password.*(short|least|characters)/i.test(m) || c === 'weak_password') return 'senha fraca: use pelo menos 8 caracteres';
      if (/rate limit|too many/i.test(m) || status === 429) return 'muitas tentativas; espere um pouco e tente de novo';
      if (/valid email|invalid.*email/i.test(m)) return 'e-mail inválido';
      return m || 'erro ' + status;
    }
    _guardar(s) { if (s && s.access_token) { s.expira = this.agora() + ((s.expires_in || 3600) - 30) * 1000; this.s = s; this.arm.set(this.K, JSON.stringify(s)); } else { this.s = null; this.arm.del(this.K); } }
    async _renovarSeVencido() { if (this.s && this.s.expira && this.agora() >= this.s.expira && this.s.refresh_token) { try { const j = await this._req('/auth/v1/token?grant_type=refresh_token', { metodo: 'POST', auth: false, corpo: { refresh_token: this.s.refresh_token } }); this._guardar(j); } catch (x) { this._guardar(null); throw new Error('sessão expirada; entre de novo'); } } }
    async cadastrar(email, senha) {
      if (typeof senha !== 'string' || senha.length < 8) throw new Error('senha fraca: use pelo menos 8 caracteres');
      const j = await this._req('/auth/v1/signup', { metodo: 'POST', auth: false, corpo: { email: String(email || '').trim(), password: senha } });
      if (j && j.access_token) { this._guardar(j); return { logado: true }; } return { logado: false, confirmar: true };
    }
    async entrar(email, senha) { const j = await this._req('/auth/v1/token?grant_type=password', { metodo: 'POST', auth: false, corpo: { email: String(email || '').trim(), password: senha } }); this._guardar(j); return true; }
    async sair() { try { if (this.logado) await this._req('/auth/v1/logout', { metodo: 'POST' }); } catch (x) {} this._guardar(null); }
    async perfil(id) { const alvo = id || this.usuarioId; if (!alvo) return null; const l = await this._req('/rest/v1/perfis?id=eq.' + encodeURIComponent(alvo) + '&select=id,usuario,nome,bio,criado_em', { auth: this.logado }); return l && l[0] ? l[0] : null; }
    async usuarioLivre(u) { if (!Social.usuarioValido(u)) return false; const l = await this._req('/rest/v1/perfis?usuario=eq.' + encodeURIComponent(u) + '&select=id', { auth: this.logado }); return !(l && l.length); }
    async salvarPerfil({ usuario, nome, bio }) {
      if (!this.logado) throw new Error('entre na sua conta primeiro');
      usuario = String(usuario || '').trim().toLowerCase(); if (!Social.usuarioValido(usuario)) throw new Error('usuário: 3 a 20 letras minúsculas, números ou _');
      nome = String(nome || '').trim().slice(0, 40); bio = String(bio || '').trim().slice(0, 280);
      const j = await this._req('/rest/v1/perfis?on_conflict=id', { metodo: 'POST', corpo: { id: this.usuarioId, usuario, nome: nome || null, bio: bio || null }, extra: { Prefer: 'resolution=merge-duplicates,return=representation' } });
      return j && j[0] ? j[0] : null;
    }
  }
  C.Social = Social;
})(typeof window !== 'undefined' ? window : globalThis);
