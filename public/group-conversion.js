(function () {
  const script = document.currentScript;
  const selector = script.dataset.selector || '.group-cta';
  const pageName = script.dataset.page || window.location.pathname;
  const groupName = script.dataset.group || 'Grupo de ofertas';
  const groupUrl = script.dataset.url || document.querySelector(selector)?.href || '';
  const videoId = script.dataset.videoId || '';
  const pendingKey = `groupJoinPending:${pageName}`;
  const confirmedKey = `groupJoinConfirmed:${pageName}`;

  window.dataLayer = window.dataLayer || [];

  function attributionData() {
    const params = new URLSearchParams(window.location.search);
    return {
      page_name: pageName,
      page_path: window.location.pathname,
      group_name: groupName,
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined
    };
  }

  function pushEvent(name, extra) {
    window.dataLayer.push(Object.assign({ event: name }, attributionData(), extra || {}));
  }

  function createConfirmation() {
    if (document.getElementById('joinConfirmation')) return;
    const panel = document.createElement('aside');
    panel.id = 'joinConfirmation';
    panel.className = 'join-confirmation';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = `
      <button class="join-confirmation-close" type="button" aria-label="Fechar">×</button>
      <strong>Conseguiu entrar no grupo?</strong>
      <p>A entrada só é concluída depois de tocar em <b>“Entrar no grupo”</b> no WhatsApp.</p>
      <div class="join-confirmation-actions">
        <button class="join-confirmed" type="button">Sim, entrei</button>
        <a class="join-retry" href="${groupUrl}" target="_blank" rel="noopener noreferrer">Abrir novamente</a>
      </div>`;
    document.body.appendChild(panel);

    panel.querySelector('.join-confirmation-close').addEventListener('click', () => {
      panel.classList.remove('show');
      sessionStorage.removeItem(pendingKey);
    });
    panel.querySelector('.join-retry').addEventListener('click', () => {
      sessionStorage.setItem(pendingKey, String(Date.now()));
      pushEvent('whatsapp_group_open', { cta_position: 'confirmation_retry', link_url: groupUrl });
    });
    panel.querySelector('.join-confirmed').addEventListener('click', () => {
      if (sessionStorage.getItem(confirmedKey) === '1') {
        panel.classList.remove('show');
        return;
      }
      sessionStorage.setItem(confirmedKey, '1');
      sessionStorage.removeItem(pendingKey);
      pushEvent('whatsapp_group_join_confirmed');
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'WhatsAppGroupJoinConfirmed', { content_name: groupName });
        window.fbq('track', 'Lead', { content_name: groupName, lead_type: 'whatsapp_group_join_confirmed' });
      }
      panel.querySelector('strong').textContent = 'Entrada confirmada!';
      panel.querySelector('p').textContent = 'Obrigado. Agora a mensuração considera uma entrada confirmada, não apenas o clique.';
      panel.querySelector('.join-confirmation-actions').hidden = true;
      setTimeout(() => panel.classList.remove('show'), 2600);
    });
  }

  function showConfirmation() {
    const stamp = Number(sessionStorage.getItem(pendingKey) || 0);
    if (!stamp || Date.now() - stamp > 30 * 60 * 1000 || sessionStorage.getItem(confirmedKey) === '1') return;
    createConfirmation();
    document.getElementById('joinConfirmation').classList.add('show');
  }

  pushEvent('landing_page_view');
  document.querySelectorAll(selector).forEach(link => {
    link.addEventListener('click', () => {
      sessionStorage.removeItem(confirmedKey);
      sessionStorage.setItem(pendingKey, String(Date.now()));
      pushEvent('whatsapp_group_open', {
        event_category: 'group_entry',
        event_label: 'whatsapp',
        group_channel: 'whatsapp',
        cta_position: link.getAttribute('data-cta-position') || 'unknown',
        link_url: link.href
      });
      setTimeout(showConfirmation, 900);
    });
  });

  if (videoId) {
    const video = document.getElementById(videoId);
    let tracked = false;
    if (video) {
      video.addEventListener('play', () => {
        if (!tracked) {
          pushEvent('group_demo_video_play');
          tracked = true;
        }
      });
      video.play().catch(() => {});
    }
  }

  window.addEventListener('focus', showConfirmation);
  window.addEventListener('pageshow', showConfirmation);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) showConfirmation();
  });
})();
