/* ============================================================
 *  JAYINCONN 产品中心：分类卡片 + 参数筛选 + 搜索 + 分页（10/页）
 *  数据：Worker /api/catalog（D1）
 * ============================================================ */
(function () {
  'use strict';
  var API = (window.CMS_CONFIG && window.CMS_CONFIG.API_BASE) || 'https://api.jayinconn.com';
  var IMG = function (k) { return API + '/api/img?k=' + encodeURIComponent(k); };
  var PAGE_SIZE = 10;

  var state = { l1: '', l2: '', c3: '', q: '', page: 1, size: PAGE_SIZE, f: {} };
  var cache = { categories: null, counts: {} };

  var ICONS = [
    /* 天线 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M24 6v8" stroke-linecap="round"/><circle cx="24" cy="17" r="3"/><path d="M17 14c-3 4-3 10 0 14M31 14c3 4 3 10 0 14" stroke-linecap="round"/><path d="M12 10c-5 6-5 16 0 22M36 10c5 6 5 16 0 22" stroke-linecap="round" opacity=".55"/><path d="M24 20v22" stroke-width="2.4" stroke-linecap="round"/></svg>',
    /* 弹片顶针 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="14" y="30" width="20" height="9" rx="2"/><path d="M24 30V18" stroke-width="2.4" stroke-linecap="round"/><path d="M19 18h10l-5-9z"/></svg>',
    /* 线转接 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="24" r="5"/><rect x="30" y="17" width="10" height="14" rx="2"/><path d="M17 24h13" stroke-width="2.2"/></svg>',
    /* 滤波器 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="17" width="32" height="14" rx="3"/><path d="M15 17v14M22 17v14M29 17v14M36 17v14" opacity=".45"/></svg>',
    /* 开关 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="16" width="30" height="16" rx="3"/><circle cx="19" cy="24" r="3"/><circle cx="29" cy="24" r="3"/><path d="M19 24h7"/></svg>',
    /* 数据连接器 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="10" y="18" width="20" height="13" rx="2"/><path d="M30 22h4v5h-4"/><path d="M15 24v5M20 24v5M25 24v5" opacity=".5"/></svg>',
    /* 排针排母 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="19" width="32" height="10" rx="2"/><path d="M14 19v-5M22 19v-5M30 19v-5M38 19v-5" stroke-width="2"/><path d="M14 29v5M22 29v5M30 29v5M38 29v5" stroke-width="2" opacity=".5"/></svg>',
    /* 线束 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 16c10 0 12 16 22 16h10"/><path d="M8 32c10 0 12-16 22-16h10"/><rect x="34" y="26" width="8" height="12" rx="2"/></svg>',
    /* 定制 */'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="24" cy="24" r="6"/><path d="M24 8v5M24 35v5M8 24h5M35 24h5M13 13l3.5 3.5M31.5 31.5L35 35M35 13l-3.5 3.5M16.5 31.5L13 35" stroke-linecap="round"/></svg>'
  ];

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  /* ---------- 一级分类卡片 ---------- */
  function renderCats(cats, counts) {
    cache.categories = cats;
    cache.counts = counts || {};
    var box = el('jtCats');
    if (!box) return;
    var l1s = cats.filter(function (c) { return c.level === 1; });
    var allCount = Object.keys(cache.counts).reduce(function (a, k) { return a + cache.counts[k]; }, 0);

    var html = '<button class="jt-cat' + (state.l1 ? '' : ' on') + '" data-l1="">' +
      '<span class="jt-cat-ico"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="13" height="13" rx="2"/><rect x="27" y="8" width="13" height="13" rx="2"/><rect x="8" y="27" width="13" height="13" rx="2"/><rect x="27" y="27" width="13" height="13" rx="2"/></svg></span>' +
      '<span class="jt-cat-t">全部产品</span><span class="jt-cat-n">' + allCount + '</span></button>';

    html += l1s.map(function (c, i) {
      var n = cache.counts[c.name] || 0;
      return '<button class="jt-cat' + (state.l1 === c.name ? ' on' : '') + '" data-l1="' + esc(c.name) + '">' +
        '<span class="jt-cat-ico">' + (ICONS[i % ICONS.length] || '') + '</span>' +
        '<span class="jt-cat-t">' + esc(c.name) + '</span>' +
        '<span class="jt-cat-n">' + n + '</span></button>';
    }).join('');
    box.innerHTML = html;

    box.querySelectorAll('.jt-cat').forEach(function (b) {
      b.onclick = function () {
        state.l1 = b.getAttribute('data-l1');
        state.l2 = ''; state.c3 = ''; state.f = {}; state.page = 1;
        renderCats(cache.categories, cache.counts);
        load();
      };
    });

    /* 二级 / 三级 */
    var subs = el('jtSubs');
    if (!subs) return;
    if (!state.l1) { subs.innerHTML = ''; subs.hidden = true; return; }
    subs.hidden = false;
    var l2s = cats.filter(function (c) { return c.level === 2 && c.parent === state.l1; });
    var h = '<span class="jt-sub-label">细分</span>' +
      '<button class="jt-sub' + (state.l2 ? '' : ' on') + '" data-l2="">全部</button>' +
      l2s.map(function (c) {
        return '<button class="jt-sub' + (state.l2 === c.name ? ' on' : '') + '" data-l2="' + esc(c.name) + '">' + esc(c.name) + '</button>';
      }).join('');
    if (state.l2) {
      var l3s = cats.filter(function (c) { return c.level === 3 && c.parent === state.l1 + '/' + state.l2; });
      if (l3s.length) {
        h += '<select id="jtL3" class="jt-sel"><option value="">全部子类（' + l3s.length + '）</option>' +
          l3s.map(function (c) {
            return '<option value="' + esc(c.name) + '"' + (state.c3 === c.name ? ' selected' : '') + '>' +
              esc(c.name) + (c.total ? '（' + c.total + '）' : '') + '</option>';
          }).join('') + '</select>';
      }
    }
    subs.innerHTML = h;
    subs.querySelectorAll('.jt-sub').forEach(function (b) {
      b.onclick = function () {
        state.l2 = b.getAttribute('data-l2'); state.c3 = ''; state.f = {}; state.page = 1;
        renderCats(cache.categories, cache.counts); load();
      };
    });
    var s3 = el('jtL3');
    if (s3) s3.onchange = function () { state.c3 = s3.value; state.page = 1; load(); };
  }

  /* ---------- 筛选 ---------- */
  function renderFilters(facets) {
    var box = el('jtFilters');
    if (!box) return;
    var keys = Object.keys(facets || {});
    var picked = Object.keys(state.f);
    if (!keys.length && !picked.length) { box.innerHTML = ''; return; }
    var html = '<div class="jt-fhead"><span>参数筛选</span>' +
      (picked.length ? '<button class="jt-clear" id="jtClear">清除 ' + picked.length + ' 项</button>' : '') + '</div>';
    html += keys.slice(0, 6).map(function (k) {
      return '<div class="jt-fgroup"><div class="jt-fk">' + esc(k) + '</div><div class="jt-fv">' +
        facets[k].slice(0, 14).map(function (v) {
          var on = state.f[k] === v.v;
          return '<button class="jt-f' + (on ? ' on' : '') + '" data-k="' + esc(k) + '" data-v="' + esc(v.v) + '">' +
            esc(v.v) + '<i>' + v.c + '</i></button>';
        }).join('') + '</div></div>';
    }).join('');
    box.innerHTML = html;
    box.querySelectorAll('.jt-f').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-k'), v = b.getAttribute('data-v');
        if (state.f[k] === v) delete state.f[k]; else state.f[k] = v;
        state.page = 1; load();
      };
    });
    var cl = el('jtClear');
    if (cl) cl.onclick = function () { state.f = {}; state.page = 1; load(); };
  }

  /* ---------- 列表 ---------- */
  function renderList(d) {
    var box = el('jtList');
    if (!box) return;
    if (!d.items.length) {
      box.innerHTML = '<p style="grid-column:1/-1;padding:50px 0;text-align:center;color:#8a94a6">没有符合条件的产品，换个筛选条件试试</p>';
      return;
    }
    box.innerHTML = d.items.map(function (p, i) {
      var img = p.imgs && p.imgs.length
        ? '<img src="' + IMG(p.imgs[0]) + '" alt="' + esc(p.model) + '" loading="lazy" onerror="this.outerHTML=this.dataset.ph" data-ph="&lt;svg class=&quot;placeholder-svg&quot; viewBox=&quot;0 0 160 120&quot;&gt;&lt;rect x=&quot;40&quot; y=&quot;30&quot; width=&quot;80&quot; height=&quot;55&quot; rx=&quot;4&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; fill=&quot;none&quot;/&gt;&lt;/svg&gt;">'
        : '<svg class="placeholder-svg" viewBox="0 0 160 120"><rect x="40" y="30" width="80" height="55" rx="4" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
      var specs = Object.keys(p.params || {}).slice(0, 4).map(function (k) {
        return '<span class="jt-sp"><em>' + esc(k) + '</em>' + esc(p.params[k]) + '</span>';
      }).join('');
      var no = (d.page - 1) * d.size + i + 1;
      return '<a href="product-detail.html?id=' + encodeURIComponent(p.id) + '" class="prod-card">' +
        '<div class="prod-card-img">' + img + '</div>' +
        '<div class="prod-card-body">' +
          '<div class="jt-card-top"><span class="jt-no">' + no + '</span>' +
            '<h3>' + esc(p.model) + '</h3></div>' +
          '<p class="prod-desc">' + esc(p.name) + '</p>' +
          '<div class="jt-specs">' + specs + '</div>' +
          '<div class="jt-card-foot"><span class="jt-cat-tag">' + esc(p.c3 || p.l2 || p.l1) + '</span>' +
            '<span class="jt-more">查看详情 →</span></div>' +
        '</div></a>';
    }).join('');
  }

  /* ---------- 分页 ---------- */
  function renderPager(d) {
    var box = el('jtPager');
    if (!box) return;
    var pages = Math.max(1, Math.ceil(d.total / d.size));
    var cur = d.page;
    var parts = ['<button class="jt-pg' + (cur <= 1 ? ' dis' : '') + '" data-p="' + Math.max(1, cur - 1) + '">上一页</button>'];

    var nums = [];
    if (pages <= 9) { for (var i = 1; i <= pages; i++) nums.push(i); }
    else {
      nums = [1];
      var s = Math.max(2, cur - 2), e = Math.min(pages - 1, cur + 2);
      if (s > 2) nums.push('...');
      for (var j = s; j <= e; j++) nums.push(j);
      if (e < pages - 1) nums.push('...');
      nums.push(pages);
    }
    nums.forEach(function (n) {
      if (n === '...') parts.push('<span class="jt-dots">…</span>');
      else parts.push('<button class="jt-pg' + (n === cur ? ' on' : '') + '" data-p="' + n + '">' + n + '</button>');
    });
    parts.push('<button class="jt-pg' + (cur >= pages ? ' dis' : '') + '" data-p="' + Math.min(pages, cur + 1) + '">下一页</button>');
    parts.push('<span class="jt-pg-info">共 ' + d.total + ' 个型号 / ' + pages + ' 页</span>');
    box.innerHTML = parts.join('');
    box.querySelectorAll('.jt-pg').forEach(function (b) {
      b.onclick = function () {
        if (b.className.indexOf('dis') > -1) return;
        state.page = parseInt(b.getAttribute('data-p'), 10);
        load();
        var sec = document.querySelector('.prod-section');
        if (sec) window.scrollTo({ top: sec.offsetTop - 80, behavior: 'smooth' });
      };
    });
  }

  /* ---------- 加载 ---------- */
  var reqId = 0;
  function load() {
    var my = ++reqId;
    var f = Object.keys(state.f).map(function (k) { return { k: k, v: state.f[k] }; });
    var url = API + '/api/catalog?size=' + state.size + '&page=' + state.page +
      '&l1=' + encodeURIComponent(state.l1) + '&l2=' + encodeURIComponent(state.l2) +
      '&c3=' + encodeURIComponent(state.c3) + '&q=' + encodeURIComponent(state.q) +
      '&f=' + encodeURIComponent(JSON.stringify(f));
    fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (my !== reqId || !d || !d.ok) return;
      renderFilters(d.facets || {});
      renderList(d);
      renderPager(d);
      var c = el('jtCount');
      if (c) c.textContent = '当前 ' + d.total + ' 个型号';
    }).catch(function () {});
  }

  function boot() {
    if (!el('jtList')) return;
    var s = el('jtSearch');
    if (s) {
      var t;
      s.oninput = function () {
        clearTimeout(t);
        t = setTimeout(function () { state.q = s.value.trim(); state.page = 1; load(); }, 320);
      };
    }
    fetch(API + '/api/catalog?size=1').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok) renderCats(d.categories || [], d.l1Counts || {});
      load();
    }).catch(function () { load(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
