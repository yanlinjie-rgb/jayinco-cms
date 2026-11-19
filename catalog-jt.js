/* ============================================================
 *  JAYINCONN 产品目录：分类树 + 参数筛选 + 搜索 + 分页
 *  数据来自 Worker /api/catalog（D1）
 * ============================================================ */
(function () {
  'use strict';
  var API = (window.CMS_CONFIG && window.CMS_CONFIG.API_BASE) || 'https://api.jayinconn.com';
  var IMG = function (k) { return API + '/api/img?k=' + encodeURIComponent(k); };

  var state = { l1: '', l2: '', c3: '', q: '', page: 1, size: 60, f: {} };
  var cache = { categories: null };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function lang(k, zh, en) {
    return '<span class="zh">' + zh + '</span><span class="en">' + en + '</span>';
  }

  /* ---------- 分类 ---------- */
  function renderCats(cats) {
    cache.categories = cats;
    var l1s = cats.filter(function (c) { return c.level === 1; });
    var box = el('jtCats');
    if (!box) return;
    box.innerHTML = '<button class="jt-chip' + (state.l1 ? '' : ' on') + '" data-l1="">' +
      lang('', '全部分类', 'All') + '</button>' +
      l1s.map(function (c) {
        return '<button class="jt-chip' + (state.l1 === c.name ? ' on' : '') + '" data-l1="' + esc(c.name) + '">' + esc(c.name) + '</button>';
      }).join('');
    box.querySelectorAll('.jt-chip').forEach(function (b) {
      b.onclick = function () {
        state.l1 = b.getAttribute('data-l1');
        state.l2 = ''; state.c3 = ''; state.f = {}; state.page = 1;
        renderCats(cache.categories); load();
      };
    });

    /* 二三级 */
    var subs = el('jtSubs');
    if (!subs) return;
    if (!state.l1) { subs.innerHTML = ''; return; }
    var l2s = cats.filter(function (c) { return c.level === 2 && c.parent === state.l1; });
    var html = '<button class="jt-sub' + (state.l2 ? '' : ' on') + '" data-l2="">全部</button>' +
      l2s.map(function (c) {
        return '<button class="jt-sub' + (state.l2 === c.name ? ' on' : '') + '" data-l2="' + esc(c.name) + '">' + esc(c.name) + '</button>';
      }).join('');
    if (state.l2) {
      var l3s = cats.filter(function (c) { return c.level === 3 && c.parent === state.l1 + '/' + state.l2; });
      if (l3s.length) {
        html += '<select id="jtL3" class="jt-sel"><option value="">全部（' + l3s.length + ' 个子类）</option>' +
          l3s.map(function (c) {
            return '<option value="' + esc(c.name) + '"' + (state.c3 === c.name ? ' selected' : '') + '>' +
              esc(c.name) + (c.total ? '（' + c.total + '）' : '') + '</option>';
          }).join('') + '</select>';
      }
    }
    subs.innerHTML = html;
    subs.querySelectorAll('.jt-sub').forEach(function (b) {
      b.onclick = function () {
        state.l2 = b.getAttribute('data-l2'); state.c3 = ''; state.f = {}; state.page = 1;
        renderCats(cache.categories); load();
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
    if (!keys.length && !Object.keys(state.f).length) { box.innerHTML = ''; return; }
    var html = (Object.keys(state.f).length ? '<button class="jt-clear" id="jtClear">清除筛选 (' + Object.keys(state.f).length + ')</button>' : '');
    html += keys.slice(0, 6).map(function (k) {
      var vals = facets[k].slice(0, 14);
      return '<div class="jt-fgroup"><div class="jt-fk">' + esc(k) + '</div><div class="jt-fv">' +
        vals.map(function (v) {
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
      box.innerHTML = '<p style="grid-column:1/-1;padding:40px 0;color:var(--muted)">没有符合条件的产品</p>';
      return;
    }
    box.innerHTML = d.items.map(function (p) {
      var img = p.imgs && p.imgs.length
        ? '<img src="' + IMG(p.imgs[0]) + '" alt="' + esc(p.model) + '" loading="lazy" style="width:100%;height:100%;object-fit:contain">'
        : '<svg class="placeholder-svg" viewBox="0 0 160 120"><rect x="40" y="30" width="80" height="55" rx="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M55 50h50M55 62h34" stroke="currentColor" stroke-width="1.5" opacity=".4"/></svg>';
      var specs = Object.keys(p.params || {}).slice(0, 4).map(function (k) {
        return '<span class="spec-label">' + esc(k) + '</span>' + esc(p.params[k]);
      }).join('<br>');
      return '<a href="product-detail.html?id=' + encodeURIComponent(p.id) + '" class="prod-card">' +
        '<div class="prod-card-img" style="flex:0 0 200px">' + img + '</div>' +
        '<div class="prod-card-body">' +
          '<h3 style="margin:0 0 6px;font-size:16px">' + esc(p.model) + '</h3>' +
          '<p class="prod-desc" style="margin:0 0 10px;color:var(--muted);font-size:13px;line-height:1.6">' + esc(p.name) + '</p>' +
          '<div class="prod-specs" style="font-size:12px;line-height:1.9;color:var(--text-2)">' + specs + '</div>' +
        '</div></a>';
    }).join('');
  }

  function renderPager(d) {
    var box = el('jtPager');
    if (!box) return;
    var pages = Math.max(1, Math.ceil(d.total / d.size));
    if (pages <= 1) { box.innerHTML = ''; return; }
    var cur = d.page, out = [];
    function btn(p, label, on) {
      return '<button class="jt-pg' + (on ? ' on' : '') + '" data-p="' + p + '">' + label + '</button>';
    }
    out.push(btn(Math.max(1, cur - 1), '‹', false));
    var start = Math.max(1, cur - 3), end = Math.min(pages, start + 6);
    for (var i = start; i <= end; i++) out.push(btn(i, i, i === cur));
    out.push(btn(Math.min(pages, cur + 1), '›', false));
    box.innerHTML = out.join('') + '<span class="jt-pg-info">第 ' + cur + ' / ' + pages + ' 页，共 ' + d.total + ' 条</span>';
    box.querySelectorAll('.jt-pg').forEach(function (b) {
      b.onclick = function () {
        state.page = parseInt(b.getAttribute('data-p'), 10);
        load();
        var sec = document.querySelector('.prod-section');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      if (c) c.textContent = d.total + ' 个型号';
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
      if (d && d.ok) renderCats(d.categories || []);
      load();
    }).catch(function () { load(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
