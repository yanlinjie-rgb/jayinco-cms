/* ============================================================
 *  JAYINCO CMS 配置文件
 *  把下面两处替换成你自己的 Supabase 项目信息：
 *    Supabase 控制台 → Project Settings → API
 *    - SUPABASE_URL      = Project URL
 *    - SUPABASE_ANON_KEY = anon public key（可放前端，已配 RLS）
 *  存储桶名称保持 cms-images（与 supabase-schema.sql 一致）。
 *  配置为空（含 YOUR-）时，前台会自动跳过动态渲染，使用静态兜底内容。
 * ============================================================ */
window.CMS_CONFIG = {
  SUPABASE_URL:      'https://rxbjqkxduhwofsnlpqki.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4Ympxa3hkdWh3b2ZzbmxwcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTMzMzEsImV4cCI6MjEwMzA2OTMzMX0.sxLFi02nVrvU5YYOW9VUzr5OzgbopINgUoLbi8dDPnI',
  BUCKET:            'cms-images',

  // 后台登录页提示（可选）
  BRAND: 'JAYINCO 佳盈盛电子'
};
