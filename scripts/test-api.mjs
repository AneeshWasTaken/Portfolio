// Tests for api/contact.js using a fake email provider (no network, nothing is really sent).
// Run with: npm run test
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const handler = createRequire(import.meta.url)(path.join(ROOT, 'api', 'contact.js'));

function call(method, body) {
  return new Promise((resolve) => {
    const res = {
      code: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; },
      json(o) { resolve({ code: this.code, body: o }); },
    };
    handler({ method, body }, res);
  });
}
const good = { name: 'Test Person', email: 'test@example.com', projectType: 'Reels & Shorts', budget: '', message: 'I need a 60 second reel edited.', company: '' };

let sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => { sent.push({ url, init }); return { ok: true, status: 200 }; };
const setEnv = (on) => {
  if (on) { process.env.RESEND_API_KEY = 're_test'; process.env.CONTACT_TO_EMAIL = 'owner@example.com'; }
  else { delete process.env.RESEND_API_KEY; delete process.env.CONTACT_TO_EMAIL; }
};
let passed = 0;
async function t(name, fn) { await fn(); passed++; console.log('  ok -', name); }

await t('rejects GET with 405', async () => {
  const r = await call('GET', null); assert.equal(r.code, 405);
});
await t('rejects invalid input with field messages', async () => {
  setEnv(true);
  const r = await call('POST', { ...good, email: 'nope', message: 'hi', projectType: 'Hacking' });
  assert.equal(r.code, 400); assert.ok(r.body.fields.email && r.body.fields.message && r.body.fields.projectType);
  assert.equal(sent.length, 0);
});
await t('says NOT configured (503) and sends nothing when env vars are missing', async () => {
  setEnv(false);
  const r = await call('POST', good);
  assert.equal(r.code, 503); assert.equal(r.body.error, 'not_configured'); assert.equal(sent.length, 0);
});
await t('sends one email through Resend when configured', async () => {
  setEnv(true);
  const r = await call('POST', { ...good, name: 'Ann <script>alert(1)</script>' });
  assert.equal(r.code, 200); assert.equal(r.body.ok, true); assert.equal(sent.length, 1);
  const { url, init } = sent[0];
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(init.headers.Authorization, 'Bearer re_test');
  const payload = JSON.parse(init.body);
  assert.deepEqual(payload.to, ['owner@example.com']);
  assert.equal(payload.reply_to, 'test@example.com');
  assert.ok(!payload.html.includes('<script>'), 'HTML must be escaped');
});
await t('strips line breaks from the subject (no header injection)', async () => {
  sent = []; setEnv(true);
  await call('POST', { ...good, name: 'Eve\r\nBcc: x@y.z' });
  assert.ok(!/[\r\n]/.test(JSON.parse(sent[0].init.body).subject));
});
await t('honeypot: bots get a quiet success and nothing is sent', async () => {
  sent = []; setEnv(true);
  const r = await call('POST', { ...good, company: 'Spam Inc' });
  assert.equal(r.code, 200); assert.equal(sent.length, 0);
});
await t('reports 502 when the provider rejects the message', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401 });
  const r = await call('POST', good);
  assert.equal(r.code, 502); assert.equal(r.body.error, 'delivery_failed');
});
await t('reports 502 when the provider is unreachable', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  const r = await call('POST', good);
  assert.equal(r.code, 502);
});
globalThis.fetch = realFetch;
console.log(`\n${passed} API tests passed.`);
