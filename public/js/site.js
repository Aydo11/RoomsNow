(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const isAdmin = document.body.classList.contains('is-admin');

  // Split headings into words for the rise-in animation
  if (!isAdmin) $$('[data-split]').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span'); o.className = 'w';
            const s = document.createElement('span'); s.textContent = w; s.style.setProperty('--i', i++);
            o.appendChild(s); frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  });
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('ready')));

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-reveal]').forEach((el) => io.observe(el));

  // Header behaviour + progress bar
  const header = $('.site-header'), prog = $('.progress');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 20);
    header.classList.toggle('hide', y > 400 && y > lastY + 4 && !document.body.classList.contains('menu-open'));
    if (y < lastY - 4) header.classList.remove('hide');
    lastY = y;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    timelines.forEach((t) => {
      const r = t.getBoundingClientRect();
      const p = Math.min(Math.max((innerHeight * 0.6 - r.top) / r.height, 0), 1);
      t.style.setProperty('--prog', p);
    });
    if (!reduce) parallax.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate3d(0, ${((r.top + r.height / 2) - innerHeight / 2) * -Number(el.dataset.parallax)}px, 0)`;
    });
  };
  const timelines = $$('[data-timeline]');
  const parallax = $$('[data-parallax]');
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  // Mobile menu
  const mnav = $('#mnav');
  const openBtn = $('[data-menu-open]');
  const setMenu = (open) => {
    mnav.classList.toggle('open', open); document.body.classList.toggle('menu-open', open);
    mnav.setAttribute('aria-hidden', !open); openBtn && openBtn.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(() => $('a', mnav).focus(), 300);
  };
  openBtn && openBtn.addEventListener('click', () => setMenu(true));
  $('[data-menu-close]') && $('[data-menu-close]').addEventListener('click', () => setMenu(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { setMenu(false); closeLb(); } });

  // Magnetic buttons + card spotlight
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('mousemove', (e) => { const r = b.getBoundingClientRect(); b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.18}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`; });
      b.addEventListener('mouseleave', () => { b.style.translate = ''; });
    });
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.spot'); if (!c) return;
      const r = c.getBoundingClientRect(); c.style.setProperty('--mx', `${e.clientX - r.left}px`); c.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  // Tabs (events)
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
    $$('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; if (!p.hidden) $$('[data-reveal]', p).forEach((el) => el.classList.add('in')); });
  }));

  // Room filters
  const grid = $('[data-rooms]');
  if (grid) {
    const state = { status: '', area: '', type: '' };
    const apply = () => {
      let n = 0;
      $$('.room-card', grid).forEach((c) => {
        const ok = (!state.status || c.dataset.status === state.status) && (!state.area || c.dataset.area === state.area) && (!state.type || c.dataset.type === state.type);
        c.classList.toggle('hidden', !ok); if (ok) { n++; c.classList.add('in'); }
      });
      $('[data-count]').textContent = `${n} room${n === 1 ? '' : 's'}`;
      $('[data-none]').hidden = n > 0;
    };
    $$('[data-filter-status]').forEach((b) => b.addEventListener('click', () => { $$('[data-filter-status]').forEach((x) => x.classList.toggle('on', x === b)); state.status = b.dataset.filterStatus; apply(); }));
    const a = $('[data-filter-area]'), t = $('[data-filter-type]');
    a && a.addEventListener('change', () => { state.area = a.value; apply(); });
    t && t.addEventListener('change', () => { state.type = t.value; apply(); });
  }

  // Lightbox
  const lb = $('#lightbox'); let list = [], idx = 0;
  const show = () => { $('img', lb).src = list[idx]; $('.cnt', lb).textContent = `${idx + 1} / ${list.length}`; $('.prev', lb).hidden = $('.next', lb).hidden = list.length < 2; };
  function closeLb() { if (lb && lb.classList.contains('open')) { lb.classList.remove('open'); document.body.style.overflow = ''; } }
  $$('[data-gallery]').forEach((g) => {
    const data = $('[data-lb-list]', g);
    const srcs = data ? JSON.parse(data.textContent) : $$('img', g).map((i) => i.src);
    $$('[data-lb]', g).forEach((b) => b.addEventListener('click', () => { if (document.body.classList.contains('editing')) return; list = srcs; idx = Number(b.dataset.lb); show(); lb.classList.add('open'); document.body.style.overflow = 'hidden'; }));
  });
  if (lb) {
    $('[data-lb-close]', lb).addEventListener('click', closeLb);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
    $('[data-lb-prev]', lb).addEventListener('click', () => { idx = (idx - 1 + list.length) % list.length; show(); });
    $('[data-lb-next]', lb).addEventListener('click', () => { idx = (idx + 1) % list.length; show(); });
    addEventListener('keydown', (e) => { if (!lb.classList.contains('open')) return; if (e.key === 'ArrowLeft') $('[data-lb-prev]', lb).click(); if (e.key === 'ArrowRight') $('[data-lb-next]', lb).click(); });
  }

  // File drop zones with previews
  $$('[data-drop]').forEach((zone) => {
    const input = $('input[type=file]', zone), prev = zone.parentElement.querySelector('[data-previews]');
    ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.add('over')));
    ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove('over')));
    input.addEventListener('change', () => {
      prev.innerHTML = '';
      [...input.files].forEach((f) => {
        const d = document.createElement('div');
        if (f.type.startsWith('image/')) { const i = new Image(); i.src = URL.createObjectURL(f); d.appendChild(i); } else d.textContent = f.name;
        prev.appendChild(d);
      });
      $('b', zone).textContent = input.files.length ? `${input.files.length} file${input.files.length > 1 ? 's' : ''} selected` : 'Add files';
    });
  });

  // Prevent double submission
  $$('form').forEach((f) => f.addEventListener('submit', () => { const b = $('button[type=submit]', f); if (b) { setTimeout(() => { b.disabled = true; b.style.opacity = .7; }, 0); } }));
})();
