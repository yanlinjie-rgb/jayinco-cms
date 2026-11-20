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




  /* ---------- 中英 ---------- */
  var KEYS_EN = {'频率':'Frequency','带宽':'Bandwidth','增益':'Gain','阻抗':'Impedance','尺寸':'Size',
    '额定电压':'Rated Voltage','额定电流':'Rated Current','间距':'Pitch','工作温度':'Operating Temp.',
    '安装方式':'Mounting','触点数量':'Contacts','排数':'Rows','插针结构':'Pin Type','连接线长':'Cable Length',
    'IPEX代数':'IPEX Gen.','塑高':'Insulator Height','锁定特性':'Locking','产品系列':'Series','接口类型':'Interface',
    '针脚数':'Pins','位数':'Positions','材质':'Material','颜色':'Color','封装':'Package','功率':'Power',
    '频率范围':'Frequency Range','驻波比':'VSWR','极化':'Polarization','增益(dBi)':'Gain (dBi)',
    '商品种类':'Product Type','圆针/方针':'Round/Square Pin','线材类型':'Cable Type','行距':'Row Pitch',
    '板上高度':'Height Above Board','触点类型':'Contact Type','总PIN数':'Total Pins','产品类型':'Type',
    '高度':'Height','长度':'Length','宽度':'Width','厚度':'Thickness','防水等级':'Waterproof',
    '特性':'Features','系列':'Series','接口':'Interface','额定功率':'Rated Power','接触电阻':'Contact Resistance'};
  function isEn() { return (window.JAYIN_LANG && window.JAYIN_LANG()) === 'en'; }
  function klabel(k) { return isEn() ? (KEYS_EN[k] || k) : k; }


  var VALS_EN = {'垂直':'Vertical','水平':'Horizontal','右旋圆极化(RHCP)':'RHCP','左旋圆极化(LHCP)':'LHCP',
    '圆极化':'Circular','线极化':'Linear','线性':'Linear','全向':'Omni-directional','定向':'Directional',
    '公头':'Plug','母头':'Jack','公针':'Male Pin','母座':'Female Socket','内针':'Male Pin','内孔':'Female Socket',
    '直式':'Straight','弯式':'Right Angle','直角':'Right Angle','双排':'Dual Row','单排':'Single Row',
    '贴片':'SMD','直插':'DIP','镀金':'Gold-plated','镀镍':'Nickel-plated','镀银':'Silver-plated',
    '铜':'Copper','黄铜':'Brass','磷青铜':'Phosphor Bronze','不锈钢':'Stainless Steel','塑胶':'Plastic','金属':'Metal',
    '黑色':'Black','白色':'White','红色':'Red','是':'Yes','否':'No','有':'Yes','无':'None','防水':'Waterproof',
    '不防水':'Non-waterproof','板端':'PCB','线端':'Cable','焊线式':'Solder','插件':'Through-hole',
    'SMA公头公针':'SMA Plug (Male Pin)','SMA内针':'SMA Male Pin','SMA内螺内针':'SMA Male / Male',
    'SMA内螺纹公针':'SMA Female Thread Male Pin','F头公针':'F Plug'};
  function vlabel(v) {
    if (!isEn()) return v;
    var s2 = String(v);
    if (VALS_EN[s2]) return VALS_EN[s2];
    Object.keys(VALS_EN).forEach(function (k) { s2 = s2.split(k).join(VALS_EN[k]); });
    return s2;
  }
  function clabel(c) { return (isEn() && c.name_en) ? c.name_en : c.name; }

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

    var html = '<button class="jt-cat' + (state.l1 ? '' : ' on') + '" data-l1=""><span class="jt-cat-t">全部产品</span><span class="jt-cat-n">' + allCount + '</span></button>';

    html += l1s.map(function (c, i) {
      var n = cache.counts[c.name] || 0;
      return '<button class="jt-cat' + (state.l1 === c.name ? ' on' : '') + '" data-l1="' + esc(c.name) + '"><span class="jt-cat-t">' + esc(clabel(c)) + '</span><span class="jt-cat-n">' + n + '</span></button>';
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
        return '<button class="jt-sub' + (state.l2 === c.name ? ' on' : '') + '" data-l2="' + esc(c.name) + '">' + esc(clabel(c)) + '</button>';
      }).join('');
    if (state.l2) {
      var l3s = cats.filter(function (c) { return c.level === 3 && c.parent === state.l1 + '/' + state.l2; });
      if (l3s.length) {
        h += '<select id="jtL3" class="jt-sel"><option value="">全部子类（' + l3s.length + '）</option>' +
          l3s.map(function (c) {
            return '<option value="' + esc(c.name) + '"' + (state.c3 === c.name ? ' selected' : '') + '>' +
              esc(clabel(c)) + (c.total ? '（' + c.total + '）' : '') + '</option>';
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
            esc(vlabel(v.v)) + '<i>' + v.c + '</i></button>';
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
        return '<span class="jt-sp"><em>' + esc(klabel(k)) + '</em>' + esc(vlabel(p.params[k])) + '</span>';
      }).join('');
      var no = (d.page - 1) * d.size + i + 1;
      return '<a href="product-detail.html?id=' + encodeURIComponent(p.id) + '" class="prod-card">' +
        '<div class="prod-card-img">' + img + '</div>' +
        '<div class="prod-card-body">' +
          '<div class="jt-card-top"><span class="jt-no">' + no + '</span>' +
            '<h3>' + esc(p.model) + '</h3></div>' +
          (isEn() ? '' : '<p class="prod-desc">' + esc(p.name) + '</p>') +
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
    parts.push('<span class="jt-pg-info">' + (isEn() ? ('Total ' + d.total + ' models / ' + pages + ' pages') : ('共 ' + d.total + ' 个型号 / ' + pages + ' 页')) + '</span>');
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
      if (c) c.textContent = (isEn() ? d.total + ' models' : '当前 ' + d.total + ' 个型号');
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

  document.addEventListener('jayin:lang', function () { load(); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
