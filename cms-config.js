/* ============================================================
 *  JAYINCONN CMS 配置文件
 *  后端：Cloudflare Worker（jayinconn-api）+ D1 数据库（库名 jayinconn）
 *  - API_BASE  : Worker 的自定义域名
 *  - BRAND     : 后台登录页显示的名字
 *  图片上传会写进 GitHub 仓库的 uploads/ 目录，通过站点域名直接访问。
 * ============================================================ */
window.CMS_CONFIG = {
  API_BASE: 'https://api.jayinconn.com',
  BUCKET:   'uploads',

  // 后台登录页提示（可选）
  BRAND: 'JAYINCONN'
};
