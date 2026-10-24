const fs = require('fs');
const path = require('path');
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const html = fs.readFileSync(path.join(process.cwd(), 'private', 'painel.html'), 'utf8');
  return res.end(html.replace('</body>', '<script src="/painel-enhance.js?v=20261024-1"></script></body>'));
};
