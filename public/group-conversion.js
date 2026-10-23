(function () {
  const script = document.currentScript;
  const selector = script.dataset.selector || '.group-cta';
  const pageName = script.dataset.page || window.location.pathname;
  const groupName = script.dataset.group || 'Grupo de ofertas';
  const videoId = script.dataset.videoId || '';

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

  pushEvent('landing_page_view');
  document.querySelectorAll(selector).forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const conversionData = {
        event_category: 'group_entry',
        event_label: 'whatsapp',
        group_channel: 'whatsapp',
        cta_position: link.getAttribute('data-cta-position') || 'unknown',
        link_url: link.href
      };
      pushEvent('whatsapp_group_open', conversionData);
      pushEvent('whatsapp_group_click', conversionData);
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {
          content_name: groupName,
          lead_type: 'whatsapp_group_click'
        });
      }
      window.setTimeout(() => window.location.assign(link.href), 180);
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

})();
