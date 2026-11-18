/* ============================================================
 *  JAYINCONN CMS — 数据客户端（Cloudflare Worker + D1）
 *  对外暴露与原 Supabase 客户端一致的接口，所以 cms.js / admin.html
 *  里的 sb.from(...).select(...) 等写法完全不用改。
 *  依赖：cms-config.js（先加载）
 *  暴露：window.CMS = { sb, configured, url, brand }
 * ============================================================ */
(function () {
  'use strict';

  var cfg = window.CMS_CONFIG || {};
  var BASE = String(cfg.API_BASE || '').replace(/\/$/, '');
  var configured = !!BASE && !/YOUR-/.test(BASE);
  var TOKEN_KEY = 'jayin_token';
  var USER_KEY = 'jayin_user';

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t, user) {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY);
      if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user)); else sessionStorage.removeItem(USER_KEY);
    } catch (e) {}
  }
  function getUser() {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'); } catch (e) { return null; }
  }

  /* ---------- 底层请求 ---------- */
  function call(path, body, needAuth) {
    var headers = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (needAuth && t) headers['Authorization'] = 'Bearer ' + t;
    return fetch(BASE + path, { method: 'POST', headers: headers, body: JSON.stringify(body || {}) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || j.ok === false) {
            var msg = j.error || ('HTTP ' + r.status);
            throw new Error(msg);
          }
          return j;
        });
      });
  }

  /* ---------- 查询构造器（thenable） ---------- */
  function Query(table) {
    this.table = table;
    this.state = {
      op: 'select', columns: '*', values: null,
      filters: [], orders: [], limit: null, single: false
    };
  }
  Query.prototype.select = function (cols) { if (this.state.op === 'select') this.state.columns = cols || '*'; return this; };
  Query.prototype.insert = function (v) { this.state.op = 'insert'; this.state.values = v; return this; };
  Query.prototype.update = function (v) { this.state.op = 'update'; this.state.values = v; return this; };
  Query.prototype.upsert = function (v) { this.state.op = 'upsert'; this.state.values = v; return this; };
  Query.prototype['delete'] = function () { this.state.op = 'delete'; return this; };
  Query.prototype.order = function (col, opts) {
    var asc = true;
    if (opts === 'desc') asc = false;
    else if (opts && typeof opts === 'object' && opts.ascending === false) asc = false;
    this.state.orders.push({ col: col, asc: asc });
    return this;
  };
  Query.prototype.eq = function (col, val) { this.state.filters.push({ col: col, op: 'eq', val: val }); return this; };
  Query.prototype.neq = function (col, val) { this.state.filters.push({ col: col, op: 'neq', val: val }); return this; };
  Query.prototype['in'] = function (col, arr) { this.state.filters.push({ col: col, op: 'in', val: arr }); return this; };
  Query.prototype.limit = function (n) { this.state.limit = n; return this; };
  Query.prototype.single = function () { this.state.single = true; return this; };

  Query.prototype.then = function (resolve, reject) {
    var s = this.state;
    var payload = {
      table: this.table, op: s.op, columns: s.columns, values: s.values,
      filters: s.filters, orders: s.orders, limit: s.limit, single: s.single
    };
    var needAuth = s.op !== 'select' || this.table === 'inquiries';
    call('/api/db', payload, needAuth)
      .then(function (j) { resolve({ data: j.data, error: null, count: Array.isArray(j.data) ? j.data.length : undefined }); })
      .catch(function (e) { resolve({ data: null, error: { message: e.message } }); });
    return this;
  };

  /* ---------- auth ---------- */
  var listeners = [];
  function emit(event, session) {
    listeners.forEach(function (cb) { try { cb(event, session); } catch (e) {} });
  }

  var auth = {
    getSession: function () {
      var t = getToken();
      var u = getUser();
      if (!t) return Promise.resolve({ data: { session: null, user: null }, error: null });
      return Promise.resolve({ data: { session: { access_token: t, user: u }, user: u }, error: null });
    },
    signInWithPassword: function (creds) {
      return call('/api/auth/login', { email: creds.email, password: creds.password }, false)
        .then(function (j) {
          setToken(j.token, j.user);
          emit('SIGNED_IN', { user: j.user, access_token: j.token });
          return { data: { user: j.user, session: { user: j.user } }, error: null };
        })
        .catch(function (e) {
          return { data: { user: null, session: null }, error: { message: e.message } };
        });
    },
    signOut: function () {
      setToken('', null);
      emit('SIGNED_OUT', null);
      return Promise.resolve({ error: null });
    },
    onAuthStateChange: function (cb) {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe: function () {
        var i = listeners.indexOf(cb); if (i > -1) listeners.splice(i, 1);
      } } } };
    }
  };

  /* ---------- storage（图片上传 → GitHub 仓库 uploads/） ---------- */
  var uploaded = {};   /* path -> url */

  function bucket(name) {
    return {
      upload: function (path, file) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            call('/api/upload', { name: path, data: String(reader.result) }, true)
              .then(function (j) {
                uploaded[path] = j.url;
                resolve({ data: { path: j.path }, error: null });
              })
              .catch(function (e) { resolve({ data: null, error: { message: e.message } }); });
          };
          reader.onerror = function () { resolve({ data: null, error: { message: '读取文件失败' } }); };
          reader.readAsDataURL(file);
        });
      },
      getPublicUrl: function (path) {
        return { data: { publicUrl: uploaded[path] || (BASE + '/uploads/' + encodeURIComponent(path)) } };
      }
    };
  }

  var client = {
    from: function (table) { return new Query(table); },
    auth: auth,
    storage: { from: bucket }
  };

  window.CMS = {
    configured: configured,
    url: BASE,
    key: '',
    bucket: cfg.BUCKET || 'uploads',
    brand: cfg.BRAND || 'JAYINCONN',
    sb: configured ? client : null
  };
})();
