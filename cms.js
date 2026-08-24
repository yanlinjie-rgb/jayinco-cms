/* ============================================================
 *  JAYINCO CMS — 前台动态渲染层
 *  依赖：cms-config.js、cms-client.js（先加载）
 *  行为：
 *   - 未配置 Supabase 时直接 return，前台保持原有静态内容（兜底）。
 *   - 配置后：注入站点内容(site_content)、产品列表、产品详情、
 *     文章列表、文章详情。
 * ============================================================ */
(function () {
  const C = window.CMS;
  if (!C || !C.configured || !C.sb) { return; }   // 静态兜底
  const sb = C.sb;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 分类映射（与后台 admin 保持一致）
  const CATS = [
    ['wire-to-board', '线对板连接器', 'Wire-to-Board'],
    ['board-to-board', '板对板连接器', 'Board-to-Board'],
    ['wire-to-wire', '线对线连接器', 'Wire-to-Wire'],
    ['usb', 'USB 连接器', 'USB Connectors'],
    ['ffc-fpc', 'FFC/FPC 连接器', 'FFC/FPC'],
    ['dc-jack', 'DC 电源插座', 'DC Jack'],
    ['card-holder', '卡座系列', 'Card Holders'],
    ['rf-coaxial', 'RF 射频同轴', 'RF Coaxial'],
    ['battery-holder', '电池座', 'Battery Holder'],
    ['hdmi', 'HDMI 连接器', 'HDMI'],
    ['earphone-jack', '耳机插座', 'Earphone Jack'],
    ['ac-dc-power', 'AC/DC 电源连接器', 'AC/DC Power'],
    ['circular', '圆形连接器', 'Circular'],
    ['terminal-block', '端子台', 'Terminal Block'],
    ['automotive', '汽车连接器', 'Automotive'],
    ['io-connector', 'I/O 连接器', 'I/O Connector'],
    ['antenna', '天线连接器', 'Antenna'],
    ['pcb-socket', 'PCB 插座', 'PCB Socket'],
    ['industrial', '工业连接器', 'Industrial'],
    ['fiber', '光纤连接器', 'Fiber Optic']
  ];
  const catZh = c => (CATS.find(x => x[0] === c) || [, c, c])[1];
  const catEn = c => (CATS.find(x => x[0] === c) || [, c, c])[2];

  // ═══ 注入动态样式（自包含，避免依赖各页 CSS） ═══
  const STYLE = `
  .cms-loading{text-align:center;color:var(--muted);padding:40px;font-size:14px;}
  .cms-filter{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px;}
  .cms-chip{padding:7px 16px;border:1.5px solid var(--line);border-radius:20px;font-size:13px;font-weight:600;color:var(--muted);background:#fff;cursor:pointer;transition:.15s;}
  .cms-chip:hover{border-color:var(--primary);color:var(--primary);}
  .cms-chip.active{background:var(--primary);border-color:var(--primary);color:#fff;}
  .cms-grid{display:flex;flex-direction:column;gap:18px;}
  .cms-pcard{display:flex;background:#fff;border:1.5px solid var(--line);border-radius:6px;overflow:hidden;transition:.25s;cursor:pointer;text-decoration:none;color:inherit;min-height:190px;}
  .cms-pcard:hover{box-shadow:0 4px 20px rgba(226,35,26,.07);border-color:var(--primary);}
  .cms-pcard-img{width:240px;min-height:190px;background:#f5f4f3;display:grid;place-items:center;flex-shrink:0;border-right:1.5px solid var(--line);padding:18px;}
  .cms-pcard-img img{max-width:170px;max-height:150px;object-fit:contain;}
  .cms-pcard-img svg{width:110px;height:95px;stroke:#E2231A;fill:none;stroke-width:1.2;opacity:.3;}
  .cms-pcard-body{flex:1;padding:20px 24px;display:flex;flex-direction:column;min-width:0;}
  .cms-pcard-body h3{font-size:18px;font-weight:800;color:#1a1a1a;margin-bottom:10px;line-height:1.3;}
  .cms-specs{display:grid;grid-template-columns:auto 1fr;gap:5px 16px;margin-bottom:10px;}
  .cms-spec-label{font-size:13px;font-weight:700;color:#666;}
  .cms-spec-value{font-size:13px;color:#1a1a1a;}
  .cms-desc{font-size:13px;color:#666;line-height:1.6;margin-bottom:12px;flex:1;overflow:hidden;}
  .cms-actions{display:flex;gap:10px;margin-top:auto;}
  .cms-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:4px;font-size:12.5px;font-weight:700;text-decoration:none;transition:.2s;border:1.5px solid var(--primary);}
  .cms-btn-p{background:#E2231A;color:#fff;}
  .cms-btn-p:hover{background:#B71C1C;}
  .cms-btn-o{background:#fff;color:#E2231A;}
  .cms-btn-o:hover{background:rgba(226,35,26,.05);}
  /* 详情页 */
  .cms-detail-top{display:flex;gap:44px;align-items:flex-start;flex-wrap:wrap;}
  .cms-detail-img{width:420px;flex-shrink:0;background:#fff;border:1.5px solid var(--line);border-radius:6px;padding:36px;display:grid;place-items:center;position:relative;}
  .cms-detail-img img{max-width:340px;max-height:320px;object-fit:contain;}
  .cms-detail-img svg{width:220px;height:200px;stroke:#E2231A;fill:none;stroke-width:1.2;opacity:.3;}
  .cms-detail-info{flex:1;min-width:0;}
  .cms-detail-info h1{font-size:25px;font-weight:900;color:#1a1a1a;line-height:1.35;margin-bottom:16px;}
  .cms-info-grid{display:grid;grid-template-columns:auto 1fr;gap:8px 20px;margin-bottom:18px;}
  .cms-info-grid .l{font-size:13px;font-weight:700;color:#666;}
  .cms-info-grid .v{font-size:13.5px;color:#1a1a1a;}
  .cms-ops{display:flex;flex-wrap:wrap;gap:12px;}
  .cms-op{display:inline-flex;align-items:center;gap:7px;padding:11px 22px;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;border:2px solid transparent;}
  .cms-op-rc{background:#E2231A;color:#fff;}
  .cms-op-blue{background:#1976d2;color:#fff;}
  .cms-op-green{background:#2e7d32;color:#fff;}
  .cms-op-gray{background:#eee;color:#444;border-color:#ddd;}
  .cms-redlabel{display:inline-block;background:#E2231A;color:#fff;font-weight:800;font-size:16px;padding:10px 26px;position:relative;clip-path:polygon(0 0,100% 0,calc(100% - 16px) 100%,0 100%);margin:30px 0 0;}
  .cms-redlabel .en{opacity:.85;font-weight:700;}
  .cms-stripe{background:repeating-linear-gradient(45deg,#fff,#fff 14px,#faf6f6 14px,#faf6f6 28px);border:1.5px solid var(--line);border-top:none;padding:24px 26px;border-radius:0 0 6px 6px;}
  .cms-rich{font-size:14px;color:#333;line-height:1.8;}
  .cms-rich p{margin-bottom:10px;}
  .cms-rich ul{margin:0 0 10px 20px;}
  .cms-rich img{max-width:100%;border:1px solid var(--line);border-radius:4px;margin:8px 0;}
  .cms-mc-table{width:100%;border-collapse:collapse;background:#fff;}
  .cms-mc-table th{background:#f5f4f3;font-size:13px;font-weight:800;color:#666;text-align:left;padding:10px 14px;border:1px solid var(--line);white-space:nowrap;}
  .cms-mc-table td{font-size:13px;color:#1a1a1a;padding:10px 14px;border:1px solid var(--line);}
  .cms-mc-table a{color:#E2231A;font-weight:700;text-decoration:none;}
  .cms-dim img{max-width:100%;border:1px solid var(--line);border-radius:6px;}
  .cms-related{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:18px;}
  .cms-rel-card{border:1.5px solid var(--line);border-radius:6px;padding:14px;text-decoration:none;color:inherit;display:flex;gap:12px;align-items:center;transition:.2s;}
  .cms-rel-card:hover{border-color:var(--primary);box-shadow:0 4px 20px rgba(226,35,26,.07);}
  .cms-rel-card img{width:54px;height:54px;object-fit:contain;border:1px solid var(--line);border-radius:4px;}
  .cms-rel-card .t{font-size:13px;font-weight:700;}
  /* 新闻 */
  .cms-news{display:flex;gap:20px;padding:22px 0;border-bottom:1px solid var(--line);cursor:pointer;}
  .cms-news:hover .cms-news-t{color:var(--primary);}
  .cms-news-img{width:160px;height:110px;flex-shrink:0;border-radius:8px;overflow:hidden;background:#f5f4f3;display:grid;place-items:center;}
  .cms-news-img img{width:100%;height:100%;object-fit:cover;}
  .cms-news-img svg{width:50px;height:40px;stroke:#E2231A;fill:none;stroke-width:1.2;opacity:.3;}
  .cms-news-body{flex:1;}
  .cms-news-date{font-size:12.5px;font-weight:700;color:var(--primary);}
  .cms-news-t{font-size:17px;font-weight:700;color:#1a1a1a;margin:4px 0 6px;}
  .cms-news-d{font-size:13.5px;color:#666;line-height:1.6;}
  /* 文章详情 */
  .cms-article-cover{width:100%;max-height:380px;object-fit:cover;border-radius:8px;margin:20px 0;}
  .cms-article-body{font-size:15px;color:#333;line-height:1.9;}
  .cms-article-body p{margin-bottom:14px;}
  .cms-article-body img{max-width:100%;border-radius:6px;margin:10px 0;}
  .cms-article-body h2,.cms-article-body h3{margin:20px 0 10px;}
  .cms-notfound{text-align:center;padding:60px 20px;color:#666;}
  @media(max-width:760px){.cms-pcard,.cms-detail-top{flex-direction:column;}.cms-pcard-img,.cms-detail-img{width:100%;min-height:170px;}.cms-news{flex-direction:column;}.cms-news-img{width:100%;height:180px;}}
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // ═══ 站点内容注入 ═══
  async function applyContent() {
    try {
      const { data, error } = await sb.from('site_content').select('*');
      if (error || !data) return;
      data.forEach(c => {
        if (c.type === 'image') {
          const img = $(`img[data-cms-img="${c.key}"]`);
          if (img && c.value_zh) img.src = c.value_zh;
          const bg = $(`[data-cms-bg="${c.key}"]`);
          if (bg && c.value_zh) bg.style.backgroundImage = `url('${c.value_zh}')`;
        } else {
          const el = $(`[data-cms="${c.key}"]`);
          if (!el) return;
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { el.value = c.value_zh || ''; return; }
          const zh = $('.zh', el), en = $('.en', el);
          if (zh) zh.textContent = c.value_zh || '';
          if (en) en.textContent = c.value_en || '';
          if (!zh && !en) el.textContent = c.value_zh || '';
        }
      });
    } catch (e) { /* ignore */ }
  }

  // ═══ 产品列表（products.html） ═══
  async function renderProducts() {
    const wrap = $('#cmsProdWrap');
    if (!wrap) return;
    const { data, error } = await sb.from('products').select('*').order('sort_order').order('created_at');
    if (error || !data || !data.length) return; // 保留静态兜底

    // 隐藏静态列表与分页（保留分类图标网格作为筛选器）
    const staticList = $('#staticProdList'); if (staticList) staticList.style.display = 'none';
    const pag = $('.pagination'); if (pag) pag.style.display = 'none';

    const cardHtml = data.map(p => productCard(p)).join('');
    wrap.innerHTML = '<div class="cms-grid" id="cmsGrid">' + cardHtml + '</div>';
    wrap.style.display = 'block';

    // 用现有分类图标网格做筛选：插入"全部"项并绑定点击
    const grid = $('.cat-grid');
    if (grid) {
      const all = document.createElement('a');
      all.className = 'cat-item active';
      all.href = '#';
      all.dataset.cat = '__all__';
      all.innerHTML = '<span class="cat-name"><span class="zh">全部产品</span><span class="en block">All</span></span>';
      grid.insertBefore(all, grid.firstChild);

      $$('.cat-item', grid).forEach(item => {
        item.addEventListener('click', e => {
          e.preventDefault();
          $$('.cat-item', grid).forEach(x => x.classList.remove('active'));
          item.classList.add('active');
          const cat = item.dataset.cat;
          $$('.cms-pcard', wrap).forEach(card => {
            card.style.display = (cat === '__all__' || card.dataset.cat === cat) ? '' : 'none';
          });
        });
      });
    }
  }

  function productCard(p) {
    const img = p.image_url
      ? `<img src="${esc(p.image_url)}" onerror="this.outerHTML='${placeholderSvg()}'">`
      : placeholderSvg();
    const pdf = p.pdf_url ? `<a class="cms-btn cms-btn-p" href="${esc(p.pdf_url)}" target="_blank" onclick="event.stopPropagation()"><span class="zh">PDF下载</span><span class="en">PDF</span></a>` : '';
    return `<div class="cms-pcard" data-cat="${esc(p.category)}" onclick="location.href='product-detail.html?id=${esc(p.id)}'">
      <div class="cms-pcard-img">${img}</div>
      <div class="cms-pcard-body">
        <h3><span class="zh">${esc(p.name_zh)}</span><span class="en block">${esc(p.name_en)}</span></h3>
        <div class="cms-specs">
          <span class="cms-spec-label"><span class="zh">规格：</span><span class="en">Spec:</span></span><span class="cms-spec-value">${esc(p.spec || '-')}</span>
          <span class="cms-spec-label"><span class="zh">型号：</span><span class="en">Model:</span></span><span class="cms-spec-value">${esc(p.model || '-')}</span>
          <span class="cms-spec-label"><span class="zh">包装：</span><span class="en">Pkg:</span></span><span class="cms-spec-value">${esc(p.packaging || '-')}</span>
        </div>
        <p class="cms-desc"><span class="zh">${esc(p.description_zh)}</span><span class="en block">${esc(p.description_en)}</span></p>
        <div class="cms-actions">${pdf}<span class="cms-btn cms-btn-o"><span class="zh">查看详情</span><span class="en">Details</span></span></div>
      </div>
    </div>`;
  }

  function placeholderSvg() {
    return `<svg viewBox="0 0 160 120"><rect x="30" y="25" width="45" height="35" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="100" y="25" width="32" height="35" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="112" cy="37" r="4" stroke="currentColor" stroke-width="1.5"/><circle cx="122" cy="37" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M75 42h25" stroke="currentColor" stroke-width="2"/></svg>`;
  }

  // ═══ 产品详情（product-detail.html） ═══
  async function renderProductDetail() {
    const host = $('#cmsDetail');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { host.innerHTML = '<div class="cms-notfound">未指定产品</div>'; return; }
    const { data: p, error } = await sb.from('products').select('*').eq('id', id).single();
    if (error || !p) { host.innerHTML = '<div class="cms-notfound">未找到该产品，或尚未配置后台。</div>'; return; }

    const img = p.image_url ? `<img src="${esc(p.image_url)}" onerror="this.outerHTML='${placeholderSvg()}'">` : placeholderSvg();
    const pdf = p.pdf_url ? `<a class="cms-op cms-op-green" href="${esc(p.pdf_url)}" target="_blank"><span class="zh">PDF文件下载</span><span class="en">PDF Download</span></a>` : '';
    const model3d = (Array.isArray(p.molde_code) && p.molde_code.some(r => r.model3d)) ? `<a class="cms-op cms-op-gray" href="#"><span class="zh">3D下载</span><span class="en">3D</span></a>` : '';

    // 基本说明
    const biZh = p.basic_info_zh || `<p>${esc(p.description_zh)}</p>`;
    const biEn = p.basic_info_en || `<p>${esc(p.description_en)}</p>`;
    // Molde Code
    const mc = Array.isArray(p.molde_code) ? p.molde_code : [];
    let mcHtml = '';
    if (mc.length) {
      const rows = mc.map(r => `<tr>
        <td>${esc(r.no || '')}</td><td>${esc(r.code || '')}</td><td>${esc(r.spec || '')}</td>
        <td>${r.pdf ? `<a href="${esc(r.pdf)}" target="_blank"><span class="zh">下载</span><span class="en">PDF</span></a>` : '-'}</td>
        <td>${r.model3d ? `<a href="${esc(r.model3d)}" target="_blank"><span class="zh">下载</span><span class="en">3D</span></a>` : '-'}</td>
      </tr>`).join('');
      mcHtml = `<div class="cms-redlabel"><span class="zh">Molde Code</span><span class="en">Molde Code</span></div>
        <div class="cms-stripe"><table class="cms-mc-table"><thead><tr>
          <th><span class="zh">NO.</span><span class="en">NO.</span></th><th><span class="zh">Molde Code</span><span class="en">Code</span></th>
          <th><span class="zh">规格</span><span class="en">Spec</span></th><th>PDF</th><th>3D</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    // 尺寸图
    const dimHtml = p.dimensions_img ? `<div class="cms-redlabel"><span class="zh">尺寸图</span><span class="en">Dimensions</span></div><div class="cms-stripe cms-dim"><img src="${esc(p.dimensions_img)}" alt="dimensions"></div>` : '';
    // 产品说明
    const pdZh = p.product_desc_zh || '';
    const pdEn = p.product_desc_en || '';
    const pdHtml = (pdZh || pdEn) ? `<div class="cms-redlabel"><span class="zh">产品说明</span><span class="en">Description</span></div><div class="cms-stripe"><div class="cms-rich"><span class="zh">${pdZh}</span><span class="en block">${pdEn}</span></div></div>` : '';

    // 相关产品
    let relHtml = '';
    const relIds = Array.isArray(p.related) ? p.related : [];
    if (relIds.length) {
      const { data: rel } = await sb.from('products').select('*').in('id', relIds);
      if (rel && rel.length) {
        const cards = rel.map(r => {
          const ri = r.image_url ? `<img src="${esc(r.image_url)}" onerror="this.style.display='none'">` : '';
          return `<a class="cms-rel-card" href="product-detail.html?id=${esc(r.id)}">
            ${ri}<div class="t"><span class="zh">${esc(r.name_zh)}</span><span class="en block">${esc(r.name_en)}</span></div></a>`;
        }).join('');
        relHtml = `<div class="cms-redlabel"><span class="zh">相关产品</span><span class="en">Related</span></div><div class="cms-related">${cards}</div>`;
      }
    }

    host.innerHTML = `
      <div class="cms-detail-top">
        <div class="cms-detail-img">${img}</div>
        <div class="cms-detail-info">
          <h1><span class="zh">${esc(p.name_zh)}</span><span class="en block">${esc(p.name_en)}</span></h1>
          <div class="cms-info-grid">
            <span class="l"><span class="zh">规格：</span><span class="en">Spec:</span></span><span class="v">${esc(p.spec || '-')}</span>
            <span class="l"><span class="zh">型号：</span><span class="en">Model:</span></span><span class="v">${esc(p.model || '-')}</span>
            <span class="l"><span class="zh">包装：</span><span class="en">Pkg:</span></span><span class="v">${esc(p.packaging || '-')}</span>
            <span class="l"><span class="zh">描述：</span><span class="en">Desc:</span></span><span class="v">${esc(p.description_zh || p.description_en || '-')}</span>
          </div>
          <div class="cms-ops">
            <a class="cms-op cms-op-rc" href="contact.html"><span class="zh">在线咨询</span><span class="en">Inquiry</span></a>
            <a class="cms-op cms-op-blue" href="contact.html"><span class="zh">技术支持</span><span class="en">Support</span></a>
            ${pdf}${model3d}
          </div>
        </div>
      </div>
      <div class="cms-redlabel"><span class="zh">基本说明</span><span class="en">Basic Info</span></div>
      <div class="cms-stripe"><div class="cms-rich"><span class="zh">${biZh}</span><span class="en block">${biEn}</span></div></div>
      ${mcHtml}${dimHtml}${pdHtml}${relHtml}
    `;
    // 隐藏静态兜底内容
    ['staticBreadcrumb', 'staticDetail', 'staticSections', 'staticRelated'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  }

  // ═══ 文章列表（news.html） ═══
  async function renderNews() {
    const host = $('#cmsNewsList');
    if (!host) return;
    const { data, error } = await sb.from('articles').select('*').eq('published', true).order('published_at', { ascending: false });
    if (error || !data || !data.length) return; // 静态兜底

    const staticList = $('#staticNewsList'); if (staticList) staticList.style.display = 'none';
    host.innerHTML = data.map(a => {
      const img = a.cover_image ? `<img src="${esc(a.cover_image)}" onerror="this.outerHTML='${newsPlaceholder()}'">` : newsPlaceholder();
      const date = a.published_at ? a.published_at.slice(0, 10) : '';
      const d = (a.body_zh || a.body_en || '').replace(/<[^>]+>/g, '').slice(0, 90);
      return `<div class="cms-news" onclick="location.href='article.html?id=${esc(a.id)}'">
        <div class="cms-news-img">${img}</div>
        <div class="cms-news-body">
          <div class="cms-news-date">${date}</div>
          <div class="cms-news-t"><span class="zh">${esc(a.title_zh)}</span><span class="en block">${esc(a.title_en)}</span></div>
          <div class="cms-news-d"><span class="zh">${esc(d)}</span><span class="en block">${esc((a.body_en || '').replace(/<[^>]+>/g, '').slice(0, 90))}</span></div>
        </div>
      </div>`;
    }).join('');
    host.style.display = 'block';
  }
  function newsPlaceholder() {
    return `<svg viewBox="0 0 80 60"><rect x="10" y="14" width="60" height="40" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="18" y1="26" x2="62" y2="26" stroke="currentColor" stroke-width="1.5"/><line x1="18" y1="34" x2="62" y2="34" stroke="currentColor" stroke-width="1.5"/><line x1="18" y1="42" x2="44" y2="42" stroke="currentColor" stroke-width="1.5"/></svg>`;
  }

  // ═══ 文章详情（article.html） ═══
  async function renderArticle() {
    const host = $('#cmsArticle');
    if (!host) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { host.innerHTML = '<div class="cms-notfound">未指定文章</div>'; return; }
    const { data: a, error } = await sb.from('articles').select('*').eq('id', id).single();
    if (error || !a) { host.innerHTML = '<div class="cms-notfound">未找到该文章。</div>'; return; }
    const cover = a.cover_image ? `<img class="cms-article-cover" src="${esc(a.cover_image)}" alt="">` : '';
    const date = a.published_at ? a.published_at.slice(0, 10) : '';
    host.innerHTML = `
      <div class="cms-news-date">${date}</div>
      <h1 style="font-size:28px;font-weight:900;margin:6px 0 16px;"><span class="zh">${esc(a.title_zh)}</span><span class="en block">${esc(a.title_en)}</span></h1>
      ${cover}
      <div class="cms-article-body"><span class="zh">${a.body_zh || ''}</span><span class="en block">${a.body_en || ''}</span></div>
    `;
  }

  // ═══ 启动 ═══
  function start() {
    applyContent();
    renderProducts();
    renderProductDetail();
    renderNews();
    renderArticle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
