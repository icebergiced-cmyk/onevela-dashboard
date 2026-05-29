/**
 * demo-state.js — Shared state ระหว่าง 3 เดโม่ (admin / foreman / tracker)
 *
 * เก็บใน localStorage — แต่ละหน้าอ่าน/เขียน state เดียวกัน
 * เปิด tab ใหม่หรือ refresh ก็ยัง state เดิม จนกว่าจะกด Reset
 *
 * ใช้:
 *   <script src="_tools/demo-state.js"></script>
 *   DemoState.init();              // ครั้งแรกของแต่ละหน้า
 *   const s = DemoState.get();     // อ่าน state ปัจจุบัน
 *   DemoState.startBuilding(plot); // เริ่มก่อสร้าง
 *   DemoState.stopBuilding(plot);  // หยุด
 *   DemoState.addUpdate(plot, upd);// เพิ่มอัปเดต
 *   DemoState.reset();             // ล้าง state กลับเริ่มต้น
 *   DemoState.on(fn);              // subscribe เปลี่ยนแปลง (cross-tab + same-tab)
 */
(function(global){
  const KEY = 'ov_demo_state_v1';

  // ── สัดส่วนไทป์บ้าน 483 แปลง (เลียนแบบจริง) ──
  const TYPE_DIST = [
    {t:'ULTRA',   n:338, foreman:'โก้'},
    {t:'MINUTES', n:84,  foreman:'ใหญ่'},
    {t:'MOMENT',  n:47,  foreman:'ใหญ่'},
    {t:'SECOND',  n:14,  foreman:'ใหญ่'}
  ];

  // ── โฟร์แมน map ──
  const FOREMAN_TYPES = {
    'โก้':  ['ULTRA'],
    'ใหญ่': ['MINUTES','SECOND','MOMENT']
  };

  // ── Milestone templates (subset) ──
  const MILESTONES = {
    ULTRA: [
      [1,'เตรียมพื้นที่ / วางผัง','โครงสร้าง'],
      [2,'งานเสาเข็ม','โครงสร้าง'],
      [3,'ฐานราก-ตอม่อ','โครงสร้าง'],
      [4,'คานคอดิน','โครงสร้าง'],
      [5,'เสา-คาน ชั้น 1','โครงสร้าง'],
      [6,'พื้นชั้น 2','โครงสร้าง'],
      [7,'เสา-คาน ชั้น 2','โครงสร้าง'],
      [8,'โครงหลังคา','โครงสร้าง'],
      [9,'มุงหลังคา','งานสถาปัตย์'],
      [10,'ก่อผนัง','งานสถาปัตย์'],
      [11,'ฉาบปูน','งานสถาปัตย์'],
      [12,'ติดตั้งวงกบ ประตู-หน้าต่าง','งานสถาปัตย์'],
      [13,'เดินระบบไฟฟ้า','งานระบบ'],
      [14,'เดินระบบประปา-สุขาภิบาล','งานระบบ'],
      [15,'ติดตั้งฝ้าเพดาน','งานสถาปัตย์'],
      [16,'ปูกระเบื้องพื้น-ผนัง','งานสถาปัตย์'],
      [17,'ติดตั้งประตู-หน้าต่าง','งานตกแต่ง'],
      [18,'งานสี','งานตกแต่ง'],
      [19,'ปูกระเบื้อง SPC','งานตกแต่ง'],
      [20,'ติดตั้งสุขภัณฑ์-ดวงไฟ','งานตกแต่ง'],
      [21,'เก็บงาน-ทำความสะอาด-ตรวจรับ','งานตกแต่ง']
    ],
    MINUTES: [
      [1,'เตรียมพื้นที่ / วางผัง','โครงสร้าง'],
      [2,'งานเสาเข็ม','โครงสร้าง'],
      [3,'ฐานราก-ตอม่อ','โครงสร้าง'],
      [4,'คานคอดิน','โครงสร้าง'],
      [5,'เสา-คาน','โครงสร้าง'],
      [6,'โครงหลังคา','โครงสร้าง'],
      [7,'มุงหลังคา','งานสถาปัตย์'],
      [8,'ก่อผนัง','งานสถาปัตย์'],
      [9,'ฉาบปูน','งานสถาปัตย์'],
      [10,'เดินระบบไฟฟ้า-ประปา','งานระบบ'],
      [11,'ติดตั้งฝ้าเพดาน','งานสถาปัตย์'],
      [12,'ปูกระเบื้องพื้น-ผนัง','งานสถาปัตย์'],
      [13,'ติดตั้งประตู-หน้าต่าง','งานตกแต่ง'],
      [14,'งานสี','งานตกแต่ง'],
      [15,'สุขภัณฑ์-ดวงไฟ-เก็บงาน-ตรวจรับ','งานตกแต่ง']
    ],
    SECOND: [
      [1,'เตรียมพื้นที่ / วางผัง','โครงสร้าง'],
      [2,'งานเสาเข็ม','โครงสร้าง'],
      [3,'ฐานราก-ตอม่อ','โครงสร้าง'],
      [4,'คานคอดิน','โครงสร้าง'],
      [5,'เสา-คาน','โครงสร้าง'],
      [6,'โครงหลังคา','โครงสร้าง'],
      [7,'มุงหลังคา','งานสถาปัตย์'],
      [8,'ก่อผนัง','งานสถาปัตย์'],
      [9,'ฉาบปูน','งานสถาปัตย์'],
      [10,'เดินระบบไฟฟ้า-ประปา','งานระบบ'],
      [11,'ติดตั้งฝ้าเพดาน','งานสถาปัตย์'],
      [12,'ปูกระเบื้องพื้น-ผนัง','งานสถาปัตย์'],
      [13,'ติดตั้งประตู-หน้าต่าง','งานตกแต่ง'],
      [14,'งานสี','งานตกแต่ง'],
      [15,'สุขภัณฑ์-ดวงไฟ-เก็บงาน-ตรวจรับ','งานตกแต่ง']
    ],
    MOMENT: [
      [1,'เตรียมพื้นที่ / วางผัง','โครงสร้าง'],
      [2,'งานเสาเข็ม','โครงสร้าง'],
      [3,'ฐานราก-คานคอดิน','โครงสร้าง'],
      [4,'เสา-คาน-พื้น','โครงสร้าง'],
      [5,'โครงหลังคา + มุงหลังคา','โครงสร้าง'],
      [6,'ก่อผนัง','งานสถาปัตย์'],
      [7,'ฉาบปูน','งานสถาปัตย์'],
      [8,'เดินระบบไฟฟ้า-ประปา','งานระบบ'],
      [9,'ฝ้าเพดาน + ปูกระเบื้อง','งานสถาปัตย์'],
      [10,'ติดตั้งประตู-หน้าต่าง','งานตกแต่ง'],
      [11,'งานสี','งานตกแต่ง'],
      [12,'ปูกระเบื้อง SPC','งานตกแต่ง'],
      [13,'สุขภัณฑ์-ดวงไฟ-เก็บงาน-ตรวจรับ','งานตกแต่ง']
    ]
  };

  // ── สร้าง 483 แปลงเริ่มต้น (ใช้ seed คงที่เพื่อให้ดูเหมือนกันทุก session) ──
  function buildInitialPlots(){
    const plots = {};
    // กระจาย status: 13 จอง / 12 สัญญา / 1 ขายดาวน์ / 4 โอนแล้ว / 453 ว่าง
    const statuses = []
      .concat(Array(13).fill('จอง'))
      .concat(Array(12).fill('สัญญา'))
      .concat(Array(1).fill('ขายดาวน์'))
      .concat(Array(4).fill('โอนแล้ว'))
      .concat(Array(453).fill('ว่าง'));
    // shuffle แบบ deterministic (linear congruential)
    let seed = 42;
    const rnd = () => { seed = (seed*9301 + 49297) % 233280; return seed/233280; };
    for(let i=statuses.length-1;i>0;i--){
      const j = Math.floor(rnd()*(i+1));
      [statuses[i],statuses[j]] = [statuses[j],statuses[i]];
    }
    let pid = 1, si = 0;
    TYPE_DIST.forEach(td => {
      for(let i=0;i<td.n;i++){
        const id = String(pid).padStart(3,'0');
        plots[id] = {
          plot: id,
          type: td.t,
          status: statuses[si++],
          building: false,
          progress: 0,
          curMilestoneId: null,
          startedAt: null,
          lastUpdateAt: null
        };
        pid++;
      }
    });
    // กำหนดแปลงเริ่มต้น "กำลังก่อสร้าง" 6 แปลง
    const INIT = [
      {plot:'140', cur:11, pct:45, lastUpd:'2 วันที่แล้ว'},
      {plot:'155', cur:14, pct:60, lastUpd:'5 วันที่แล้ว'},
      {plot:'170', cur:6,  pct:25, lastUpd:'เมื่อวาน'},
      {plot:'200', cur:2,  pct:15, lastUpd:'วันนี้'},
      {plot:'088', cur:13, pct:80, lastUpd:'เมื่อวาน'},
      {plot:'092', cur:7,  pct:35, lastUpd:'3 วันที่แล้ว'}
    ];
    INIT.forEach(a => {
      if(plots[a.plot]){
        plots[a.plot].building = true;
        plots[a.plot].curMilestoneId = a.cur;
        plots[a.plot].progress = a.pct;
        plots[a.plot].startedAt = '2026-03-15';
        plots[a.plot].lastUpdateAt = a.lastUpd;
      }
    });
    return plots;
  }

  // ── seed updates สำหรับ 6 แปลงเริ่มต้น ──
  function buildInitialUpdates(){
    return {
      '140': [
        {at:'2026-05-22 16:30', by:'โฟร์แมนโก้',
         note:'ฉาบผนังชั้น 1 เสร็จ เริ่มชั้น 2 พรุ่งนี้',
         msDone:[10], photos:3, hasIssue:false},
        {at:'2026-05-21 09:15', by:'โฟร์แมนโก้',
         note:'เริ่มงานฉาบปูน — ผนังก่อเสร็จครบทั้งหลังแล้ว',
         msDone:[], photos:2, hasIssue:false},
        {at:'2026-05-19 14:00', by:'โฟร์แมนโก้',
         note:'ก่อผนังชั้น 2 เสร็จ',
         msDone:[10], photos:2, hasIssue:true,
         issueDesc:'ปูนซีเมนต์หมดสต๊อก รออีก 1 วัน', issueSev:'กลาง'}
      ],
      '155': [
        {at:'2026-05-18 11:00', by:'โฟร์แมนโก้',
         note:'เดินท่อ PPR ชั้น 2 เสร็จ', msDone:[], photos:2, hasIssue:false}
      ],
      '170': [
        {at:'2026-05-22 10:00', by:'โฟร์แมนโก้',
         note:'เทพื้นชั้น 2 เรียบร้อย', msDone:[5], photos:2, hasIssue:false}
      ],
      '200': [
        {at:'2026-05-23 08:45', by:'โฟร์แมนใหญ่',
         note:'ตอกเสาเข็มไปแล้ว 12 ต้น จาก 24 ต้น', msDone:[], photos:1, hasIssue:false},
        {at:'2026-05-20 15:20', by:'โฟร์แมนใหญ่',
         note:'เริ่มตอกเสาเข็มวันนี้', msDone:[1], photos:1, hasIssue:false}
      ],
      '088': [
        {at:'2026-05-22 14:00', by:'โฟร์แมนใหญ่',
         note:'ติดประตูห้องน้ำเสร็จ เหลือประตูห้องนอน', msDone:[12], photos:2, hasIssue:false}
      ],
      '092': [
        {at:'2026-05-20 09:00', by:'โฟร์แมนใหญ่',
         note:'เริ่มมุงหลังคา', msDone:[6], photos:1, hasIssue:false}
      ]
    };
  }

  // ── Initial full state ──
  function buildInitialState(){
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      plots: buildInitialPlots(),
      updates: buildInitialUpdates() // map plot → array of updates
    };
  }

  // ── Listeners (same-tab + cross-tab via storage event) ──
  const listeners = [];
  function emit(){
    const s = get();
    listeners.forEach(fn => { try { fn(s); } catch(e){} });
  }
  window.addEventListener('storage', e => {
    if(e.key === KEY) emit();
  });

  // ── Public API ──
  function init(){
    if(!localStorage.getItem(KEY)){
      localStorage.setItem(KEY, JSON.stringify(buildInitialState()));
    }
    return get();
  }
  function get(){
    const raw = localStorage.getItem(KEY);
    if(!raw) return init();
    try { return JSON.parse(raw); }
    catch(e){ return init(); }
  }
  function save(state){
    localStorage.setItem(KEY, JSON.stringify(state));
    emit();
  }
  function reset(){
    localStorage.removeItem(KEY);
    init();
    emit();
  }
  function on(fn){
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if(i>=0) listeners.splice(i,1); };
  }

  function startBuilding(plotId){
    const s = get();
    const p = s.plots[plotId];
    if(!p) return false;
    p.building = true;
    p.curMilestoneId = 1;
    p.progress = 0;
    p.startedAt = new Date().toISOString().slice(0,10);
    p.lastUpdateAt = 'เพิ่งเริ่ม';
    save(s);
    return true;
  }
  function stopBuilding(plotId){
    const s = get();
    const p = s.plots[plotId];
    if(!p) return false;
    p.building = false;
    save(s);
    return true;
  }

  function addUpdate(plotId, update){
    const s = get();
    if(!s.plots[plotId]) return false;
    if(!s.updates[plotId]) s.updates[plotId] = [];
    const u = Object.assign({at: new Date().toISOString().slice(0,16).replace('T',' ')}, update);
    s.updates[plotId].unshift(u);

    // อัปเดต progress + current milestone + lastUpdate
    const p = s.plots[plotId];
    const ms = MILESTONES[p.type] || [];
    if(update.msDone && update.msDone.length && ms.length){
      // หา milestone ลำดับใหม่ที่สุดที่ทำเสร็จ
      const maxDone = Math.max(...update.msDone.map(Number));
      if(maxDone >= p.curMilestoneId){
        p.curMilestoneId = Math.min(maxDone + 1, ms.length);
      }
      // คำนวณ progress คร่าวๆ ตามลำดับ
      p.progress = Math.min(100, Math.round((p.curMilestoneId - 1) / ms.length * 100));
    }
    p.lastUpdateAt = 'เพิ่งอัปเดต';
    save(s);
    return true;
  }

  function getActivePlots(){
    const s = get();
    return Object.values(s.plots).filter(p => p.building);
  }
  function getPlotsByForeman(foremanKey){
    const types = FOREMAN_TYPES[foremanKey] || [];
    return getActivePlots().filter(p => types.includes(p.type));
  }
  function getMilestones(type){
    return (MILESTONES[type] || []).map(([id,name,cat]) => ({id, name, cat}));
  }
  function foremanOfType(type){
    if(type === 'ULTRA') return 'โก้';
    return 'ใหญ่';
  }
  function getCounts(){
    const s = get();
    const all = Object.values(s.plots);
    const active = all.filter(p => p.building);
    return {
      total: all.length,
      active: active.length,
      empty: all.length - active.length,
      koLoad: active.filter(p => p.type === 'ULTRA').length,
      yaiLoad: active.filter(p => p.type !== 'ULTRA').length
    };
  }
  function getUpdates(plotId){
    const s = get();
    return s.updates[plotId] || [];
  }

  global.DemoState = {
    init, get, save, reset, on,
    startBuilding, stopBuilding, addUpdate,
    getActivePlots, getPlotsByForeman, getMilestones,
    foremanOfType, getCounts, getUpdates,
    TYPE_DIST, FOREMAN_TYPES, MILESTONES
  };
})(window);
