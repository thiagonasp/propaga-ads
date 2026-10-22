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
  let html = fs.readFileSync(path.join(process.cwd(), 'private', 'painel.html'), 'utf8');

  html = html.replace(
    '<div class="actions"><button class="btn" id="addGroup">+ Novo grupo</button>',
    '<div class="actions"><button class="btn" id="openImport">⇧ Importar</button><button class="btn" id="addGroup">+ Novo grupo</button>'
  );

  html = html.replace(
    /<section class="layout"><aside class="panel">[\s\S]*?<\/aside><section class="panel">/,
    '<section class="layout"><section class="panel">'
  );

  const importDialog = `<dialog id="importDialog" class="import-dialog"><div class="import-dialog-head"><div><h3>Importar conversa</h3><p>Selecione o grupo e envie a exportação do WhatsApp.</p></div><button class="mini import-close" id="closeImport" type="button" aria-label="Fechar">✕</button></div><div class="field"><label for="targetGroup">Grupo correspondente</label><select id="targetGroup"></select></div><label class="drop" id="dropZone" for="fileInput"><input id="fileInput" type="file" accept=".txt,.zip,text/plain,application/zip"><div><div class="drop-icon">⇧</div><strong>Selecione ou arraste o arquivo</strong><small>Exportação sem mídia · TXT ou ZIP</small><div class="file-name" id="fileName"></div></div></label><button class="btn primary submit" id="analyzeFile" disabled>Importar somente novos</button><button class="btn submit" id="reprocessFile" disabled>Reprocessar histórico completo</button><div class="result" id="importResult"></div><p class="helper"><strong>Importar somente novos:</strong> preserva o histórico e acrescenta eventos posteriores.<br><strong>Reprocessar histórico:</strong> substitui os eventos do grupo pelo arquivo selecionado.</p></dialog>`;
  html = html.replace('</main><dialog id="groupDialog">', `</main>${importDialog}<dialog id="groupDialog">`);

  const extraCss = `<style>.layout{display:block}.import-dialog{width:min(500px,calc(100% - 24px));max-height:min(88vh,760px);overflow:auto}.import-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.import-dialog-head h3{margin:0}.import-dialog-head p{margin:5px 0 0;color:var(--muted);font-size:12px}.import-close{font-size:18px;padding:2px 6px}.date-filter{display:flex;align-items:end;gap:8px;flex-wrap:wrap;margin-top:10px}.date-filter label{display:grid;gap:4px;color:var(--muted);font-size:10px}.date-filter input{color:var(--text);background:#081f28;border:1px solid var(--line);border-radius:9px;padding:7px 8px;font:inherit;font-size:11px}.date-filter .btn{padding:7px 10px;font-size:11px}.sync-status{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--muted);margin-top:8px}.sync-dot{width:7px;height:7px;border-radius:50%;background:#f5b94c}.sync-status.ok .sync-dot{background:var(--mint)}.sync-status.err .sync-dot{background:var(--danger)}@media(max-width:560px){.actions{gap:7px}.actions .btn{padding:9px 11px;font-size:12px}.import-dialog{padding:16px}.drop{min-height:140px}.date-filter{display:grid;grid-template-columns:1fr 1fr auto}.date-filter input{width:100%}}</style>`;
  html = html.replace('</head>', `${extraCss}</head>`);

  const syncScript = `<script>
(function(){
  const API='/api/painel-data';
  let syncTimer=null, remoteUpdatedAt='', dateFrom='', dateTo='';
  const originalSave=save, originalTotalBase=totalBase;

  const status=document.createElement('div');
  status.className='sync-status';
  status.innerHTML='<i class="sync-dot"></i><span>Conectando dados…</span>';
  document.querySelector('header > div:first-child')?.appendChild(status);
  function setSync(text,type=''){status.className='sync-status '+type;status.querySelector('span').textContent=text}

  const head=document.querySelector('.charts-head > div');
  if(head){
    const filter=document.createElement('div');
    filter.className='date-filter';
    filter.innerHTML='<label>De<input id="dateFrom" type="date"></label><label>Até<input id="dateTo" type="date"></label><button class="btn" id="clearDates" type="button">Limpar</button>';
    head.appendChild(filter);
    filter.querySelector('#dateFrom').onchange=e=>{dateFrom=e.target.value;render()};
    filter.querySelector('#dateTo').onchange=e=>{dateTo=e.target.value;render()};
    filter.querySelector('#clearDates').onclick=()=>{dateFrom=dateTo='';filter.querySelector('#dateFrom').value='';filter.querySelector('#dateTo').value='';render()};
  }

  filtered=function(){return state.events.filter(e=>(!selectedGroup||e.group===selectedGroup)&&(!dateFrom||e.date>=dateFrom)&&(!dateTo||e.date<=dateTo))};
  totalBase=function(){
    let base=originalTotalBase();
    if(!dateFrom)return base;
    const prior=state.events.filter(e=>(!selectedGroup||e.group===selectedGroup)&&e.date<dateFrom);
    return base+count(prior,'entrada')-count(prior,'saida');
  };

  insights=function(rows){
    const asc=[...rows].sort((a,b)=>stamp(a).localeCompare(stamp(b))),people=new Map(),newPeople=new Set(),hours=Array(24).fill(0);let reentries=0;
    for(const e of asc){const key=e.person.toLowerCase(),seq=people.get(key)||[],prev=seq.at(-1);if(e.type==='entrada'){if(!prev)newPeople.add(key);else if(prev.type==='saida')reentries++;hours[Number(e.time.slice(0,2))]++}seq.push(e);people.set(key,seq)}
    const definitive=[...people.values()].filter(seq=>seq.at(-1).type==='saida').length,retained=[...newPeople].filter(p=>people.get(p)?.at(-1).type!=='saida').length,retention=newPeople.size?Math.round(retained/newPeople.size*100):0,peak=Math.max(...hours),peakHour=peak?hours.indexOf(peak):null,last=asc.at(-1);
    const currentRows=state.events.filter(e=>(!selectedGroup||e.group===selectedGroup)&&(!dateTo||e.date<=dateTo)).sort((a,b)=>stamp(a).localeCompare(stamp(b))),current=new Map();
    currentRows.forEach(e=>current.set(e.person.toLowerCase(),e));
    const active=[...current.values()].filter(e=>e.type==='entrada'),states={};
    active.forEach(e=>{const uf=stateFromPerson(e.person);if(uf)states[uf]=(states[uf]||0)+1});
    return{newCount:newPeople.size,reentries,definitive,retention,states,identified:Object.values(states).reduce((a,b)=>a+b,0),uniqueEntrants:active.length,peakHour,last};
  };

  async function pushState(){
    try{
      setSync('Salvando…');
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groups:state.groups,events:state.events})});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const j=await r.json();remoteUpdatedAt=j.updatedAt||remoteUpdatedAt;setSync('Sincronizado','ok');
    }catch(e){setSync('Sem sincronização','err')}
  }
  function queuePush(){clearTimeout(syncTimer);syncTimer=setTimeout(pushState,450)}
  save=function(){originalSave();queuePush()};

  async function pullRemote(first=false){
    try{
      const r=await fetch(API,{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();
      const remoteHasData=Array.isArray(data.events)&&data.events.length>0;
      const localHasData=Array.isArray(state.events)&&state.events.length>0;
      if(first&&data.empty&&!remoteHasData&&localHasData){await pushState();return}
      if(remoteHasData&&(!remoteUpdatedAt||data.updatedAt!==remoteUpdatedAt)){
        remoteUpdatedAt=data.updatedAt||'';
        state={groups:Array.isArray(data.groups)&&data.groups.length?data.groups:state.groups,events:data.events};
        originalSave();render();
      }
      setSync('Sincronizado','ok');
    }catch(e){setSync('Sem sincronização','err')}
  }

  if(typeof openImport!=='undefined'){openImport.onclick=()=>importDialog.showModal();closeImport.onclick=()=>importDialog.close();importDialog.addEventListener('click',e=>{if(e.target===importDialog)importDialog.close()})}
  pullRemote(true);
  setInterval(()=>pullRemote(false),15000);
})();
</script>`;
  html = html.replace('</body></html>', `${syncScript}</body></html>`);
  return html;
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
