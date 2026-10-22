const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COOKIE = 'propaga_painel';
function verifyPassword(password) {
  const expected = Buffer.from(process.env.PAINEL_PASSWORD || '', 'utf8');
  const candidate = Buffer.from(String(password || ''), 'utf8');
  return expected.length > 0 && candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

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

function submittedPassword(req) {
  if (req.body && typeof req.body === 'object') return req.body.password || '';
  return new URLSearchParams(String(req.body || '')).get('password') || '';
}

function loginPage(hasError = false) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Acesso ao painel — Propaga Promo</title><style>:root{--bg:#071c24;--panel:#0d2933;--line:#21414b;--mint:#31e6a1;--text:#f5fbf9;--muted:#9db2b7;--danger:#ff7c79}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:linear-gradient(145deg,#061820,#0b2630 60%,#071c24);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--text)}main{width:min(430px,100%);padding:32px;border:1px solid var(--line);border-radius:22px;background:rgba(13,41,51,.96);box-shadow:0 24px 80px rgba(0,0,0,.28)}img{display:block;width:min(280px,90%);height:auto;margin:0 auto 26px}h1{margin:0;font-size:23px;letter-spacing:-.03em}p{margin:8px 0 22px;color:var(--muted);font-size:14px;line-height:1.5}label{display:block;margin-bottom:7px;font-size:12px;font-weight:750;color:#c6d5d7}input{width:100%;padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:#081f28;color:var(--text);font:inherit;outline:none}input:focus{border-color:var(--mint);box-shadow:0 0 0 3px rgba(49,230,161,.12)}button{width:100%;margin-top:14px;padding:13px;border:0;border-radius:12px;background:var(--mint);color:#052117;font:inherit;font-weight:800;cursor:pointer}.error{margin:12px 0 0;color:var(--danger);font-size:13px}</style></head><body><main><img src="/assets/propaga-promo-logo.png" alt="Propaga Promo"><h1>Painel de Grupos</h1><p>Digite a senha para acessar os dados e importar as conversas.</p><form method="post" action="/painel"><label for="password">Senha de acesso</label><input id="password" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Entrar no painel</button>${hasError ? '<div class="error">Senha incorreta. Tente novamente.</div>' : ''}</form></main></body></html>`;
}

function panelPage() {
  const html = fs.readFileSync(path.join(process.cwd(), 'private', 'painel.html'), 'utf8');
  return html.replace('</body>', '<script src="/painel-enhance.js?v=20261022-6"></script></body>');
}

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Frame-Options', 'DENY');

  if (!process.env.PAINEL_PASSWORD) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Painel aguardando configuração da senha na Vercel.');
  }

  if (req.query && req.query.logout) {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/painel; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
    res.statusCode = 303;
    res.setHeader('Location', '/painel');
    return res.end();
  }

  if (req.method === 'POST') {
    const password = submittedPassword(req);
    if (!verifyPassword(password)) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(loginPage(true));
    }
    res.setHeader('Set-Cookie', `${COOKIE}=${sessionToken()}; Path=/painel; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`);
    res.statusCode = 303;
    res.setHeader('Location', '/painel');
    return res.end();
  }

  const cookies = readCookies(req.headers.cookie);
  const authenticated = verifySession(cookies[COOKIE]);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!authenticated) return res.end(loginPage());
  return res.end(panelPage());
};
