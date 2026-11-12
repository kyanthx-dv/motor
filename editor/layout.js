/* Editor · layout (visual apenas): abas, divisórias e tamanhos persistidos. */
(function () {
  const KEY = 'motor.editor.layout.v1';
  const shell = document.querySelector('.editor-shell');
  const work = document.querySelector('.work-area');
  const read = () => { try { const x = JSON.parse(localStorage.getItem(KEY) || '{}'); return x && typeof x === 'object' ? x : {}; } catch (e) { return {}; } };
  const write = x => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch (e) {} };
  const state = Object.assign({ left: 240, right: 300, bottom: 260 }, read());
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)));
  function apply() {
    state.left = clamp(state.left, 160, Math.max(160, innerWidth * .45));
    state.right = clamp(state.right, 220, Math.max(220, innerWidth * .45));
    state.bottom = clamp(state.bottom, 150, Math.max(150, innerHeight * .65));
    document.documentElement.style.setProperty('--left-w', state.left + 'px');
    document.documentElement.style.setProperty('--right-w', state.right + 'px');
    document.documentElement.style.setProperty('--bottom-h', state.bottom + 'px');
    write(state);
  }
  function splitter(kind) {
    const el = document.createElement('div'); el.className = 'splitter splitter-' + kind + ' splitter-' + (kind === 'h' ? 'bottom' : kind === 'left' ? 'left' : 'right'); el.setAttribute('aria-hidden', 'true');
    let start = 0, base = 0;
    const move = ev => { if (kind === 'h') state.bottom = base - (ev.clientY - start); else if (kind === 'left') state.left = base + ev.clientX - start; else state.right = base - (ev.clientX - start); apply(); };
    el.addEventListener('pointerdown', ev => { if (matchMedia('(max-width: 700px)').matches) return; start = kind === 'h' ? ev.clientY : ev.clientX; base = kind === 'h' ? state.bottom : kind === 'left' ? state.left : state.right; el.classList.add('dragging'); el.setPointerCapture?.(ev.pointerId); el.addEventListener('pointermove', move); });
    const stop = () => { el.classList.remove('dragging'); el.removeEventListener('pointermove', move); write(state); };
    el.addEventListener('pointerup', stop); el.addEventListener('pointercancel', stop); return el;
  }
  function tabs() {
    document.querySelectorAll('.dock-tab').forEach(button => button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.tabTarget), group = button.closest('.tree-dock,.bottom-dock'); if (!target || !group) return;
      group.querySelectorAll('.dock-tab').forEach(b => b.classList.toggle('active', b === button));
      group.querySelectorAll('.dock-pane,.bottom-pane').forEach(p => { const active = p === target; p.hidden = !active; p.classList.toggle('active', active); });
    }));
    document.querySelectorAll('[data-mobile-pane]').forEach(button => button.addEventListener('click', () => shell.dataset.mobilePane = button.dataset.mobilePane));
    document.addEventListener('focusin', ev => { const pane = ev.target.closest?.('.bottom-pane[hidden]'); if (!pane) return; pane.hidden = false; pane.classList.add('active'); });
  }
  apply(); tabs(); shell.dataset.mobilePane = 'canvas'; work.append(splitter('left'), splitter('right')); shell.append(splitter('h')); window.addEventListener('resize', () => { document.querySelector('.bottom-dock').scrollTop = 0; document.querySelectorAll('.bottom-pane').forEach(p => p.scrollTop = 0); apply(); if (innerHeight > 1200) document.documentElement.style.setProperty('--bottom-h', '700px'); });
  window.EditorLayout = { read, save: () => write(state), apply };
})();
