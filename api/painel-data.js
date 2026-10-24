const { put, get } = require('@vercel/blob');

const STATE_PATH = 'propaga/painel-state.json';

function cleanState(value) {
  const groups = Array.isArray(value?.groups) ? value.groups.filter(x => typeof x === 'string').slice(0, 50) : [];
  const events = Array.isArray(value?.events) ? value.events.filter(e => e && typeof e === 'object').slice(-20000) : [];
  const hiddenGroups = Array.isArray(value?.hiddenGroups) ? value.hiddenGroups.filter(x => typeof x === 'string').slice(0, 50) : groups.filter(g => !['Ofertas do Beach', 'Ofertas do Esporte'].includes(g));
  return { groups, events, hiddenGroups, updatedAt: new Date().toISOString() };
}

function storageError(err) {
  const message = String(err?.message || '');
  return /blob|store|token|oidc|storage|credential/i.test(message);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET') {
    try {
      const result = await get(STATE_PATH, { access: 'private', useCache: false });
      if (!result) return res.end(JSON.stringify({ groups: [], events: [], empty: true }));
      const text = await new Response(result.stream).text();
      const data = JSON.parse(text);
      return res.end(JSON.stringify(data));
    } catch (err) {
      if (err?.status === 404 || err?.statusCode === 404 || /not found/i.test(String(err?.message || ''))) {
        return res.end(JSON.stringify({ groups: [], events: [], empty: true }));
      }
      res.statusCode = storageError(err) ? 503 : 500;
      return res.end(JSON.stringify({ error: storageError(err) ? 'storage_not_configured' : 'read_failed', message: err.message }));
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
      res.statusCode = storageError(err) ? 503 : 500;
      return res.end(JSON.stringify({ error: storageError(err) ? 'storage_not_configured' : 'write_failed', message: err.message }));
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT');
  res.statusCode = 405;
  return res.end(JSON.stringify({ error: 'method_not_allowed' }));
};
