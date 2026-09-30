const nodemailer = require('nodemailer');
const path = require('path');
const { Settings, db, UPLOAD_DIR } = require('./db');
const { esc } = require('./util');

function transport() {
  const s = Settings.all();
  if (!s.smtp_host || !s.smtp_user) return null;
  const port = Number(s.smtp_port || 587);
  return { t: nodemailer.createTransport({ host: s.smtp_host, port, secure: port === 465, auth: { user: s.smtp_user, pass: s.smtp_pass } }), s };
}

async function send({ to, subject, html, attachments = [], replyTo }) {
  const tr = transport();
  if (!tr) return { ok: false, reason: 'Email is not set up yet (Admin → Settings → Email notifications).' };
  try {
    await tr.t.sendMail({ from: tr.s.mail_from || tr.s.smtp_user, to, subject, html, attachments, replyTo });
    return { ok: true };
  } catch (e) { console.error('Mail error:', e.message); return { ok: false, reason: e.message }; }
}

const LABELS = { repair: 'Repair report', contact: 'Contact enquiry', referral: 'Referral', registration: 'Event registration', complaint: 'Complaint', newsletter: 'Newsletter sign-up' };

// Email a stored submission to the configured inbox
async function notify(submissionId, baseUrl) {
  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  if (!sub) return;
  const s = Settings.all();
  const to = (sub.type === 'repair' && s.inbox_repairs) || (sub.type === 'referral' && s.inbox_referrals) || s.inbox;
  if (!to) return;
  const data = JSON.parse(sub.data || '{}');
  const files = JSON.parse(sub.files || '[]');
  const rows = Object.entries(data).map(([k, v]) => `<tr><td style="padding:8px 12px;background:#F7F2EF;font-weight:600;vertical-align:top;width:180px">${esc(k)}</td><td style="padding:8px 12px;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
  <div style="background:#013F58;color:#fff;padding:20px 24px"><div style="color:#F54C61;font-weight:700;font-size:22px">solace</div><div>${esc(LABELS[sub.type] || sub.type)} · Ref #${sub.id}</div></div>
  <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
  ${files.length ? `<p style="padding:0 24px">${files.length} file(s) attached.</p>` : ''}
  <p style="padding:16px 24px"><a href="${baseUrl}/admin/inbox/${sub.id}" style="background:#F54C61;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Open in admin</a></p></div>`;
  const attachments = files.map((f) => ({ filename: f.name, path: path.join(UPLOAD_DIR, path.basename(f.src)) }));
  const r = await send({ to, subject: `${LABELS[sub.type] || 'Website form'} #${sub.id}${sub.subject ? ' – ' + sub.subject : ''}`, html, attachments, replyTo: sub.email || undefined });
  if (r.ok) db.prepare('UPDATE submissions SET emailed = 1 WHERE id = ?').run(sub.id);
  return r;
}

module.exports = { send, notify, LABELS };
