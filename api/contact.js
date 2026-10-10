// Serverless function for the project inquiry form (Vercel: POST /api/contact).
// Secrets live in environment variables and never reach the browser.
//
// Required environment variables:
//   RESEND_API_KEY    API key from https://resend.com
//   CONTACT_TO_EMAIL  inbox that receives inquiries
// Optional:
//   RESEND_FROM       sender, default "Portfolio Form <onboarding@resend.dev>"
//
// Response contract (the front end relies on this):
//   200 { ok: true }                      message was handed to the email provider
//   400 { ok: false, error: "invalid", fields: { name: "..." } }
//   405 { ok: false, error: "method_not_allowed" }
//   502 { ok: false, error: "delivery_failed" }
//   503 { ok: false, error: "not_configured" }   env vars missing, nothing was sent

'use strict';

const PROJECT_TYPES = [
  'Reels & Shorts',
  'Cinematic Edit',
  'Gaming Edit',
  'Motion Graphics',
  'Other',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value, max) {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim().slice(0, max) : '';
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Strip line breaks so user input can never inject extra email headers.
function oneLine(s) {
  return s.replace(/[\r\n]+/g, ' ');
}

function parseBody(req) {
  const b = req.body;
  if (b && typeof b === 'object' && !Buffer.isBuffer(b)) return b;
  if (typeof b === 'string' || Buffer.isBuffer(b)) {
    try {
      return JSON.parse(b.toString());
    } catch (_) {
      return null;
    }
  }
  return null;
}

function validate(body) {
  const data = {
    name: clean(body.name, 100),
    email: clean(body.email, 254),
    projectType: clean(body.projectType, 40),
    budget: clean(body.budget, 100),
    message: clean(body.message, 3000),
  };
  const fields = {};
  if (data.name.length < 1) fields.name = 'Please enter your name.';
  if (!EMAIL_RE.test(data.email)) fields.email = 'Please enter a valid email address.';
  if (!PROJECT_TYPES.includes(data.projectType)) fields.projectType = 'Please choose a project type.';
  if (data.message.length < 10) fields.message = 'Please add a few details (at least 10 characters).';
  return { data, fields };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ ok: false, error: 'invalid', fields: {} });

  // Honeypot: real people never fill this hidden field. Pretend success to bots.
  if (clean(body.company, 200)) return res.status(200).json({ ok: true });

  const { data, fields } = validate(body);
  if (Object.keys(fields).length) return res.status(400).json({ ok: false, error: 'invalid', fields });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    // Be honest: nothing was sent.
    return res.status(503).json({ ok: false, error: 'not_configured' });
  }

  const from = process.env.RESEND_FROM || 'Portfolio Form <onboarding@resend.dev>';
  const subject = oneLine(`New project inquiry: ${data.projectType} from ${data.name}`).slice(0, 200);
  const text = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Project type: ${data.projectType}`,
    `Budget: ${data.budget || 'not given'}`,
    '',
    data.message,
  ].join('\n');
  const html = `<p><strong>Name:</strong> ${escapeHtml(data.name)}<br>
<strong>Email:</strong> ${escapeHtml(data.email)}<br>
<strong>Project type:</strong> ${escapeHtml(data.projectType)}<br>
<strong>Budget:</strong> ${escapeHtml(data.budget || 'not given')}</p>
<p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], reply_to: data.email, subject, text, html }),
    });
    if (!r.ok) {
      console.error('Resend rejected the message:', r.status);
      return res.status(502).json({ ok: false, error: 'delivery_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Could not reach Resend:', err && err.message);
    return res.status(502).json({ ok: false, error: 'delivery_failed' });
  }
};

module.exports.PROJECT_TYPES = PROJECT_TYPES;
