(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Mobile sidebar
  const side = $('#side');
  $('[data-side]') && $('[data-side]').addEventListener('click', (e) => { e.stopPropagation(); side.classList.toggle('open'); });
  document.addEventListener('click', (e) => { if (side && side.classList.contains('open') && !side.contains(e.target)) side.classList.remove('open'); });

  // Confirmations
  document.addEventListener('submit', (e) => { const m = e.target.dataset.confirm; if (m && !confirm(m)) e.preventDefault(); }, true);
  document.addEventListener('click', (e) => { const b = e.target.closest('button[data-confirm]'); if (b && !confirm(b.dataset.confirm)) e.preventDefault(); }, true);

  // Toast
  const toast = (msg) => { const t = document.createElement('div'); t.className = 'flash ok'; t.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:99;box-shadow:0 10px 30px rgba(0,0,0,.15)'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); };

  // Room status quick-change
  $$('[data-autosubmit]').forEach((s) => s.addEventListener('change', async () => {
    const f = s.form;
    const r = await fetch(f.action, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams(new FormData(f)) });
    if (r.ok) { s.dataset.v = s.value; toast(`Status changed to "${s.value}"`); } else f.submit();
  }));

  // Copy links (made absolute with this site's address)
  $$('[data-abs]').forEach((i) => { if (i.value.startsWith('/')) i.value = location.origin + i.value; });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const i = b.parentElement.querySelector('input'); i.select();
    try { await navigator.clipboard.writeText(i.value); } catch (err) { document.execCommand('copy'); }
    const t = b.textContent; b.textContent = 'Copied!'; setTimeout(() => (b.textContent = t), 1400);
  });

  // Drag-to-reorder table rows
  $$('[data-sortable]').forEach((table) => {
    const tbody = $('tbody', table); let drag = null;
    tbody.addEventListener('dragstart', (e) => { drag = e.target.closest('tr'); drag.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    tbody.addEventListener('dragover', (e) => {
      e.preventDefault(); const tr = e.target.closest('tr'); if (!tr || tr === drag) return;
      const r = tr.getBoundingClientRect(); tbody.insertBefore(drag, e.clientY > r.top + r.height / 2 ? tr.nextSibling : tr);
    });
    tbody.addEventListener('dragend', async () => {
      drag.classList.remove('dragging'); drag = null;
      const ids = $$('tr', tbody).map((tr) => tr.dataset.id);
      await fetch(table.dataset.sortable, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      toast('Order saved');
    });
  });

  // Image fields: preview, focal point, remove, reorder
  $$('[data-imgfield]').forEach((field) => {
    const multi = field.dataset.multi === '1';
    const hidden = $('[data-json]', field), list = $('[data-list]', field), input = $('input[type=file]', field);
    let items = []; try { const v = JSON.parse(hidden.value || 'null'); items = multi ? (v || []) : (v ? [v] : []); } catch (e) {}
    let pending = new DataTransfer();
    const sync = () => { hidden.value = JSON.stringify(multi ? items : (items[0] || null)); };
    const render = () => {
      list.innerHTML = '';
      items.forEach((im, i) => {
        const box = document.createElement('div'); box.className = 'imgbox'; box.draggable = multi; box.dataset.i = i;
        box.innerHTML = `<div class="pic" title="Click to set the focal point"><img src="${esc(im.src)}" style="object-position:${im.x}% ${im.y}%"><span class="fp" style="left:${im.x}%;top:${im.y}%"></span>${multi && i === 0 ? '<span class="cover">Cover</span>' : ''}</div><div class="bar">${multi ? '<span class="mv">⇅ drag</span>' : '<span>Click photo to set focus</span>'}<button type="button" data-rm>Remove</button></div>`;
        $('.pic', box).addEventListener('click', (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          im.x = Math.round(((e.clientX - r.left) / r.width) * 100); im.y = Math.round(((e.clientY - r.top) / r.height) * 100);
          $('.fp', box).style.left = im.x + '%'; $('.fp', box).style.top = im.y + '%'; $('img', box).style.objectPosition = `${im.x}% ${im.y}%`; sync(); markDirty();
        });
        $('[data-rm]', box).addEventListener('click', () => { items.splice(i, 1); sync(); render(); markDirty(); });
        list.appendChild(box);
      });
      [...pending.files].forEach((f, i) => {
        const box = document.createElement('div'); box.className = 'imgbox';
        box.innerHTML = `<div class="pic" style="cursor:default"><img src="${URL.createObjectURL(f)}"><span class="cover" style="background:var(--pink)">New</span></div><div class="bar"><span>Save to set focus</span><button type="button">Remove</button></div>`;
        $('button', box).addEventListener('click', () => { const dt = new DataTransfer(); [...pending.files].forEach((x, j) => j !== i && dt.items.add(x)); pending = dt; input.files = pending.files; render(); });
        list.appendChild(box);
      });
    };
    if (multi) {
      let from = null;
      list.addEventListener('dragstart', (e) => { const b = e.target.closest('.imgbox'); if (!b || b.dataset.i === undefined) return; from = Number(b.dataset.i); b.classList.add('dragging'); });
      list.addEventListener('dragover', (e) => e.preventDefault());
      list.addEventListener('drop', (e) => { e.preventDefault(); const b = e.target.closest('.imgbox'); if (from === null || !b || b.dataset.i === undefined) return; const to = Number(b.dataset.i); const [m] = items.splice(from, 1); items.splice(to, 0, m); from = null; sync(); render(); markDirty(); });
      list.addEventListener('dragend', () => { from = null; $$('.dragging', list).forEach((x) => x.classList.remove('dragging')); });
    }
    const adder = $('[data-adder]', field);
    ['dragenter', 'dragover'].forEach((ev) => adder.addEventListener(ev, () => adder.classList.add('over')));
    ['dragleave', 'drop'].forEach((ev) => adder.addEventListener(ev, () => adder.classList.remove('over')));
    input.addEventListener('change', () => {
      if (multi) { [...input.files].forEach((f) => pending.items.add(f)); input.files = pending.files; }
      else { pending = new DataTransfer(); if (input.files[0]) pending.items.add(input.files[0]); }
      render(); markDirty();
    });
    render();
  });

  // File fields
  $$('[data-filefield]').forEach((f) => {
    const inp = $('[data-fileinput]', f);
    inp.addEventListener('change', () => { if (inp.files[0]) { $('[data-name]', f).textContent = `${inp.files[0].name} (new, click Save)`; $('[data-name]', f).classList.remove('muted'); } });
  });

  // Reset content fields to original
  $$('[data-reset]').forEach((b) => b.addEventListener('click', () => {
    const wrap = b.closest('.cfield'); $(`[name="${b.dataset.reset}__reset"]`, wrap).value = '1';
    wrap.style.opacity = .45; b.textContent = 'Will reset when you save'; markDirty();
  }));

  // Unsaved changes warning
  let dirty = false; const markDirty = () => { dirty = true; };
  $$('form[data-dirty]').forEach((f) => { f.addEventListener('input', markDirty); f.addEventListener('submit', () => { dirty = false; }); });
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
})();
