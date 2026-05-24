/**
 * auth-client.js — Frontend Auth helper (production)
 *
 * Usage:
 *   <script src="_tools/auth-client.js"></script>
 *   Auth.require('view.payments', function(user) {
 *     // render page
 *   });
 *
 *   Auth.login(username, pin).then(...);
 *   Auth.logout();
 *   const u = Auth.getUser();  // synchronous (จาก localStorage)
 *   Auth.can('view.foo');
 *   await Auth.api('savePayment', {plot, ...});  // อัตโนมัติแนบ token
 */
(function(global){
  const API_URL = 'https://script.google.com/macros/s/AKfycbzR-qHtv0GgHRVmon14YEPM_2XFACo2ZzdPTYc0UBLgAjPHYrr9FTt7L4B2xZVLAi1F/exec';
  const SESS_KEY = 'ov_auth_session';

  // Permissions ของแต่ละ role (ต้องตรงกับ ROLE_PERMS ใน sales_api.gs)
  const ROLE_PERMS = {
    developer: ['*'],
    admin: ['view.home','view.cost','view.sales.dashboard','view.income.calc',
      'view.customers','view.transfer','view.construction.admin','view.foreman',
      'view.payments','view.fees',
      'manage.construction','manage.payments','manage.fees','manage.transfer','upload.cost',
      'create.quotation','create.booking','create.contract','create.receipt','create.promotion','create.walkin'],
    sales: ['view.home','view.sales.dashboard','view.income.calc','view.customers',
      'create.quotation','create.booking','create.contract','create.receipt','create.promotion','create.walkin','view.payments'],
    finance: ['view.home','view.sales.dashboard','view.payments','view.fees',
      'manage.payments','manage.fees','create.receipt'],
    foreman: ['view.foreman','update.field'],
    transfer: ['view.home','view.transfer','manage.transfer','create.receipt'],
    viewer: ['view.home','view.cost','view.sales.dashboard','view.customers','view.transfer','view.foreman','view.construction.admin']
  };

  const ROLE_INFO = {
    developer: {label:'🔧 ผู้พัฒนา', color:'#7c2d12'},
    admin:     {label:'👤 แอดมิน', color:'#b08d57'},
    sales:     {label:'💼 ทีมขาย', color:'#1e40af'},
    finance:   {label:'💰 การเงิน', color:'#15803d'},
    foreman:   {label:'👷 โฟร์แมน', color:'#92400e'},
    transfer:  {label:'📋 ฝ่ายโอน', color:'#6b21a8'},
    viewer:    {label:'👁️ ผู้ดู', color:'#475569'}
  };

  function getSession(){
    try {
      const raw = localStorage.getItem(SESS_KEY);
      if(!raw) return null;
      const s = JSON.parse(raw);
      // ไม่ปล่อยให้ expired session ค้าง (frontend check — backend ก็ตรวจอีกที)
      if(s.expiresAt && s.expiresAt < Date.now()){ localStorage.removeItem(SESS_KEY); return null; }
      return s;
    } catch(e){ return null; }
  }
  function setSession(s){
    localStorage.setItem(SESS_KEY, JSON.stringify(s));
  }
  function clearSession(){ localStorage.removeItem(SESS_KEY); }

  function getUser(){ const s = getSession(); return s ? s.user : null; }
  function getToken(){ const s = getSession(); return s ? s.token : null; }
  function isLoggedIn(){ return !!getToken(); }

  function can(permission){
    const u = getUser();
    if(!u) return false;
    // ใช้ permissions ที่ backend ส่งมา (รวม role + custom) ถ้ามี
    const perms = (u.permissions && u.permissions.length) ? u.permissions : (ROLE_PERMS[u.role] || []);
    return perms.indexOf('*') >= 0 || perms.indexOf(permission) >= 0;
  }

  function roleInfo(role){ return ROLE_INFO[role] || {label:role, color:'#666'}; }

  // API call (GET) — แนบ token อัตโนมัติ
  async function api(action, params, timeoutMs){
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    const token = getToken();
    if(token) url.searchParams.set('token', token);
    Object.keys(params||{}).forEach(k => {
      const v = params[k];
      if(v != null) url.searchParams.set(k, v);
    });
    const controller = new AbortController();
    const t = setTimeout(()=>controller.abort(), timeoutMs || 20000);
    try {
      const res = await fetch(url.toString(), {signal: controller.signal});
      const data = await res.json();
      // ถ้า session หมดอายุ — clear แล้ว redirect
      if(data && !data.ok && /session หมดอายุ|no token/i.test(data.error||'')){
        clearSession();
        location.replace('login.html?next='+encodeURIComponent(location.pathname+location.search));
        return data;
      }
      return data;
    } catch(e){
      if(e.name === 'AbortError') throw new Error('โหลดนานเกิน — กรุณาลองใหม่');
      throw e;
    } finally { clearTimeout(t); }
  }

  // POST (form+iframe trick — รองรับ payload ใหญ่ เช่น base64 image)
  function apiPost(action, data){
    return new Promise((resolve, reject) => {
      const iframeName = 'fr_'+Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = API_URL;
      form.target = iframeName;
      form.enctype = 'text/plain';

      const inp = document.createElement('input');
      inp.name = 'd';
      inp.value = JSON.stringify({action, token: getToken(), data});
      form.appendChild(inp);

      document.body.appendChild(form);
      iframe.onload = () => {
        setTimeout(()=>{ form.remove(); iframe.remove(); resolve({ok:true}); }, 500);
      };
      iframe.onerror = () => { form.remove(); iframe.remove(); reject(new Error('network error')); };
      form.submit();
    });
  }

  async function login(username, pin){
    try {
      const r = await api('authLogin', {username, pin});
      if(!r.ok) return r;
      setSession({
        token: r.token,
        user: r.user,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000)
      });
      return r;
    } catch(e){
      return {ok:false, error:'เชื่อมต่อไม่สำเร็จ — '+(e.message||'')};
    }
  }

  async function logout(){
    const token = getToken();
    if(token){
      try { await api('authLogout', {}); } catch(e){}
    }
    clearSession();
  }

  // require — เช็คสิทธิ์ก่อน render page
  // ถ้าไม่ login → redirect login.html
  // ถ้า login แต่ไม่มีสิทธิ์ → redirect login.html?deny=1
  function require(permission, cb){
    const u = getUser();
    if(!u){
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace('login.html?next='+next);
      return false;
    }
    if(permission && !can(permission)){
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace('login.html?deny=1&next='+next);
      return false;
    }
    if(cb) cb(u);
    return true;
  }

  // Auth bar HTML — injected by pages
  function renderAuthBar(targetEl){
    const u = getUser();
    if(!u || !targetEl) return;
    const r = roleInfo(u.role);
    targetEl.innerHTML = `
      <style>
        .ov-auth-bar{background:var(--charcoal,#3d3d3d);color:#fff;padding:8px 16px;
          display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px}
        .ov-auth-bar .me{display:flex;align-items:center;gap:8px}
        .ov-auth-bar .av{width:30px;height:30px;border-radius:50%;display:flex;
          align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:13px}
        .ov-auth-bar .nm{font-weight:800;font-size:13px}
        .ov-auth-bar .ro{font-size:11px;opacity:.75}
        .ov-auth-bar .links{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
        .ov-auth-bar a,.ov-auth-bar button{font-family:inherit;font-size:12px;font-weight:700;
          color:#fff;text-decoration:none;background:rgba(255,255,255,.12);
          border:none;padding:5px 10px;border-radius:6px;cursor:pointer}
        .ov-auth-bar a:hover,.ov-auth-bar button:hover{background:var(--gold,#b08d57)}
      </style>
      <div class="ov-auth-bar">
        <div class="me">
          <div class="av" style="background:${r.color}">${(u.username||'?').charAt(0)}</div>
          <div>
            <div class="nm">${u.username}</div>
            <div class="ro">${r.label}</div>
          </div>
        </div>
        <div class="links">
          <a href="home.html">🏠 หน้าแรก</a>
          ${can('*') ? '<a href="developer.html">🔧 จัดการ Users</a>' : ''}
          <button onclick="Auth.doLogout()">ออก</button>
        </div>
      </div>`;
  }

  async function doLogout(){
    if(!confirm('ออกจากระบบ?')) return;
    await logout();
    location.replace('login.html');
  }

  global.Auth = {
    ROLE_PERMS, ROLE_INFO,
    login, logout, doLogout,
    getUser, getToken, isLoggedIn, can, require,
    api, apiPost, roleInfo, renderAuthBar
  };
})(window);
