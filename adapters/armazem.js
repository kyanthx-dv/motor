/* Adapter · armazém de partidas. Interface: get(chave) -> string|null, set(chave, texto), remove(chave), has(chave).
   C.Armazem.memoria() (padrão do motor, some ao fechar) e C.Armazem.navegador(prefixo) (localStorage; se falhar, cai para memória). */
(function (root) {
  const C = root.Core = root.Core || {};
  const memoria = () => { const m = new Map(); return { get: k => (m.has(k) ? m.get(k) : null), set: (k, v) => { m.set(k, String(v)); }, remove: k => { m.delete(k); }, has: k => m.has(k) }; };
  C.Armazem = {
    memoria,
    navegador(prefixo) {
      const mem = memoria(); let ls = null; try { ls = root.localStorage; ls.getItem('x'); } catch (e) { ls = null; }
      return {
        get: k => { try { return ls ? ls.getItem(prefixo + k) : mem.get(k); } catch (e) { return mem.get(k); } },
        set: (k, v) => { try { if (ls) ls.setItem(prefixo + k, String(v)); else mem.set(k, v); } catch (e) { mem.set(k, v); throw new Error('não deu para gravar a partida (armazenamento cheio ou bloqueado)'); } },
        remove: k => { try { if (ls) ls.removeItem(prefixo + k); } catch (e) {} mem.remove(k); },
        has: k => { try { return ls ? ls.getItem(prefixo + k) !== null : mem.has(k); } catch (e) { return mem.has(k); } }
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
