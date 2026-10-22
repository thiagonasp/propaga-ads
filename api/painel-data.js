const crypto = require('crypto');
const { put, get } = require('@vercel/blob');

const COOKIE = 'propaga_painel';
const STATE_PATH = 'propaga/painel-state.json';

function sessionToken() {
  return crypto.createHmac('sha256', process.env.PAINEL_PASSWORD || '').update('propaga-painel-session-v1').digest('base64url');
}

function verifySession(value) {
  const expected = Buffer.from(sessionToken(), 'utf8');
  const candidate = Buffer.from(String(value || ''), 'utf8');
  return process.env.PAINEL_PASSWORD && candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function readCookies(header = '') {
  return Object.fromEntries(header.split(';').map(item => {
    const index = item.indexOf('=');
    return index < 0 ? ['', ''] : [item.slice(0, index).trim(), item.slice(index + 1).trim()];
  }).filter(([key]) => key));
}

function cleanState(value) {
  const groups = Array.isArray(value?.groups) ? value.groups.filter(x => typeof x === 'string').slice(0, 50) : [];
  const events = Array.isArray(value?.events) ? value.events.filter(e => e && typeof e === 'object').slice(-20000) : [];
  return { groups, events, updatedAt: new Date().toISOString() };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const cookies = readCookies(req.headers.cookie || '');
  if (!verifySession(cookies[COOKIE])) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'unauthorized' }));
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'storage_not_configured' }));
  }

  if (req.method === 'GET') {
    try {
      const result = await get(STATE_PATH, { access: 'private' });
      if (!result) return res.end(JSON.stringify({ groups: [], events: [], empty: true }));
      const text = await new Response(result.stream).text();
      const data = JSON.parse(text);
      return res.end(JSON.stringify(data));
    } catch (err) {
      if (err?.status === 404 || err?.statusCode === 404 || /not found/i.test(String(err?.message || ''))) {
        return res.end(JSON.stringify({ groups: [], events: [], empty: true }));
      }
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'read_failed', message: err.message }));
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const raw = req.body && typeof req.body === 'object' ? req.body : JSON.parse(String(req.body || '{}'));
      const state = cleanState(raw);
      await put(STATE_PATH, JSON.stringify(state), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });
      return res.end(JSON.stringify({ ok: true, updatedAt: state.updatedAt }));
    } catch (err) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'write_failed', message: err.message }));
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  res.statusCode = 405;
  return res.end(JSON.stringify({ error: 'method_not_allowed' }));
};
