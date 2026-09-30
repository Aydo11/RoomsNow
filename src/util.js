const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Safe mini-formatter for staff-written text: paragraphs, "- " bullet lists, **bold**, [links](https://...)
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|\/)[^)\s]+)\)/g, (m, t, u) => `<a href="${u}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`);
}
function rich(text) {
  if (!text) return '';
  const blocks = String(text).replace(/\r/g, '').split(/\n{2,}/);
  return blocks.map((b) => {
    const lines = b.split('\n').filter((l) => l.trim() !== '');
    if (lines.length && lines.every((l) => /^\s*[-•*]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-•*]\s+/, ''))}</li>`).join('')}</ul>`;
    // mixed paragraph + list
    let out = '', list = [], para = [];
    const flushP = () => { if (para.length) { out += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
    const flushL = () => { if (list.length) { out += `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`; list = []; } };
    for (const l of lines) { if (/^\s*[-•*]\s+/.test(l)) { flushP(); list.push(l.replace(/^\s*[-•*]\s+/, '')); } else { flushL(); para.push(l); } }
    flushP(); flushL();
    return out;
  }).join('\n');
}
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 70) || 'item';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function parseDate(d) { if (!d) return null; const [y, m, dd] = String(d).split('-').map(Number); if (!y) return null; return new Date(Date.UTC(y, (m || 1) - 1, dd || 1)); }
function fmtDate(d, style = 'long') {
  const dt = parseDate(d); if (!dt) return '';
  const day = dt.getUTCDate(), mon = MONTHS[dt.getUTCMonth()], y = dt.getUTCFullYear();
  if (style === 'short') return `${day} ${mon.slice(0, 3)} ${y}`;
  if (style === 'dow') return `${DAYS[dt.getUTCDay()]} ${day} ${mon}`;
  return `${day} ${mon} ${y}`;
}
function fmtTime(t) {
  if (!t) return ''; const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am'; const hh = h % 12 || 12;
  return `${hh}${m ? ':' + String(m).padStart(2, '0') : ''}${ap}`;
}
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

function parseImg(v) {
  if (!v) return null;
  if (typeof v === 'object') return v.src ? v : null;
  try { const o = JSON.parse(v); return o && o.src ? o : null; } catch (e) { return v.startsWith('/') ? { src: v, x: 50, y: 50 } : null; }
}
const pos = (im) => (im ? `object-position:${Number(im.x ?? 50)}% ${Number(im.y ?? 50)}%` : '');

function waLink(number, text) {
  const n = String(number || '').replace(/\D/g, '');
  return `https://wa.me/${n}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

module.exports = { esc, rich, inline, nl2br, slugify, fmtDate, fmtTime, parseDate, today, parseImg, pos, waLink, MONTHS, DAYS };
