(() => {
  const DATA_URL = '/painel/dados';
  let dateFrom = '';
  let dateTo = '';
  let syncTimer = null;
  let syncing = false;

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .layout{display:block!important}.layout>.panel{width:100%}
      .sync-status{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:11px;background:#081f28}
      .sync-status.ok{color:var(--mint)}.sync-status.err{color:var(--danger)}
      .date-filter{display:grid;grid-template-columns:auto 1fr 1fr auto;gap:10px;align-items:end;margin:0 0 16px;padding:14px 16px;background:rgba(13,41,51,.94);border:1px solid var(--line);border-radius:16px}
      .date-filter .filter-title{align-self:center;font-weight:800;font-size:13px;color:#c6d5d7;white-space:nowrap}.date-filter .field{margin:0}.date-filter .btn{height:42px}
      .import-dialog{width:min(500px,calc(100% - 24px));max-height:min(88vh,780px);overflow:auto}
      .import-dialog .panel{border:0;background:transparent;padding:0}.import-dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}
      .import-dialog-head h3{margin:0}.import-dialog-head p{margin:4px 0 0;color:var(--muted);font-size:12px}.import-close{font-size:18px;padding:3px 6px}
      @media(max-width:700px){.date-filter{grid-template-columns:1fr 1fr}.date-filter .filter-title{grid-column:1/-1}.date-filter .btn{width:100%}}
      @media(max-width:560px){.actions{gap:7px}.actions .btn{padding:9px 11px;font-size:12px}.sync-status{width:100%;justify-content:center;order:99}.date-filter{grid-template-columns:1fr}.date-filter .filter-title{grid-column:auto}.import-dialog{padding:16px}.drop{min-height:138px}}
    `;
    document.head.appendChild(style);
  }

  function setupSyncUi() {
    const actions = document.querySelector('.actions');
    if (!actions) return;
    const syncButton = document.createElement('button');
    syncButton.className = 'btn';
    syncButton.type = 'button';
    syncButton.textContent = '↻ Sincronizar';
    syncButton.onclick = () => pullRemote(true);
    const status = document.createElement('span');
    status.id = 'syncStatus';
    status.className = 'sync-status';
    status.textContent = 'Sincronização iniciando…';
    actions.prepend(syncButton);
    actions.appendChild(status);
  }

  function setSyncStatus(text, type = '') {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'sync-status' + (type ? ' ' + type : '');
  }

  function setupImportModal() {
    const aside = document.querySelector('.layout > aside.panel');
    const actions = document.querySelector('.actions');
    if (!aside || !actions) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'importDialog';
    dialog.className = 'import-dialog';
    const head = document.createElement('div');
    head.className = 'import-dialog-head';
    head.innerHTML = '<div><h3>Importar conversa</h3><p>Selecione o grupo e envie a exportação do WhatsApp.</p></div><button class="mini import-close" type="button" aria-label="Fechar">✕</button>';
    dialog.appendChild(head);
    dialog.appendChild(aside);
    document.body.appendChild(dialog);

    const open = document.createElement('button');
    open.className = 'btn';
    open.type = 'button';
    open.textContent = '⇧ Importar';
    open.onclick = () => dialog.showModal();
    actions.prepend(open);

    head.querySelector('.import-close').onclick = () => dialog.close();
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }

  function setupDateFilter() {
    const groups = document.getElementById('groupCards');
    if (!groups) return;
    const box = document.createElement('section');
    box.className = 'date-filter';
    box.innerHTML = `
      <div class="filter-title">Filtrar por período</div>
      <div class="field"><label for="filterFrom">De</label><input id="filterFrom" type="date"></div>
      <div class="field"><label for="filterTo">Até</label><input id="filterTo" type="date"></div>
      <button class="btn" id="clearDates" type="button">Limpar</button>`;
    groups.insertAdjacentElement('afterend', box);
    const from = box.querySelector('#filterFrom');
    const to = box.querySelector('#filterTo');
    from.onchange = () => { dateFrom = from.value; render(); };
    to.onchange = () => { dateTo = to.value; render(); };
    box.querySelector('#clearDates').onclick = () => { dateFrom = ''; dateTo = ''; from.value = ''; to.value = ''; render(); };
  }

  function groupMatches(e) {
    return !selectedGroup || e.group === selectedGroup;
  }

  function dateMatches(e) {
    return (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo);
  }

  function eventsToEnd() {
    return state.events.filter(e => groupMatches(e) && (!dateTo || e.date <= dateTo));
  }

  function startingBalance() {
    let balance = totalBase();
    if (!dateFrom) return balance;
    for (const e of state.events) {
      if (!groupMatches(e) || e.date >= dateFrom) continue;
      balance += e.type === 'entrada' ? 1 : -1;
    }
    return balance;
  }

  function currentBalanceAtEnd() {
    let balance = totalBase();
    for (const e of eventsToEnd()) balance += e.type === 'entrada' ? 1 : -1;
    return balance;
  }

  function currentStates() {
    const rows = [...eventsToEnd()].sort((a,b) => stamp(a).localeCompare(stamp(b)));
    const memberships = new Map();
    for (const e of rows) memberships.set(`${e.group}|${String(e.person||'').toLowerCase()}`, e);
    const activePeople = new Map();
    for (const [key, e] of memberships) {
      if (e.type !== 'entrada') continue;
      const personKey = String(e.person || '').toLowerCase();
      if (!activePeople.has(personKey)) activePeople.set(personKey, e.person);
    }
    const states = {};
    for (const person of activePeople.values()) {
      const uf = stateFromPerson(person);
      if (uf) states[uf] = (states[uf] || 0) + 1;
    }
    return { states, identified: Object.values(states).reduce((a,b)=>a+b,0), activeCount: activePeople.size };
  }

  const originalStateFromPerson = stateFromPerson;
  stateFromPerson = function(person) {
    let d = String(person || '').replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
    if (d.length < 10) return null;
    return DDD[d.slice(0,2)] || originalStateFromPerson(person) || null;
  };

  filtered = function() {
    return state.events.filter(e => groupMatches(e) && dateMatches(e));
  };

  daily = function() {
    const map = new Map();
    filtered().forEach(e => {
      const d = map.get(e.date) || {date:e.date, entrada:0, saida:0};
      d[e.type]++;
      map.set(e.date, d);
    });
    let balance = startingBalance();
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(d => ({...d, balance: balance += d.entrada - d.saida}));
  };

  insights = function(rows) {
    const asc = [...rows].sort((a,b)=>stamp(a).localeCompare(stamp(b)));
    const people = new Map(), newPeople = new Set(), hours = Array(24).fill(0);
    let reentries = 0;
    for (const e of asc) {
      const key = String(e.person || '').toLowerCase();
      const seq = people.get(key) || [];
      const prev = seq.at(-1);
      if (e.type === 'entrada') {
        if (!prev) newPeople.add(key); else if (prev.type === 'saida') reentries++;
        const hour = Number(String(e.time || '00').slice(0,2));
        if (!Number.isNaN(hour)) hours[hour]++;
      }
      seq.push(e); people.set(key, seq);
    }
    const definitive = [...people.values()].filter(seq => seq.at(-1)?.type === 'saida').length;
    const retained = [...newPeople].filter(p => people.get(p)?.at(-1)?.type !== 'saida').length;
    const retention = newPeople.size ? Math.round(retained / newPeople.size * 100) : 0;
    const peak = Math.max(...hours), peakHour = peak ? hours.indexOf(peak) : null;
    const last = asc.at(-1);
    const geo = currentStates();
    return {newCount:newPeople.size,reentries,definitive,retention,states:geo.states,identified:geo.identified,uniqueEntrants:geo.activeCount,peakHour,last};
  };

  const baseRender = render;
  render = function() {
    baseRender();
    const third = document.querySelector('#summary .stat:nth-child(3)');
    if (third) {
      const current = currentBalanceAtEnd();
      const span = third.querySelector('span');
      const b = third.querySelector('b');
      if (span) span.textContent = dateTo ? 'Membros no fim do período' : 'Membros atuais estimados';
      if (b) { b.textContent = current; b.className = current >= 0 ? 'positive' : 'negative'; }
    }
    const title = document.getElementById('chartTitle');
    if (title && (dateFrom || dateTo)) {
      const base = selectedGroup || 'Todos os grupos';
      const period = `${dateFrom ? fmtDate(dateFrom) : 'início'} até ${dateTo ? fmtDate(dateTo) : 'hoje'}`;
      title.textContent = `${base} · ${period}`;
    }
  };

  function localPersist() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  async function pushRemote(immediate = false) {
    if (syncing && !immediate) return;
    syncing = true;
    setSyncStatus('Salvando…');
    try {
      const response = await fetch(DATA_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({groups: state.groups, events: state.events})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
      setSyncStatus('Sincronizado', 'ok');
      return true;
    } catch (err) {
      const msg = String(err?.message || err);
      if (/storage|blob|token|store|configured/i.test(msg)) setSyncStatus('Conecte o Vercel Blob', 'err');
      else if (/unauthorized|401/i.test(msg)) setSyncStatus('Sessão expirada', 'err');
      else setSyncStatus('Falha ao sincronizar', 'err');
      return false;
    } finally {
      syncing = false;
    }
  }

  const baseSave = save;
  save = function() {
    localPersist();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => pushRemote(false), 180);
  };

  async function pullRemote(manual = false) {
    setSyncStatus('Sincronizando…');
    try {
      const response = await fetch(DATA_URL, {credentials:'same-origin', cache:'no-store'});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);

      if (data.empty) {
        if (state.events.length) {
          localPersist();
          const ok = await pushRemote(true);
          if (ok) setSyncStatus('Base enviada ao servidor', 'ok');
        } else {
          setSyncStatus('Base central vazia', 'ok');
        }
        return;
      }

      state = {
        groups: Array.isArray(data.groups) && data.groups.length ? data.groups : [...defaults],
        events: Array.isArray(data.events) ? cleanLegacyDuplicates(data.events) : []
      };
      localPersist();
      render();
      setSyncStatus('Sincronizado', 'ok');
    } catch (err) {
      const msg = String(err?.message || err);
      if (/storage_not_configured|storage|blob|token|store|configured/i.test(msg)) setSyncStatus('Conecte o Vercel Blob', 'err');
      else if (/unauthorized|401/i.test(msg)) setSyncStatus('Sessão expirada', 'err');
      else setSyncStatus(manual ? 'Falha ao atualizar' : 'Somente neste aparelho', 'err');
    }
  }

  addStyles();
  setupImportModal();
  setupDateFilter();
  setupSyncUi();
  render();
  pullRemote(false);
})();
