/* Editor · animação: clipes de spritesheet no inspetor. Componente Animacao { atual, animacoes:{ nome:{ linha, quadros, fps, repetir } } }.
   Cada clipe = uma linha da imagem (quadroW × quadroH, definidos no Sprite). Tem pré-visualização animada do clipe. */
(function (root) {
  const ed = root.editor, cena = ed.cena;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  let rafPrev = 0;
  function campoNum(rot, v, min, fn, passo) { const d = el('div', 'campo'), l = el('label', null, rot), i = el('input'); i.type = 'number'; i.value = v; i.min = min; if (passo) i.step = passo; i.addEventListener('change', () => fn(Number(i.value))); d.append(l, i); return d; }
  function previa(e, nome) {
    const s = e.Sprite || {}, img = ed.renderer.assets && ed.renderer.assets.get(s.imagem), d = e.Animacao.animacoes[nome]; const c = el('canvas'); c.width = 96; c.height = 96; c.className = 'anim-previa'; c.title = 'pré-visualização do clipe'; c.style.cssText = 'background:#0006;border-radius:6px;image-rendering:pixelated;display:block;margin:6px 0';
    if (!img || !d) return c; const fw = s.quadroW || img.width, fh = s.quadroH || img.height, g = c.getContext('2d'); g.imageSmoothingEnabled = false; const t0 = performance.now(); cancelAnimationFrame(rafPrev);
    const passo = () => { if (!c.isConnected) return; const n = Math.max(1, d.quadros || 1), q = Math.floor((performance.now() - t0) / 1000 * (d.fps || 8)), f = d.repetir === false ? Math.min(q, n - 1) : q % n, k = Math.min(96 / fw, 96 / fh);
      g.clearRect(0, 0, 96, 96); try { g.drawImage(img, f * fw, (d.linha || 0) * fh, fw, fh, (96 - fw * k) / 2, (96 - fh * k) / 2, fw * k, fh * k); } catch (x) {} rafPrev = requestAnimationFrame(passo); };
    rafPrev = requestAnimationFrame(passo); return c;
  }
  function montar(box, e) {
    const s = e.Sprite; if (!s || !s.imagem) return; const g = el('div', 'grupo'), travado = ed.engine.rodando; g.append(el('b', null, 'Animação'));
    const refaz = () => { ed.json(); ed.selecionar(ed.sel); ed.redesenhar(); };
    if (!e.Animacao) { const b = el('button', null, '+ Animação'); b.type = 'button'; b.id = 'an-criar'; b.disabled = travado; b.title = 'Divide a imagem em quadros (quadroW × quadroH) e cria clipes por linha'; b.addEventListener('click', () => { e.Animacao = { atual: 'parado', animacoes: { parado: { linha: 0, quadros: 1, fps: 8, repetir: true } } }; refaz(); }); g.append(b); box.append(g); return; }
    const A = e.Animacao, nomes = Object.keys(A.animacoes || {});
    const sel = el('select'); sel.id = 'an-atual'; sel.title = 'Clipe inicial'; for (const n of nomes) { const o = el('option', null, n); o.value = n; sel.append(o); } sel.value = A.atual; sel.disabled = travado; sel.addEventListener('change', () => { A.atual = sel.value; refaz(); }); g.append(sel);
    for (const n of nomes) {
      const d = A.animacoes[n], linha = el('div', 'grupo'); linha.append(el('b', null, n));
      linha.append(campoNum('linha', d.linha || 0, 0, v => { d.linha = Math.max(0, Math.round(v)); refaz(); }), campoNum('quadros', d.quadros, 1, v => { d.quadros = Math.max(1, Math.round(v)); refaz(); }), campoNum('fps', d.fps || 8, 1, v => { d.fps = Math.max(1, v); refaz(); }));
      const rp = el('input'); rp.type = 'checkbox'; rp.checked = d.repetir !== false; rp.style.width = 'auto'; rp.addEventListener('change', () => { d.repetir = rp.checked; refaz(); }); const rl = el('label', null, 'repetir '); rl.append(rp); linha.append(rl);
      const rm = el('button', null, 'remover clipe'); rm.type = 'button'; rm.disabled = travado || nomes.length < 2; rm.addEventListener('click', () => { delete A.animacoes[n]; if (A.atual === n) A.atual = Object.keys(A.animacoes)[0]; refaz(); }); linha.append(rm); linha.dataset.clipe = n;
      if (n === A.atual) linha.append(previa(e, n)); g.append(linha);
    }
    const novo = el('input'); novo.placeholder = 'novo clipe (ex.: andar)'; novo.id = 'an-nome'; const add = el('button', null, '+ clipe'); add.type = 'button'; add.id = 'an-add'; add.disabled = travado;
    add.addEventListener('click', () => { const n = novo.value.trim(); if (!/^[A-Za-z_][A-Za-z0-9_]{0,30}$/.test(n) || A.animacoes[n]) return; A.animacoes[n] = { linha: nomes.length, quadros: 4, fps: 8, repetir: true }; refaz(); });
    g.append(novo, add); box.append(g);
  }
  root.EditorAnimacao = { montar };
})(window);
