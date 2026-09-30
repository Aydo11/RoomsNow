const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { db, Items, Settings, Content, UPLOAD_DIR } = require('./db');
const { COLLECTIONS, ICONS } = require('./collections');
const { PAGES, DEFAULTS, FIELD_INDEX, SETTINGS } = require('./content');
const U = require('./util');
const mail = require('./mail');

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, f, cb) => {
      const base = U.slugify(path.basename(f.originalname, path.extname(f.originalname))).slice(0, 40);
      cb(null, `${base}-${crypto.randomBytes(4).toString('hex')}${path.extname(f.originalname).toLowerCase().replace(/[^.\w]/g, '')}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, f, cb) => cb(null, /\.(jpe?g|png|webp|gif|svg|avif|pdf|docx?|xlsx?|pptx?|odt|rtf|txt|csv)$/i.test(f.originalname)),
});
const fileObj = (f) => ({ src: `/uploads/${f.filename}`, name: f.originalname, size: f.size });

// ---------- Security ----------
router.use((req, res, next) => {
  if (req.method === 'POST') {
    const origin = req.get('origin');
    if (origin && new URL(origin).host !== req.get('host')) return res.status(403).send('Forbidden');
  }
  res.set('Cache-Control', 'no-store');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.locals.flash = req.session.flash; delete req.session.flash;
  res.locals.COLLECTIONS = COLLECTIONS; res.locals.PAGES = PAGES; res.locals.ICONS = ICONS;
  res.locals.newCount = db.prepare("SELECT COUNT(*) n FROM submissions WHERE status = 'new'").get().n;
  next();
});
const nextRef = () => { const n = Items.list('rooms', { all: true }).map((r) => Number((String(r.ref || '').match(/(\d+)$/) || [])[1]) || 0); return `SH-${Math.max(100, ...n) + 1}`; };
const flash = (req, type, msg) => { req.session.flash = { type, msg }; };
const userCount = () => db.prepare('SELECT COUNT(*) n FROM users').get().n;

const attempts = new Map();
router.get('/setup', (req, res) => (userCount() ? res.redirect('/admin/login') : res.render('admin/login', { setup: true, error: null })));
router.post('/setup', (req, res) => {
  if (userCount()) return res.redirect('/admin/login');
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) return res.render('admin/login', { setup: true, error: 'Please fill in every field. Passwords need at least 8 characters.' });
  const info = db.prepare('INSERT INTO users (name, email, hash) VALUES (?,?,?)').run(name.trim(), email.trim().toLowerCase(), bcrypt.hashSync(password, 10));
  req.session.uid = info.lastInsertRowid; req.session.name = name.trim();
  flash(req, 'ok', 'Welcome! Your admin account is ready.');
  res.redirect('/admin');
});
router.get('/login', (req, res) => (userCount() ? res.render('admin/login', { setup: false, error: null }) : res.redirect('/admin/setup')));
router.post('/login', (req, res) => {
  const key = req.ip; const a = (attempts.get(key) || []).filter((t) => Date.now() - t < 15 * 60 * 1000);
  if (a.length >= 8) return res.render('admin/login', { setup: false, error: 'Too many attempts. Please wait 15 minutes.' });
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(req.body.email || '').trim().toLowerCase());
  if (!u || !bcrypt.compareSync(String(req.body.password || ''), u.hash)) { a.push(Date.now()); attempts.set(key, a); return res.render('admin/login', { setup: false, error: 'Email or password not recognised.' }); }
  attempts.delete(key);
  req.session.uid = u.id; req.session.name = u.name;
  res.redirect(String(req.query.next || '/admin').startsWith('/') ? String(req.query.next || '/admin') : '/admin');
});
router.get('/logout', (req, res) => { req.session = null; res.redirect('/'); });

router.use((req, res, next) => {
  if (!req.session.uid) return res.redirect(userCount() ? `/admin/login?next=${encodeURIComponent(req.originalUrl)}` : '/admin/setup');
  res.locals.user = { id: req.session.uid, name: req.session.name };
  next();
});

// ---------- Dashboard ----------
router.get('/', (req, res) => {
  const rooms = Items.list('rooms', { all: true });
  const events = Items.list('events').filter((e) => e.date >= U.today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5)
    .map((e) => ({ ...e, taken: db.prepare("SELECT COUNT(*) n FROM registrations WHERE event_id = ? AND status='confirmed'").get(e.id).n }));
  const samples = db.prepare("SELECT COUNT(*) n FROM items WHERE json_extract(data, '$.sample') = 1").get().n;
  res.render('admin/dashboard', {
    stats: {
      available: rooms.filter((r) => r.published && r.status === 'Available now').length,
      soon: rooms.filter((r) => r.published && (r.status === 'Available soon' || r.status === 'Under offer')).length,
      newSubs: res.locals.newCount,
      clicks: db.prepare("SELECT COUNT(*) n FROM clicks WHERE created_at > datetime('now','-30 days')").get().n,
      subscribers: db.prepare('SELECT COUNT(*) n FROM subscribers').get().n,
    },
    events, samples,
    recent: db.prepare('SELECT * FROM submissions ORDER BY id DESC LIMIT 6').all(),
    emailReady: !!(Settings.get('smtp_host') && Settings.get('smtp_user')),
  });
});
router.post('/remove-samples', (req, res) => {
  const n = db.prepare("DELETE FROM items WHERE json_extract(data, '$.sample') = 1").run().changes;
  flash(req, 'ok', `Removed ${n} sample item(s). The website now only shows your own content.`);
  res.redirect('/admin');
});

// ---------- Generic collections ----------
function collectionOr404(req, res, next) {
  const c = COLLECTIONS[req.params.c]; if (!c) return res.status(404).send('Not found');
  res.locals.c = c; res.locals.cid = req.params.c; next();
}
router.get('/c/:c', collectionOr404, (req, res) => {
  let items = Items.list(req.params.c, { all: true });
  if (req.params.c === 'events') items = items.sort((a, b) => String(b.date).localeCompare(String(a.date))).map((e) => ({ ...e, taken: db.prepare("SELECT COUNT(*) n FROM registrations WHERE event_id = ? AND status='confirmed'").get(e.id).n }));
  if (['stories', 'news'].includes(req.params.c)) items = items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const clicks = {};
  if (req.params.c === 'rooms') for (const r of db.prepare('SELECT room_id, COUNT(*) n FROM clicks WHERE room_id IS NOT NULL GROUP BY room_id').all()) clicks[r.room_id] = r.n;
  res.render('admin/list', { items, clicks, q: req.query.q || '' });
});
router.get('/c/:c/new', collectionOr404, (req, res) => {
  const item = { published: true };
  for (const f of res.locals.c.fields) if (f.default !== undefined) item[f.name] = f.default;
  res.render('admin/edit', { item, isNew: true });
});
router.get('/c/:c/:id', collectionOr404, (req, res) => {
  const item = Items.get(Number(req.params.id));
  if (!item) return res.redirect(`/admin/c/${req.params.c}`);
  res.render('admin/edit', { item, isNew: false });
});

function readForm(c, body, files, current = {}) {
  const data = {}; const byField = {};
  for (const f of files || []) (byField[f.fieldname] = byField[f.fieldname] || []).push(f);
  for (const f of c.fields) {
    const v = body[f.name];
    switch (f.type) {
      case 'checkbox': data[f.name] = v === 'on' || v === '1' || v === 'true'; break;
      case 'number': data[f.name] = v === '' || v == null ? '' : Math.max(0, Number(v) || 0); break;
      case 'list': data[f.name] = String(v || '').split('\n').map((s) => s.trim()).filter(Boolean); break;
      case 'image': {
        let im = null; try { im = JSON.parse(body[`${f.name}__json`] || 'null'); } catch (e) {}
        const nf = (byField[`${f.name}__new`] || [])[0];
        if (nf) im = { src: `/uploads/${nf.filename}`, x: 50, y: 50 };
        data[f.name] = im && im.src ? { src: im.src, x: Number(im.x ?? 50), y: Number(im.y ?? 50) } : null; break;
      }
      case 'images': {
        let arr = []; try { arr = JSON.parse(body[`${f.name}__json`] || '[]') || []; } catch (e) {}
        for (const nf of byField[`${f.name}__new`] || []) arr.push({ src: `/uploads/${nf.filename}`, x: 50, y: 50 });
        data[f.name] = arr.filter((i) => i && i.src).map((i) => ({ src: i.src, x: Number(i.x ?? 50), y: Number(i.y ?? 50) })); break;
      }
      case 'file': {
        let fo = null; try { fo = JSON.parse(body[`${f.name}__json`] || 'null'); } catch (e) {}
        const nf = (byField[`${f.name}__new`] || [])[0];
        if (nf) fo = fileObj(nf);
        data[f.name] = fo && fo.src ? fo : null; break;
      }
      default: data[f.name] = String(v == null ? '' : v).trim();
    }
  }
  if (current.sample && !body.clear_sample) data.sample = true;
  return data;
}

router.post('/c/:c/reorder', collectionOr404, (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  db.transaction(() => ids.forEach((id, i) => Items.setSort(Number(id), i)))();
  res.json({ ok: true });
});
const saveItem = (req, res) => {
  const cid = req.params.c, c = res.locals.c;
  const id = req.params.id && req.params.id !== 'new' ? Number(req.params.id) : null;
  const current = id ? Items.get(id) : {};
  const data = readForm(c, req.body, req.files, current || {});
  const titleVal = data[c.titleField] || 'Untitled';
  let published = req.body.published === 'on';
  const missing = c.fields.filter((f) => f.required && f.type !== 'checkbox' && (data[f.name] === '' || data[f.name] == null)).map((f) => f.label);
  if (missing.length) { flash(req, 'err', `Please complete: ${missing.join(', ')}`); req.session.draft = data; }
  let warn = '';
  if (cid === 'stories' && published && !data.consent) { published = false; warn = ' It has been saved as hidden because the consent box is not ticked.'; }
  let item;
  const slug = U.slugify(req.body.slug || titleVal);
  if (id) item = Items.update(id, data, { slug: req.body.slug ? slug : undefined, published });
  else item = Items.create(cid, data, { slug, published, sort: 0 });
  if (cid === 'rooms' && !item.ref) item = Items.patch(item.id, { ref: nextRef() });
  if (!missing.length) flash(req, warn ? 'err' : 'ok', `${c.singular} saved.${warn}`);
  res.redirect(req.body.after === 'list' ? `/admin/c/${cid}` : `/admin/c/${cid}/${item.id}`);
};
router.post('/c/:c', collectionOr404, upload.any(), saveItem);
router.post('/c/:c/:id', collectionOr404, upload.any(), saveItem);
router.post('/c/:c/:id/delete', collectionOr404, (req, res) => {
  Items.remove(Number(req.params.id)); flash(req, 'ok', `${res.locals.c.singular} deleted.`); res.redirect(`/admin/c/${req.params.c}`);
});
router.post('/c/:c/:id/duplicate', collectionOr404, (req, res) => {
  const it = Items.get(Number(req.params.id)); if (!it) return res.redirect(`/admin/c/${req.params.c}`);
  const { id, slug, sort, published, created_at, updated_at, ...data } = it;
  data[res.locals.c.titleField] = `${data[res.locals.c.titleField]} (copy)`;
  if (req.params.c === 'rooms') data.ref = '';
  let n = Items.create(req.params.c, data, { slug: U.slugify(data[res.locals.c.titleField]), published: false });
  if (req.params.c === 'rooms') n = Items.patch(n.id, { ref: nextRef() });
  flash(req, 'ok', 'Copy created (hidden until you publish it).'); res.redirect(`/admin/c/${req.params.c}/${n.id}`);
});
router.post('/c/:c/:id/toggle', collectionOr404, (req, res) => {
  const it = Items.get(Number(req.params.id));
  if (it) {
    if (req.params.c === 'stories' && !it.published && !it.consent) flash(req, 'err', 'Tick the consent box on this story before publishing it.');
    else Items.setPublished(it.id, !it.published);
  }
  res.redirect(req.get('referer') || `/admin/c/${req.params.c}`);
});
router.post('/c/rooms/:id/status', (req, res) => {
  const opts = COLLECTIONS.rooms.fields.find((f) => f.name === 'status').options;
  if (opts.includes(req.body.status)) Items.patch(Number(req.params.id), { status: req.body.status });
  if (req.xhr || req.get('accept') === 'application/json') return res.json({ ok: true });
  flash(req, 'ok', 'Room status updated.'); res.redirect('/admin/c/rooms');
});

// ---------- Event registrations ----------
router.get('/events/:id/registrations', (req, res) => {
  const ev = Items.get(Number(req.params.id)); if (!ev) return res.redirect('/admin/c/events');
  const regs = db.prepare('SELECT * FROM registrations WHERE event_id = ? ORDER BY status, id').all(ev.id);
  res.render('admin/registrations', { ev, regs, confirmed: regs.filter((r) => r.status === 'confirmed').length });
});
router.post('/events/:id/registrations', (req, res) => {
  const ev = Items.get(Number(req.params.id)); if (!ev) return res.redirect('/admin/c/events');
  if (req.body.name) db.prepare('INSERT INTO registrations (event_id, name, email, phone, notes) VALUES (?,?,?,?,?)').run(ev.id, req.body.name, req.body.email || '', req.body.phone || '', req.body.notes || '');
  const n = db.prepare("SELECT COUNT(*) n FROM registrations WHERE event_id = ? AND status='confirmed'").get(ev.id).n;
  flash(req, n > (Number(ev.capacity) || Infinity) ? 'err' : 'ok', n > (Number(ev.capacity) || Infinity) ? 'Added, note this event is now over capacity.' : 'Registration added.');
  res.redirect(`/admin/events/${ev.id}/registrations`);
});
router.post('/registrations/:rid/:action', (req, res) => {
  const r = db.prepare('SELECT * FROM registrations WHERE id = ?').get(Number(req.params.rid)); if (!r) return res.redirect('/admin/c/events');
  if (req.params.action === 'cancel') db.prepare("UPDATE registrations SET status='cancelled' WHERE id = ?").run(r.id);
  if (req.params.action === 'restore') db.prepare("UPDATE registrations SET status='confirmed' WHERE id = ?").run(r.id);
  if (req.params.action === 'attended') db.prepare("UPDATE registrations SET status='attended' WHERE id = ?").run(r.id);
  if (req.params.action === 'delete') db.prepare('DELETE FROM registrations WHERE id = ?').run(r.id);
  res.redirect(`/admin/events/${r.event_id}/registrations`);
});
const csv = (rows) => rows.map((r) => r.map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
router.get('/events/:id/registrations.csv', (req, res) => {
  const ev = Items.get(Number(req.params.id)); if (!ev) return res.sendStatus(404);
  const regs = db.prepare('SELECT * FROM registrations WHERE event_id = ? ORDER BY id').all(ev.id);
  res.attachment(`${ev.slug}-registrations.csv`).type('text/csv').send(csv([['Name', 'Phone', 'Email', 'Notes', 'Status', 'Registered'], ...regs.map((r) => [r.name, r.phone, r.email, r.notes, r.status, r.created_at])]));
});

// ---------- Inbox ----------
router.get('/inbox', (req, res) => {
  const type = req.query.type || ''; const status = req.query.status || '';
  let sql = 'SELECT * FROM submissions WHERE 1=1'; const p = [];
  if (type) { sql += ' AND type = ?'; p.push(type); }
  if (status) { sql += ' AND status = ?'; p.push(status); }
  const rows = db.prepare(sql + ' ORDER BY id DESC LIMIT 500').all(...p);
  const counts = {}; for (const r of db.prepare("SELECT type, COUNT(*) n FROM submissions WHERE status='new' GROUP BY type").all()) counts[r.type] = r.n;
  res.render('admin/inbox', { rows, type, status, counts, LABELS: mail.LABELS });
});
router.get('/inbox/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM submissions WHERE id = ?').get(Number(req.params.id)); if (!s) return res.redirect('/admin/inbox');
  if (s.status === 'new') { db.prepare("UPDATE submissions SET status = 'open' WHERE id = ?").run(s.id); s.status = 'open'; }
  res.render('admin/submission', { s, data: JSON.parse(s.data), files: JSON.parse(s.files), LABELS: mail.LABELS });
});
router.post('/inbox/:id', (req, res) => {
  const id = Number(req.params.id);
  if (req.body.action === 'delete') {
    const s = db.prepare('SELECT files FROM submissions WHERE id = ?').get(id);
    if (s) for (const f of JSON.parse(s.files)) fs.rm(path.join(UPLOAD_DIR, 'private', path.basename(f.src)), () => {});
    db.prepare('DELETE FROM submissions WHERE id = ?').run(id); flash(req, 'ok', 'Deleted.'); return res.redirect('/admin/inbox');
  }
  if (req.body.action === 'resend') {
    return mail.notify(id, `${req.protocol}://${req.get('host')}`).then((r) => { flash(req, r && r.ok ? 'ok' : 'err', r && r.ok ? 'Email sent.' : `Could not send: ${(r && r.reason) || 'no inbox set'}`); res.redirect(`/admin/inbox/${id}`); });
  }
  db.prepare('UPDATE submissions SET status = ?, note = ? WHERE id = ?').run(req.body.status || 'open', req.body.note || '', id);
  flash(req, 'ok', 'Updated.'); res.redirect(`/admin/inbox/${id}`);
});

// ---------- Page content ----------
router.get('/content', (req, res) => {
  const edited = Content.all();
  res.render('admin/content-index', { counts: Object.fromEntries(PAGES.map((p) => [p.id, p.fields.filter((f) => edited[f.key] !== undefined).length])) });
});
router.get('/content/:page', (req, res) => {
  const page = PAGES.find((p) => p.id === req.params.page); if (!page) return res.redirect('/admin/content');
  const cur = Content.all();
  res.render('admin/content-edit', { page, values: Object.fromEntries(page.fields.map((f) => [f.key, cur[f.key] !== undefined ? cur[f.key] : f.def])), edited: cur });
});
router.post('/content/:page', upload.any(), (req, res) => {
  const page = PAGES.find((p) => p.id === req.params.page); if (!page) return res.redirect('/admin/content');
  const files = {}; for (const f of req.files || []) files[f.fieldname] = f;
  for (const f of page.fields) {
    const name = f.key.replace(/\./g, '__');
    if (req.body[`${name}__reset`] === '1') { Content.reset(f.key); continue; }
    let v;
    if (f.type === 'image') {
      let im = null; try { im = JSON.parse(req.body[`${name}__json`] || 'null'); } catch (e) {}
      if (files[`${name}__new`]) im = { src: `/uploads/${files[`${name}__new`].filename}`, x: 50, y: 50 };
      if (!im || !im.src) continue;
      v = JSON.stringify({ src: im.src, x: Number(im.x ?? 50), y: Number(im.y ?? 50) });
    } else v = String(req.body[name] ?? '').replace(/\r/g, '');
    const def = f.def;
    if (v === def) Content.reset(f.key); else Content.set(f.key, v);
  }
  flash(req, 'ok', `${page.label} updated. Changes are live now.`);
  res.redirect(`/admin/content/${page.id}`);
});

// ---------- Live on-page editing API ----------
router.post('/api/content', (req, res) => {
  const { key, value } = req.body;
  const f = FIELD_INDEX[key]; if (!f || f.type === 'image') return res.status(400).json({ ok: false });
  const v = String(value ?? '').replace(/\r/g, '').replace(/ /g, ' ').trim();
  if (v === f.def) Content.reset(key); else Content.set(key, v);
  res.json({ ok: true, html: f.type === 'rich' ? U.rich(v) : U.esc(v) });
});
router.post('/api/content-image', upload.single('file'), (req, res) => {
  const key = req.body.key; const f = FIELD_INDEX[key]; if (!f || f.type !== 'image') return res.status(400).json({ ok: false });
  let cur = U.parseImg(Content.all()[key] ?? f.def) || {};
  if (req.file) cur = { src: `/uploads/${req.file.filename}`, x: 50, y: 50 };
  if (req.body.x !== undefined) cur.x = Number(req.body.x); if (req.body.y !== undefined) cur.y = Number(req.body.y);
  Content.set(key, JSON.stringify(cur));
  res.json({ ok: true, img: cur });
});
router.post('/api/upload', upload.single('file'), (req, res) => (req.file ? res.json({ ok: true, ...fileObj(req.file) }) : res.status(400).json({ ok: false, error: 'File type not allowed' })));

// ---------- Settings ----------
router.get('/settings', (req, res) => res.render('admin/settings', { SETTINGS, values: Settings.all() }));
router.post('/settings', (req, res) => {
  for (const g of SETTINGS) for (const f of g.fields) {
    if (f.type === 'password' && !req.body[f.key]) continue; // keep existing password when left blank
    if (f.type === 'checkbox') Settings.set(f.key, req.body[f.key] === 'on' ? '1' : '');
    else if (req.body[f.key] !== undefined) Settings.set(f.key, String(req.body[f.key]).trim());
  }
  Settings.set('whatsapp', String(Settings.get('whatsapp') || '').replace(/\D/g, ''));
  flash(req, 'ok', 'Settings saved.'); res.redirect('/admin/settings');
});
router.post('/settings/test-email', async (req, res) => {
  const to = Settings.get('inbox');
  const r = await mail.send({ to, subject: 'Solace Housing website: test email', html: '<p>Your website email is working. Form submissions will arrive here.</p>' });
  flash(req, r.ok ? 'ok' : 'err', r.ok ? `Test email sent to ${to}.` : `Email failed: ${r.reason}`); res.redirect('/admin/settings#email');
});

// ---------- WhatsApp enquiries ----------
router.get('/enquiries', (req, res) => {
  const days = Number(req.query.days) || 30;
  const byRoom = db.prepare(`SELECT c.room_id, c.ref, COUNT(*) n, MAX(c.created_at) last FROM clicks c WHERE c.created_at > datetime('now', ?) GROUP BY c.room_id ORDER BY n DESC`).all(`-${days} days`)
    .map((r) => ({ ...r, room: r.room_id ? Items.get(r.room_id) : null }));
  const bySource = db.prepare(`SELECT source, COUNT(*) n FROM clicks WHERE created_at > datetime('now', ?) GROUP BY source ORDER BY n DESC`).all(`-${days} days`);
  const recent = db.prepare('SELECT * FROM clicks ORDER BY id DESC LIMIT 40').all();
  res.render('admin/enquiries', { byRoom, bySource, recent, days, rooms: Items.list('rooms', { all: true }).filter((r) => r.status !== 'Let / allocated') });
});

// ---------- Subscribers ----------
router.get('/subscribers', (req, res) => res.render('admin/subscribers', { rows: db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all() }));
router.get('/subscribers.csv', (req, res) => res.attachment('newsletter-subscribers.csv').type('text/csv').send(csv([['Email', 'Name', 'Joined'], ...db.prepare('SELECT * FROM subscribers ORDER BY id').all().map((r) => [r.email, r.name, r.created_at])])));
router.post('/subscribers/:id/delete', (req, res) => { db.prepare('DELETE FROM subscribers WHERE id = ?').run(Number(req.params.id)); res.redirect('/admin/subscribers'); });

// ---------- Users ----------
router.get('/users', (req, res) => res.render('admin/users', { rows: db.prepare('SELECT id, name, email, created_at FROM users ORDER BY id').all() }));
router.post('/users', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) { flash(req, 'err', 'Name, email and a password of at least 8 characters are required.'); return res.redirect('/admin/users'); }
  try { db.prepare('INSERT INTO users (name, email, hash) VALUES (?,?,?)').run(name.trim(), email.trim().toLowerCase(), bcrypt.hashSync(password, 10)); flash(req, 'ok', `${name} can now log in.`); }
  catch (e) { flash(req, 'err', 'That email already has an account.'); }
  res.redirect('/admin/users');
});
router.post('/users/:id/delete', (req, res) => {
  if (Number(req.params.id) === req.session.uid) flash(req, 'err', 'You cannot delete your own account.');
  else { db.prepare('DELETE FROM users WHERE id = ?').run(Number(req.params.id)); flash(req, 'ok', 'User removed.'); }
  res.redirect('/admin/users');
});
router.post('/password', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.uid);
  if (!bcrypt.compareSync(req.body.current || '', u.hash)) flash(req, 'err', 'Current password is incorrect.');
  else if (!req.body.password || req.body.password.length < 8) flash(req, 'err', 'New password must be at least 8 characters.');
  else { db.prepare('UPDATE users SET hash = ? WHERE id = ?').run(bcrypt.hashSync(req.body.password, 10), u.id); flash(req, 'ok', 'Password changed.'); }
  res.redirect('/admin/users');
});

router.get('/help', (req, res) => res.render('admin/help'));

module.exports = router;
