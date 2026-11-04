(async function () {
  const img = document.getElementById('site-logo');
  const sb = window.supabaseClient;            // change if your supabase-config.js exports another name
  if (!img || !sb) return;
  try {
    const { data, error } = await sb.from('site_settings').select('*');
    if (error || !data) return;
    // works for key/value rows OR a single row with a logo_url column
    const row = data.find(r => r.setting_key === 'logo_url' || r.key === 'logo_url');
    const url = row ? (row.setting_value ?? row.value) : data[0]?.logo_url;
    if (url) { img.src = url; }
    img.hidden = false;
  } catch (e) { console.error('Logo load failed', e); }
})();