/* Only used by the empty, signed-success relay. No parent document access. */
(() => {
  if (!document.cookie.split(';').some(c => c.trim() === 'rn_analytics_choice=accepted')) return;
  const payload = JSON.parse(document.getElementById('completed-outcomes').textContent);
  const fresh = [];
  try {
    for (const event of payload.events) {
      const key = 'rn_outcome_' + event.id;
      if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, 'sent'); fresh.push(event); }
    }
  } catch (_) { return; }
  if (!fresh.length) return;
  window.dataLayer = [];
  function gtag(){window.dataLayer.push(arguments);}
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('js',new Date());
  gtag('consent','update',{analytics_storage:'granted'});
  gtag('config','G-V2RLYZNG3S',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:payload.location,page_referrer:'',page_title:'RoomsNow'});
  for (const event of fresh) gtag('event',event.event,{send_to:'G-V2RLYZNG3S',page_location:payload.location,page_referrer:'',page_title:'RoomsNow'});
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-V2RLYZNG3S';
  document.head.appendChild(script);
})();
