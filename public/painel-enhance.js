(() => {
  const DATA_URL = '/painel/dados';
  const MIGRATION_KEY = 'propagaCentralMigratedV1';
  let syncTimer = null;
  let syncing = false;
  let remoteUpdatedAt = '';

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .layout{display:block!important}.layout>.panel{width:100%}
      .sync-status{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:11px;background:#081f28}
      .sync-status.ok{color:var(--mint)}.sync-status.err{color:var(--danger)}
      .import-dialog{width:min(500px,calc(100% - 24px));max-height:min(88vh,780px);overflow:auto}
      .import-dialog .panel{border:0;background:transparent;padding:0}.import-dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}
      .import-dialog-head h3{margin:0}.import-dialog-head p{margin:4px 0 0;color:var(--muted);font-size:12px}.import-close{font-size:18px;padding:3px 6px}
      @media(max-width:560px){.actions{gap:7px}.actions .btn{padding:9px 11px;font-size:12px}.sync-status{width:100%;justify-content:center;order:99}.import-dialog{padding:16px}.drop{min-height:138px}}
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

  const originalStateFromPerson = stateFromPerson;
  stateFromPerson = function(person) {
    let d = String(person || '').replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
    if (d.length < 10) return null;
    return DDD[d.slice(0,2)] || originalStateFromPerson(person) || null;
  };

  function localPersist() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function newestStamp(events) {
    let newest = '';
    for (const e of events || []) {
      const s = stamp(e);
      if (s > newest) newest = s;
    }
    return newest;
  }

  function localLooksNewer(remoteEvents) {
    const localEvents = Array.isArray(state.events) ? state.events : [];
    if (localEvents.length > remoteEvents.length) return true;
    return localEvents.length === remoteEvents.length && newestStamp(localEvents) > newestStamp(remoteEvents);
  }

  async function pushRemote(immediate = false) {
    if (syncing && !immediate) return false;
    syncing = true;
    setSyncStatus('Salvando…');
    try {
      const response = await fetch(DATA_URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({groups: state.groups, events: state.events, hiddenGroups: state.hiddenGroups})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
      remoteUpdatedAt = data.updatedAt || remoteUpdatedAt;
      localStorage.setItem(MIGRATION_KEY, '1');
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

  save = function() {
    localPersist();
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => pushRemote(false), 180);
  };

  async function pullRemote(manual = false) {
    if (syncing) return;
    setSyncStatus('Sincronizando…');
    try {
      const response = await fetch(DATA_URL, {credentials:'same-origin', cache:'no-store'});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);

      const remoteEvents = Array.isArray(data.events) ? cleanLegacyDuplicates(data.events) : [];
      const migrated = localStorage.getItem(MIGRATION_KEY) === '1';

      if (data.empty) {
        if (state.events.length) {
          localPersist();
          const ok = await pushRemote(true);
          if (ok) setSyncStatus('Base enviada ao servidor', 'ok');
        } else {
          localStorage.setItem(MIGRATION_KEY, '1');
          setSyncStatus('Base central vazia', 'ok');
        }
        return;
      }

      if (!migrated && localLooksNewer(remoteEvents)) {
        const ok = await pushRemote(true);
        if (ok) setSyncStatus('Base deste aparelho enviada', 'ok');
        return;
      }

      if (data.updatedAt && data.updatedAt === remoteUpdatedAt) {
        setSyncStatus('Sincronizado', 'ok');
        return;
      }

      const remoteState = {
        groups: Array.isArray(data.groups) && data.groups.length ? data.groups : [...defaults],
        events: remoteEvents,
        hiddenGroups: data.hiddenGroups
      };
      const hadLegacyNames = remoteState.groups.some(group => GROUP_RENAMES[group]) || remoteState.events.some(event => GROUP_RENAMES[event.group]);
      state = normalizeGroupNames(remoteState);
      remoteUpdatedAt = data.updatedAt || '';
      localStorage.setItem(MIGRATION_KEY, '1');
      localPersist();
      render();
      if (hadLegacyNames) await pushRemote(true);
      else setSyncStatus('Sincronizado', 'ok');
    } catch (err) {
      const msg = String(err?.message || err);
      if (/storage_not_configured|storage|blob|token|store|configured/i.test(msg)) setSyncStatus('Conecte o Vercel Blob', 'err');
      else if (/unauthorized|401/i.test(msg)) setSyncStatus('Sessão expirada', 'err');
      else setSyncStatus(manual ? 'Falha ao atualizar' : 'Somente neste aparelho', 'err');
    }
  }

  addStyles();
  setupImportModal();
  setupSyncUi();
  render();
  pullRemote(false);
  setInterval(() => pullRemote(false), 15000);
  window.addEventListener('focus', () => pullRemote(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pullRemote(false); });
})();
