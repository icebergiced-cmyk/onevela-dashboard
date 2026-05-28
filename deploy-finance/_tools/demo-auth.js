/**
 * demo-auth.js — Mock login + permission system (เดโม่เท่านั้น)
 *
 * เก็บใน localStorage:
 *   ov_auth_users  → รายชื่อ users + roles + PIN
 *   ov_auth_session → session ปัจจุบัน {userId, expiresAt}
 *
 * Usage:
 *   <script src="_tools/demo-auth.js"></script>
 *   DemoAuth.init();
 *   const u = DemoAuth.currentUser();
 *   if (!u || !DemoAuth.can('view.payments')) location.href = 'login-demo.html?next='+page;
 *   DemoAuth.login(username, pin);
 *   DemoAuth.logout();
 */
(function(global){
  const USERS_KEY = 'ov_auth_users_v1';
  const SESS_KEY  = 'ov_auth_session_v1';
  const SESS_TTL  = 8 * 60 * 60 * 1000; // 8 ชั่วโมง

  // ── Roles + Permissions ──
  // permission keys ที่ใช้ทั่วระบบ — แต่ละหน้าตรวจ DemoAuth.can('view.cost') ก่อนแสดง
  const ROLES = {
    developer: {
      label: '🔧 ผู้พัฒนา (Developer)',
      color: '#7c2d12',
      desc: 'เข้าได้ทุกหน้า + จัดการ user/role',
      permissions: ['*']
    },
    admin: {
      label: '👤 แอดมิน (Admin)',
      color: '#b08d57',
      desc: 'ดูทุกแดชบอร์ด + จัดการก่อสร้าง + งานโอน — แต่จัดการ user ไม่ได้',
      permissions: [
        'view.home','view.cost','view.sales.dashboard','view.income.calc',
        'view.customers','view.transfer','view.construction.admin',
        'view.payments','view.fees',
        'manage.construction','manage.payments','manage.fees','manage.transfer',
        'upload.cost'
      ]
    },
    sales: {
      label: '💼 ทีมขาย (Sales)',
      color: '#1e40af',
      desc: 'แดชบอร์ดขาย + ออกเอกสาร + ลูกค้าวอร์คอิน',
      permissions: [
        'view.home','view.sales.dashboard','view.income.calc','view.customers',
        'create.quotation','create.booking','create.contract','create.receipt',
        'create.promotion','create.walkin','view.payments'
      ]
    },
    finance: {
      label: '💰 การเงิน (Finance)',
      color: '#15803d',
      desc: 'ดู/บันทึก ผ่อนดาวน์ ค่าส่วนกลาง ใบเสร็จ',
      permissions: [
        'view.home','view.sales.dashboard','view.payments','view.fees',
        'manage.payments','manage.fees','create.receipt'
      ]
    },
    foreman: {
      label: '👷 โฟร์แมน (Foreman)',
      color: '#92400e',
      desc: 'เข้าได้แค่หน้าโฟร์แมน — อัปเดตงานหน้าไซต์',
      permissions: ['view.foreman','update.field']
    },
    transfer: {
      label: '📋 ฝ่ายโอน (Transfer)',
      color: '#6b21a8',
      desc: 'จัดการเอกสารวันโอนกรรมสิทธิ์',
      permissions: ['view.home','view.transfer','manage.transfer','create.receipt']
    },
    viewer: {
      label: '👁️ ดูอย่างเดียว (Viewer)',
      color: '#475569',
      desc: 'ดูแดชบอร์ดได้ — บันทึก/แก้ไม่ได้',
      permissions: ['view.home','view.cost','view.sales.dashboard','view.customers','view.transfer']
    }
  };

  // ── Default users (seed) — มีปุ่ม reset กลับมาได้ใน developer page ──
  const DEFAULT_USERS = [
    {id:'dev', username:'ไอซ์', pin:'0000', role:'developer', active:true, note:'ผู้พัฒนา (default)'},
    {id:'adm', username:'admin', pin:'1234', role:'admin', active:true, note:''},
    {id:'s1',  username:'ต้น', pin:'1111', role:'sales', active:true, note:'ทีมขาย'},
    {id:'s2',  username:'ฝน',  pin:'1112', role:'sales', active:true, note:'ทีมขาย'},
    {id:'f1',  username:'การเงิน', pin:'2222', role:'finance', active:true, note:''},
    {id:'fm1', username:'โก้', pin:'3333', role:'foreman', active:true, note:'โฟร์แมน ULTRA'},
    {id:'fm2', username:'ใหญ่', pin:'3334', role:'foreman', active:true, note:'โฟร์แมน B/C/D'},
    {id:'t1',  username:'โอน',  pin:'4444', role:'transfer', active:true, note:'ฝ่ายโอน'}
  ];

  // ── Storage helpers ──
  function loadUsers(){
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if(!raw){
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        return JSON.parse(JSON.stringify(DEFAULT_USERS));
      }
      return JSON.parse(raw);
    } catch(e){ return JSON.parse(JSON.stringify(DEFAULT_USERS)); }
  }
  function saveUsers(users){
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    emit();
  }
  function loadSession(){
    try {
      const raw = localStorage.getItem(SESS_KEY);
      if(!raw) return null;
      const s = JSON.parse(raw);
      if(Date.now() > s.expiresAt) { localStorage.removeItem(SESS_KEY); return null; }
      return s;
    } catch(e){ return null; }
  }
  function saveSession(s){
    localStorage.setItem(SESS_KEY, JSON.stringify(s));
    emit();
  }

  // ── Event ──
  const listeners = [];
  function emit(){ listeners.forEach(fn => { try{ fn(); }catch(e){} }); }
  window.addEventListener('storage', e => {
    if(e.key === USERS_KEY || e.key === SESS_KEY) emit();
  });

  // ── API ──
  function init(){
    loadUsers(); // seed if needed
  }
  function currentUser(){
    const sess = loadSession();
    if(!sess) return null;
    const users = loadUsers();
    return users.find(u => u.id === sess.userId) || null;
  }
  function currentRole(){
    const u = currentUser();
    return u ? u.role : null;
  }
  function can(permission){
    const u = currentUser();
    if(!u || !u.active) return false;
    const role = ROLES[u.role];
    if(!role) return false;
    if(role.permissions.indexOf('*') >= 0) return true;
    return role.permissions.indexOf(permission) >= 0;
  }
  function login(username, pin){
    const users = loadUsers();
    const u = users.find(x => x.username === String(username).trim() && String(x.pin) === String(pin).trim());
    if(!u) return {ok:false, error:'ชื่อ หรือ PIN ไม่ถูกต้อง'};
    if(!u.active) return {ok:false, error:'บัญชีนี้ถูกระงับการใช้งาน'};
    saveSession({userId: u.id, expiresAt: Date.now() + SESS_TTL});
    return {ok:true, user:u};
  }
  function logout(){
    localStorage.removeItem(SESS_KEY);
    emit();
  }
  function listUsers(){ return loadUsers(); }
  function addUser(data){
    const users = loadUsers();
    if(users.find(u => u.username === data.username)) return {ok:false, error:'ชื่อนี้มีอยู่แล้ว'};
    const id = 'u_'+Date.now();
    users.push({
      id, username: String(data.username||'').trim(),
      pin: String(data.pin||'').trim(),
      role: data.role || 'viewer',
      active: data.active !== false,
      note: data.note || ''
    });
    saveUsers(users);
    return {ok:true, id};
  }
  function updateUser(id, fields){
    const users = loadUsers();
    const u = users.find(x => x.id === id);
    if(!u) return {ok:false, error:'ไม่พบ user'};
    Object.assign(u, fields);
    saveUsers(users);
    return {ok:true};
  }
  function deleteUser(id){
    const users = loadUsers();
    const idx = users.findIndex(x => x.id === id);
    if(idx < 0) return {ok:false, error:'ไม่พบ user'};
    if(users[idx].role === 'developer'){
      const devs = users.filter(x => x.role === 'developer');
      if(devs.length <= 1) return {ok:false, error:'ต้องมี developer อย่างน้อย 1 คน'};
    }
    users.splice(idx, 1);
    saveUsers(users);
    return {ok:true};
  }
  function resetUsers(){
    localStorage.removeItem(USERS_KEY);
    loadUsers();
  }
  function requirePermission(permission, fallbackPage){
    if(!can(permission)){
      const next = encodeURIComponent(location.pathname + location.search);
      const target = fallbackPage || 'login-demo.html';
      location.replace(target + '?next='+next + '&deny=1');
      return false;
    }
    return true;
  }
  function on(fn){ listeners.push(fn); return () => { const i = listeners.indexOf(fn); if(i>=0) listeners.splice(i,1); }; }

  global.DemoAuth = {
    ROLES, DEFAULT_USERS,
    init, currentUser, currentRole, can, login, logout,
    listUsers, addUser, updateUser, deleteUser, resetUsers,
    requirePermission, on
  };
})(window);
