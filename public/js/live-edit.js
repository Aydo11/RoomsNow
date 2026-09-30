(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const btn = $('[data-edit-toggle]');
  const hint = document.createElement('div'); hint.className = 'le-hint'; hint.textContent = 'Editing: click any outlined text or image. Changes save automatically.'; document.body.appendChild(hint);
  const toast = (m, err) => { const t = document.createElement('div'); t.className = 'le-toast' + (err ? ' err' : ''); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2000); };
  const post = (url, body) => fetch(url, body instanceof FormData ? { method: 'POST', body } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  let on = false;
  const set = (v) => {
    on = v; document.body.classList.toggle('editing', on); btn.classList.toggle('on', on);
    btn.lastChild.textContent = on ? 'Finish editing' : 'Edit this page';
    $$('[data-cms]').forEach((el) => { if (on) { el.setAttribute('contenteditable', 'plaintext-only'); if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'; el.dataset.orig = el.textContent; } else el.removeAttribute('contenteditable'); });
    try { sessionStorage.setItem('sh-edit', on ? '1' : ''); } catch (e) {}
  };
  btn.addEventListener('click', () => set(!on));
  let start = false; try { start = sessionStorage.getItem('sh-edit') === '1'; } catch (e) {}
  if (new URLSearchParams(location.search).get('edit') === '1' || start) set(true);

  // Stop links navigating while editing
  document.addEventListener('click', (e) => {
    if (!on || e.target.closest('#adminBar') || e.target.closest('.le-modal')) return;
    const a = e.target.closest('a, button'); const edit = e.target.closest('[data-cms],[data-cms-rich],[data-cms-img]');
    if (a && (edit || a.tagName === 'A')) e.preventDefault();
  }, true);

  // Inline text
  document.addEventListener('keydown', (e) => { if (on && e.key === 'Enter' && e.target.matches('[data-cms]')) { e.preventDefault(); e.target.blur(); } });
  document.addEventListener('focusout', async (e) => {
    const el = e.target; if (!on || !el.matches || !el.matches('[data-cms]')) return;
    const value = el.textContent.trim(); if (value === el.dataset.orig) return;
    const r = await post('/admin/api/content', { key: el.dataset.cms, value }).catch(() => null);
    if (r && r.ok) { el.dataset.orig = value; $$(`[data-cms="${el.dataset.cms}"]`).forEach((x) => x !== el && (x.textContent = value)); toast('Saved'); } else toast('Could not save. Are you still logged in?', true);
  });

  const modal = (html) => { const m = document.createElement('div'); m.className = 'le-modal'; m.innerHTML = `<div class="le-box">${html}</div>`; document.body.appendChild(m); m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); }); return m; };

  // Rich text blocks
  document.addEventListener('click', (e) => {
    const el = on && e.target.closest('[data-cms-rich]'); if (!el) return;
    e.preventDefault();
    const m = modal(`<h3>Edit text</h3><textarea></textarea><div class="fmt">Blank line = new paragraph · start a line with "- " for bullets · **bold** · [link text](https://...)</div><div class="row"><button class="btn ghost sm" data-x type="button">Cancel</button><button class="btn sm" data-save type="button">Save</button></div>`);
    const ta = $('textarea', m); ta.value = el.dataset.raw || ''; ta.focus();
    $('[data-save]', m).addEventListener('click', async () => {
      const r = await post('/admin/api/content', { key: el.dataset.cmsRich, value: ta.value }).catch(() => null);
      if (r && r.ok) { el.innerHTML = r.html; el.dataset.raw = ta.value; m.remove(); toast('Saved'); } else toast('Could not save', true);
    });
  });

  // Images: replace + focal point
  document.addEventListener('click', (e) => {
    const img = on && e.target.closest('[data-cms-img]'); if (!img) return;
    e.preventDefault(); e.stopPropagation();
    let x = Number(img.dataset.x || 50), y = Number(img.dataset.y || 50), file = null;
    const m = modal(`<h3>Change image</h3><p style="margin:0 0 12px;color:#647984;font-size:.9rem">Click the photo to choose the part that should always stay visible. Upload a new photo to replace it.</p>
      <div class="le-pic"><img src="${img.getAttribute('src')}"><span class="fp"></span></div>
      <p style="margin:10px 0 4px;font-size:.8rem;color:#647984">How it will crop on different screens:</p><div class="le-previews"><div><img></div><div style="flex:.5"><img></div><div style="flex:2"><img></div></div>
      <div class="row" style="justify-content:space-between"><label class="btn navy sm" style="position:relative;overflow:hidden">Upload new photo<input type="file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><span><button class="btn ghost sm" data-x type="button">Cancel</button> <button class="btn sm" data-save type="button">Save</button></span></div>`);
    const pic = $('.le-pic', m), fp = $('.fp', m);
    const paint = () => { fp.style.left = x + '%'; fp.style.top = y + '%'; $$('img', m).forEach((i) => (i.style.objectPosition = `${x}% ${y}%`)); };
    const setSrc = (s) => $$('img', m).forEach((i) => (i.src = s));
    setSrc(img.getAttribute('src')); paint();
    pic.addEventListener('click', (ev) => { const r = pic.getBoundingClientRect(); x = Math.round((ev.clientX - r.left) / r.width * 100); y = Math.round((ev.clientY - r.top) / r.height * 100); paint(); });
    $('input[type=file]', m).addEventListener('change', (ev) => { file = ev.target.files[0]; if (file) { setSrc(URL.createObjectURL(file)); x = y = 50; paint(); } });
    $('[data-save]', m).addEventListener('click', async () => {
      const fd = new FormData(); fd.append('key', img.dataset.cmsImg); fd.append('x', x); fd.append('y', y); if (file) fd.append('file', file);
      const r = await post('/admin/api/content-image', fd).catch(() => null);
      if (r && r.ok) { $$(`[data-cms-img="${img.dataset.cmsImg}"]`).forEach((i) => { i.src = r.img.src; i.style.objectPosition = `${r.img.x}% ${r.img.y}%`; i.dataset.x = r.img.x; i.dataset.y = r.img.y; }); m.remove(); toast('Image saved'); }
      else toast('Could not save image', true);
    });
  }, true);
})();
