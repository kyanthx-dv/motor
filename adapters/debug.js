/* Adaptador · Depurador
   Painel para ver e mexer no jogo rodando: lista de entidades, edição de componentes em JSON, pausa, passo a passo,
   tempo de cada sistema e contadores do motor. Abre pelo botão "Depurar" ou pela tecla F2. Clique numa entidade
   no jogo (com o painel aberto) para selecioná-la. */
(function (root) {
  const C = root.Core = root.Core || {};
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const CSS = `.dbg-btn{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:14px;z-index:70;font:600 13px system-ui,sans-serif;padding:7px 12px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--fg,#111);cursor:pointer;touch-action:manipulation}
.dbg{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:54px;z-index:70;width:min(350px,calc(100% - 24px));max-height:calc(100% - 140px);overflow:auto;display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:14px;border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--fg,#111);font:12px/1.4 system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.25);touch-action:pan-y;user-select:text;-webkit-user-select:text}
.dbg *{box-sizing:border-box}.dbg-top{display:flex;justify-content:space-between;align-items:center;font-size:13px}
.dbg-info{font:11px/1.5 ui-monospace,Menlo,Consolas,monospace;color:var(--mute,#666);white-space:pre-wrap}
.dbg-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.dbg button{font:inherit;font-weight:600;padding:5px 10px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--btn,#f4f4f4);color:var(--fg,#111);cursor:pointer}
.dbg input[type=text],.dbg select,.dbg textarea{width:100%;font:11px ui-monospace,Menlo,Consolas,monospace;padding:5px;border-radius:8px;border:1px solid var(--line,#ccc);background:var(--btn,#fff);color:var(--fg,#111)}
.dbg select{min-height:104px;flex:none}.dbg textarea{min-height:130px;resize:vertical;flex:none}.dbg-msg{min-height:16px;color:var(--mute,#666)}`;
  class Depurador {
    constructor(engine, renderer, canvas) {
      this.e = engine; this.r = renderer; this.cv = canvas; this.sel = null; this.aberto = false; this._chave = '';
      const st = el('style', null, CSS); document.head.appendChild(st);
      const host = canvas.parentElement || document.body;
      this.btn = el('button', 'dbg-btn', 'Depurar'); this.btn.type = 'button';
      this.p = el('div', 'dbg'); this.p.hidden = true;
      this.p.innerHTML = '<div class="dbg-top"><b>Depurador</b><button type="button" data-a="fechar">✕</button></div><div class="dbg-info"></div>' +
        '<div class="dbg-row"><button type="button" data-a="pausar">Pausar</button><button type="button" data-a="passo">+1 passo</button><label><input type="checkbox" data-a="colisores"> Colisores</label></div>' +
        '<input type="text" class="dbg-f" placeholder="Filtrar por nome" aria-label="Filtrar por nome"><select class="dbg-l" size="6" aria-label="Entidades"></select>' +
        '<textarea class="dbg-j" spellcheck="false" aria-label="Componentes da entidade (JSON)"></textarea>' +
        '<div class="dbg-row"><button type="button" data-a="aplicar">Aplicar</button><button type="button" data-a="remover">Remover</button></div><div class="dbg-msg"></div>';
      host.append(this.btn, this.p);
      this.info = this.p.querySelector('.dbg-info'); this.lista = this.p.querySelector('.dbg-l'); this.json = this.p.querySelector('.dbg-j');
      this.filtro = this.p.querySelector('.dbg-f'); this.msg = this.p.querySelector('.dbg-msg'); this.bPausar = this.p.querySelector('[data-a=pausar]');
      this.btn.addEventListener('click', () => this.alternar());
      window.addEventListener('keydown', ev => { if (ev.key === 'F2') { ev.preventDefault(); this.alternar(); } });
      this.p.addEventListener('click', ev => { const a = ev.target.dataset && ev.target.dataset.a; if (a) this.acao(a, ev.target); });
      this.lista.addEventListener('change', () => this.selecionar(+this.lista.value));
      canvas.addEventListener('click', ev => { if (!this.aberto) return; const b = canvas.getBoundingClientRect(), w = renderer.telaParaMundo(ev.clientX - b.left, ev.clientY - b.top), h = this.escolher(w.x, w.y); if (h) this.selecionar(h.id); });
      setInterval(() => { if (this.aberto) this.atualizar(); }, 250);
    }
    alternar() { this.aberto = !this.aberto; this.p.hidden = !this.aberto; this.e.perfil = this.aberto; if (this.aberto) this.atualizar(); else this.r.selecionada = null; }
    escolher(x, y) {
      let melhor = null, area = Infinity;
      for (const e of this.e.scene.entities.values()) {
        if (!e.Transform || (e.Sprite && e.Sprite.fixo) || (!e.Sprite && !e.Body)) continue;
        const l = C.CanvasRenderer.limitesDe(e), cx = e.Transform.x + l.ox, cy = e.Transform.y + l.oy;
        if (Math.abs(x - cx) <= l.hw && Math.abs(y - cy) <= l.hh && l.hw * l.hh < area) { area = l.hw * l.hh; melhor = e; }
      }
      return melhor;
    }
    selecionar(id) { this.sel = id; this.r.selecionada = id; this._chave = ''; this._json = ''; this.json.value = ''; this.atualizar(); }
    texto(e) { const c = JSON.parse(JSON.stringify(e)); delete c.id; if (c.Transform) { delete c.Transform.px; delete c.Transform.py; } return JSON.stringify(c, null, 1); }
    atualizar() {
      const en = this.e, sc = en.scene, t = Object.entries(en.tempos).map(([n, ms]) => n + ' ' + ms.toFixed(2) + 'ms').join('  ');
      this.info.textContent = Math.round(en.fps) + ' fps · passo ' + en.passos + ' · ' + sc.entities.size + ' entidades\n' + (sc.estado.cena ? 'cena: ' + sc.estado.cena + '  ' : '') +
        'perdido ' + en.tempoPerdido.toFixed(1) + 's · eventos descartados ' + en.events.descartados + '\n' + t;
      this.bPausar.textContent = en.pausado ? 'Continuar' : 'Pausar';
      const f = this.filtro.value.toLowerCase(), todos = [...sc.entities.values()].filter(e => !f || (e.nome || '').toLowerCase().includes(f) || String(e.id) === f);
      const chave = f + '|' + todos.length + '|' + (todos[0] ? todos[0].id : '') + '|' + (todos.length ? todos[todos.length - 1].id : '') + '|' + this.sel;
      if (chave !== this._chave) {
        this._chave = chave; this.lista.innerHTML = '';
        todos.slice(0, 300).forEach(e => { const o = el('option', null, (e.nome || 'sem nome') + ' #' + e.id); o.value = e.id; if (e.id === this.sel) o.selected = true; this.lista.appendChild(o); });
        if (todos.length > 300) this.lista.appendChild(el('option', null, '… mais ' + (todos.length - 300) + ' (use o filtro)'));
      }
      const e = this.sel != null && sc.get(this.sel);
      if (e && document.activeElement !== this.json) { const tx = this.texto(e); if (tx !== this._json) { this._json = tx; this.json.value = tx; } }
      else if (!e && this.sel != null) { this.sel = null; this.r.selecionada = null; this.json.value = ''; }
    }
    acao(a, alvo) {
      const en = this.e, sc = en.scene;
      if (a === 'fechar') this.alternar();
      else if (a === 'pausar') { en.pausado = !en.pausado; this.atualizar(); }
      else if (a === 'colisores') this.r.debug = alvo.checked;
      else if (a === 'passo') { en.pausado = true; en.passo(); this.r.desenhar(sc, 1, en); this.atualizar(); }
      else if (a === 'remover') { if (this.sel != null) { sc.destroy(this.sel); if (en.pausado) sc.flush(); this.dizer('Removida'); this.atualizar(); } }
      else if (a === 'aplicar') {
        const e = this.sel != null && sc.get(this.sel); if (!e) return this.dizer('Selecione uma entidade');
        try {
          const d = JSON.parse(this.json.value); new C.Scene().create(d);                 // valida antes de aplicar
          for (const k of Object.keys(e)) if (k !== 'id' && k !== 'nome' && !(k in d)) delete e[k];
          for (const k of Object.keys(d)) if (k !== 'id') e[k] = JSON.parse(JSON.stringify(d[k]));
          this._json = ''; this.dizer('Aplicado');
        } catch (x) { this.dizer('Erro: ' + x.message); }
      }
    }
    dizer(t) { this.msg.textContent = t; }
  }
  C.Depurador = Depurador;
})(typeof window !== 'undefined' ? window : globalThis);
