/* ============================================================
 *  JAYINCO CMS — Supabase 客户端初始化（前台与后台共用）
 *  依赖：cms-config.js（先加载）
 *  暴露：window.CMS = { sb, ready, configured }
 * ============================================================ */
(function () {
  var cfg = window.CMS_CONFIG || {};
  var url = (cfg.SUPABASE_URL || '').trim();
  var key = (cfg.SUPABASE_ANON_KEY || '').trim();
  var configured = url && key && !/YOUR-/.test(url) && !/YOUR-/.test(key);

  var api = {
    configured: configured,
    url: url,
    key: key,
    bucket: cfg.BUCKET || 'cms-images',
    brand: cfg.BRAND || 'JAYINCO',
    sb: null
  };

  if (configured && typeof supabase !== 'undefined') {
    try {
      api.sb = supabase.createClient(url, key);
    } catch (e) {
      api.configured = false;
      console.warn('[CMS] Supabase 初始化失败：', e);
    }
  }
  window.CMS = api;
})();
