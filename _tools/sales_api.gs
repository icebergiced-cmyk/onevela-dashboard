/**
 * One Vela Sales API — Google Apps Script Web App
 * เชื่อม แดชบอร์ด/เครื่องมือเอกสาร  ⇄  Google Sheet (ฐานข้อมูล) + Drive (ไฟล์แนบ)
 *
 * ── วิธีติดตั้ง (ทำครั้งเดียว) ──────────────────────────────
 * 1. อัปโหลด One_Vela_Sales_DB.xlsx เข้า Google Drive → คลิกขวา → เปิดด้วย Google Sheets
 *    → File → Save as Google Sheets  (ได้ Google Sheet ตัวจริง)
 * 2. สร้างโฟลเดอร์ใน Drive ชื่อ "One Vela Sales Files" (ไว้เก็บสลิป/สัญญา/ใบเสร็จ)
 * 3. เปิด script.google.com → New project → วางโค้ดนี้ทั้งหมด
 * 4. กรอก SHEET_ID และ FILES_FOLDER_ID ด้านล่าง (เอาจาก URL — ดูคำอธิบาย)
 * 5. Deploy → New deployment → ประเภท "Web app"
 *    → Execute as: Me  ·  Who has access: Anyone
 * 6. คัดลอก Web app URL ที่ได้ — ส่งให้ Claude ใส่ในแดชบอร์ด
 *
 * ── ต้องเพิ่ม tabs ใหม่ใน Sheet (เวอร์ชันนี้) ───────────────
 *  - quotations : docNo | plot | cName | cPhone | priceNet | downPmt | months | createdAt | fileUrl
 *  - walkins    : visitDate | cName | cPhone | plotInterest | source | note | salesPerson | createdAt
 *  - counters   : key | value   (ใช้เก็บลำดับเลขใบเสนอราคารายวัน)
 * ───────────────────────────────────────────────────────
 */

// ⚙️ กรอก 2 ค่านี้:
// SHEET_ID = ส่วนกลาง URL ของ Sheet:  docs.google.com/spreadsheets/d/【SHEET_ID】/edit
const SHEET_ID = '1vUB9IwiUa_KpDYdKF3NyBYi3gABS7Ag7pvi8FNrYbg0';
// FILES_FOLDER_ID = ส่วนท้าย URL ของโฟลเดอร์:  drive.google.com/drive/folders/【FOLDER_ID】
const FILES_FOLDER_ID = '1cCPU9Zja185ELGihkrWTmh21fSu3Q1pk';

// ===== Router =====
// หมายเหตุ: ใช้ GET เป็นช่องทางหลักของ save actions ด้วย เพราะ Apps Script Web App POST
// ส่ง 302 redirect ทำให้ browser fetch (no-cors) สูญเสีย body ระหว่าง redirect ฉะนั้น
// ส่งข้อมูลเป็น URL params แทน (URL length limit ~8KB เพียงพอสำหรับ 1 แถว Sheet)
function doGet(e){
  const p = (e && e.parameter) || {};
  const action = p.action || 'ping';
  try {
    if (action === 'ping')          return json({ok:true, msg:'One Vela Sales API พร้อมใช้งาน'});
    if (action === 'getSalesData')  return json(getSalesData());
    if (action === 'getNextNo')     return json({ok:true, no:getNextNo(p.type, p.plot)});
    if (action === 'getNextQuoteNo')return json({ok:true, no:getNextQuoteNo()});
    if (action === 'getDocsByPlot') return json(getDocsByPlot(p.plot));
    // ===== save actions ผ่าน GET (รับ data เป็น JSON string ใน param `data`) =====
    if (action === 'saveQuotation') return json(saveQuotation(parseData(p.data)));
    if (action === 'saveBooking')   return json(saveBooking(parseData(p.data)));
    if (action === 'saveContract')  return json(saveContract(parseData(p.data)));
    if (action === 'savePayment')   return json(saveRow('payments',  parseData(p.data)));
    if (action === 'saveWalkIn')    return json(saveRow('walkins',   parseData(p.data)));
    // ===== sync history endpoints =====
    if (action === 'getSyncHistory')return json(getSyncHistory(Number(p.limit)||20));
    if (action === 'pushSyncHistory')return json(pushSyncHistory(parseData(p.data)));
    // ===== cost inbox (สะพานให้ GitHub Actions — ต้องมี token) =====
    if (action === 'listCostInbox')
      return json(p.token===CI_TOKEN ? listCostInbox() : {ok:false,error:'unauthorized'});
    if (action === 'getCostInboxFile')
      return json(p.token===CI_TOKEN ? getCostInboxFile(p.fileId) : {ok:false,error:'unauthorized'});
    if (action === 'markCostInboxDone')
      return json(p.token===CI_TOKEN ? markCostInboxDone(p.fileId) : {ok:false,error:'unauthorized'});
    return json({ok:false, error:'ไม่รู้จัก action: '+action});
  } catch(err){ return json({ok:false, error:String(err)}); }
}

function doPost(e){
  try {
    const body = parsePostBody(e);
    if(!body || !body.action) return json({ok:false, error:'invalid body'});
    switch(body.action){
      case 'saveQuotation':return json(saveQuotation(body.data));
      case 'saveBooking':  return json(saveBooking(body.data));
      case 'saveContract': return json(saveContract(body.data));
      case 'savePayment':  return json(saveRow('payments',  body.data));
      case 'saveWalkIn':   return json(saveRow('walkins',   body.data));
      case 'uploadFile':   return json(uploadFile(body));
      case 'pushSyncHistory':return json(pushSyncHistory(body.data));
      default: return json({ok:false, error:'ไม่รู้จัก action: '+body.action});
    }
  } catch(err){ return json({ok:false, error:String(err)}); }
}

// รองรับทั้ง JSON body (fetch) และ text/plain form body (hidden form trick)
// form ส่งมาเป็นรูป "d=<JSON>\r\n" — ตัด prefix แล้ว parse
function parsePostBody(e){
  let raw = (e && e.postData && e.postData.contents) || '';
  if(!raw){
    // บางครั้ง form-encoded จะอ่านจาก e.parameter
    if(e && e.parameter && e.parameter.d){
      try { return JSON.parse(e.parameter.d); } catch(err){}
    }
    return null;
  }
  raw = raw.trim();
  if(raw.charAt(0) === '{'){
    try { return JSON.parse(raw); } catch(err){}
  }
  // form text/plain: "d={...}\r\n" — ตัด "d=" แล้ว parse
  const m = raw.match(/^d=([\s\S]+)$/);
  if(m){
    let s = m[1];
    // ตัด CRLF/LF ท้ายถ้ามี
    s = s.replace(/[\r\n]+$/, '');
    try { return JSON.parse(s); } catch(err){}
  }
  return null;
}

function parseData(s){
  if(!s) return {};
  try { return JSON.parse(s); } catch(e){ return {}; }
}

function json(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function sheet(name){ return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name); }

// ===== อ่านข้อมูล (แถว1 = key อังกฤษ, แถว2 = ป้ายไทย, แถว3+ = ข้อมูล) =====
function readTab(name){
  const sh = sheet(name);
  if(!sh) return [];
  const vals = sh.getDataRange().getValues();
  if (vals.length < 3) return [];
  const keys = vals[0], out = [];
  for (let i=2;i<vals.length;i++){
    const row = {}; let empty = true;
    keys.forEach((k,j)=>{ row[k]=vals[i][j]; if(vals[i][j]!=='' && vals[i][j]!=null) empty=false; });
    if(!empty) out.push(row);
  }
  return out;
}

function getSalesData(){
  return {
    ok:true,
    plots:        readTab('metadata'),
    bookings:     readTab('bookings'),
    contracts:    readTab('contracts'),
    installments: readTab('installments'),
    payments:     readTab('payments'),
    quotations:   readTab('quotations'),
    walkins:      readTab('walkins'),
  };
}

// ===== เอกสารทั้งหมดของแปลงหนึ่ง =====
function getDocsByPlot(plot){
  if(!plot) return {ok:false, error:'ต้องระบุ plot'};
  const key = String(plot).trim();
  const match = (rows, fields) => rows.filter(r =>
    fields.some(f => String(r[f]||'').trim() === key)
  );
  return {
    ok:true,
    plot:key,
    quotations: match(readTab('quotations'), ['plot']),
    bookings:   match(readTab('bookings'),   ['plot']),
    contracts:  match(readTab('contracts'),  ['plot','plotNo']),
    payments:   match(readTab('payments'),   ['plot']),
  };
}

// ===== เขียน 1 แถวต่อท้าย tab =====
function saveRow(tabName, data){
  const sh = sheet(tabName);
  if(!sh) return {ok:false, error:'ไม่พบ tab: '+tabName};
  const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  if(!data.createdAt) data.createdAt = new Date().toISOString();
  const row = keys.map(k => (data[k]!==undefined && data[k]!==null) ? data[k] : '');
  sh.appendRow(row);
  return {ok:true, tab:tabName, saved:data};
}

// ===== บันทึกใบเสนอราคา (ออกเลขให้อัตโนมัติถ้าไม่ส่งมา) =====
function saveQuotation(data){
  if(!data.docNo) data.docNo = getNextQuoteNo();
  return saveRow('quotations', data);
}

// ============================================================
// ===== Smart Save: ตรวจสถานะแปลง + กันขายซ้ำ + อัปเดต metadata
// ============================================================
// statuses ที่ถือว่า "ขายไปแล้ว" — ห้ามจองซ้ำ
const BOOKED_STATUSES = ['จอง','สัญญา','ขายดาวน์','โอนแล้ว'];

// อ่านสถานะปัจจุบันของแปลง (จาก metadata) คืน {row, status} หรือ null
function getPlotStatus(plotId){
  const sh = sheet('metadata');
  if(!sh) return null;
  const vals = sh.getDataRange().getValues();
  if(vals.length < 3) return null;
  const keys = vals[0];
  const plotCol   = keys.indexOf('plot');
  const statusCol = keys.indexOf('status');
  if(plotCol < 0 || statusCol < 0) return null;
  for(let i = 2; i < vals.length; i++){
    if(String(vals[i][plotCol]).trim() === String(plotId).trim()){
      const s = String(vals[i][statusCol]||'ว่าง').trim() || 'ว่าง';
      return {row: i+1, status: s};
    }
  }
  return null;
}

// อัปเดตหลายคอลัมน์ใน metadata ของแปลงเดียว (เฉพาะคอลัมน์ที่ส่ง+มีค่า)
function updatePlotFields(plotId, fields){
  const sh = sheet('metadata');
  if(!sh) return false;
  const vals = sh.getDataRange().getValues();
  if(vals.length < 3) return false;
  const keys = vals[0];
  const plotCol = keys.indexOf('plot');
  if(plotCol < 0) return false;
  for(let i = 2; i < vals.length; i++){
    if(String(vals[i][plotCol]).trim() === String(plotId).trim()){
      Object.keys(fields).forEach(function(k){
        const col = keys.indexOf(k);
        if(col >= 0 && fields[k] !== undefined && fields[k] !== '' && fields[k] !== null){
          sh.getRange(i+1, col+1).setValue(fields[k]);
        }
      });
      return true;
    }
  }
  return false;
}

// ===== บันทึกใบจอง — ตรวจก่อนว่าแปลงว่างจริง กันขายซ้ำ =====
function saveBooking(data){
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุเลขแปลง'};
  const cur = getPlotStatus(data.plot);
  if(!cur) return {ok:false, error:'ไม่พบแปลง '+data.plot+' ใน metadata'};
  if(BOOKED_STATUSES.indexOf(cur.status) >= 0){
    return {ok:false, error:
      '⚠️ แปลง '+data.plot+' มีสถานะ "'+cur.status+'" อยู่แล้ว — กันการขายซ้ำ\n'+
      '(ถ้าต้องการจองใหม่ ปรับ status ใน Sheet เป็น "ว่าง" หรือ "หลุดจอง" ก่อน)'};
  }
  const r = saveRow('bookings', data);
  if(r.ok){
    updatePlotFields(data.plot, {
      status: 'จอง',
      cName:  data.cName,
      cPhone: data.cPhone,
      dateBook: data.bookDate || (new Date()).toISOString().slice(0,10),
      bookAmount: data.bookAmount,
      agent: data.salesAgent
    });
    r.statusUpdated = 'จอง';
  }
  return r;
}

// ===== บันทึกสัญญา — ตรวจว่าจองแล้วก่อน + อัปเดตสถานะเป็น "สัญญา" =====
function saveContract(data){
  const plot = data && (data.plot || data.plotNo);
  if(!plot) return {ok:false, error:'ต้องระบุเลขแปลง'};
  const cur = getPlotStatus(plot);
  if(!cur) return {ok:false, error:'ไม่พบแปลง '+plot+' ใน metadata'};
  if(cur.status !== 'จอง'){
    return {ok:false, error:
      '⚠️ แปลง '+plot+' มีสถานะ "'+cur.status+'" — ต้องเป็น "จอง" ก่อนทำสัญญา\n'+
      '(ถ้ายังไม่จอง ออกใบจองก่อน)'};
  }
  data.plot = plot;  // normalize
  const r = saveRow('contracts', data);
  if(r.ok){
    updatePlotFields(plot, {
      status: 'สัญญา',
      dateContract: data.contractDate || (new Date()).toISOString().slice(0,10)
    });
    r.statusUpdated = 'สัญญา';
  }
  return r;
}

// ===== เลขรันเอกสาร — รูปแบบเดิม ddmmyy-C{แปลง} (ใบจอง/สัญญา/ใบเสร็จ) =====
function getNextNo(type, plot){
  const d = new Date();
  const dd = ('0'+d.getDate()).slice(-2);
  const mm = ('0'+(d.getMonth()+1)).slice(-2);
  const yy = (''+((d.getFullYear()+543)%100)).slice(-2);
  return dd+mm+yy+'-C'+(plot||'');
}

// ===== เลขใบเสนอราคา — รูปแบบ ddmmyy-N (N = ลำดับในวันนั้น 1,2,3,...) =====
// ใช้ tab "counters" เก็บค่า — atomic ด้วย LockService
function getNextQuoteNo(){
  const d = new Date();
  const dd = ('0'+d.getDate()).slice(-2);
  const mm = ('0'+(d.getMonth()+1)).slice(-2);
  const yy = (''+((d.getFullYear()+543)%100)).slice(-2);
  const dateKey = 'quote_'+dd+mm+yy;
  const next = incrementCounter(dateKey);
  return dd+mm+yy+'-'+next;
}

function incrementCounter(key){
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try{
    const sh = sheet('counters');
    if(!sh) throw new Error('ไม่พบ tab: counters');
    const vals = sh.getDataRange().getValues();
    let row = -1, current = 0;
    for(let i=1;i<vals.length;i++){
      if(String(vals[i][0]).trim() === key){ row = i+1; current = Number(vals[i][1])||0; break; }
    }
    const next = current + 1;
    if(row > 0) sh.getRange(row, 2).setValue(next);
    else        sh.appendRow([key, next]);
    return next;
  } finally { lock.releaseLock(); }
}

// ===== อัปโหลดไฟล์แนบ → โฟลเดอร์รายแปลง → คืนลิงก์ =====
// body: {plot, category, fileName, mimeType, fileBase64,
//        tab?, docNo?}  ← ถ้ามี tab+docNo จะ update fileUrl ใน row นั้น
function uploadFile(body){
  const root = DriveApp.getFolderById(FILES_FOLDER_ID);
  const plotFolder = getOrCreateFolder(root, 'แปลง ' + (body.plot||'อื่นๆ'));
  const catFolder  = getOrCreateFolder(plotFolder, body.category || 'อื่นๆ');
  const bytes = Utilities.base64Decode(body.fileBase64);
  const blob  = Utilities.newBlob(bytes, body.mimeType, body.fileName);
  const file  = catFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // เชื่อม fileUrl เข้า row ในตาราง (ถ้ามี tab + docNo)
  if(body.tab && body.docNo){
    try { updateFileUrl(body.tab, body.docNo, file.getUrl()); } catch(e){}
  }
  return {ok:true, link:file.getUrl(), name:file.getName()};
}

// ===== อัปเดตคอลัมน์ fileUrl ของแถวที่เลขเอกสารตรง =====
function updateFileUrl(tabName, docNo, url){
  const sh = sheet(tabName);
  if(!sh) return;
  const vals = sh.getDataRange().getValues();
  if(vals.length < 3) return;
  const keys = vals[0];
  // หา col เลขเอกสาร (ลองหลายชื่อ)
  const docCol = keys.findIndex(k =>
    ['docNo','bookingNo','contractNo','receiptNo'].indexOf(String(k)) >= 0);
  const urlCol = keys.findIndex(k => String(k) === 'fileUrl');
  if(docCol < 0 || urlCol < 0) return;
  for(let i = 2; i < vals.length; i++){
    if(String(vals[i][docCol]).trim() === String(docNo).trim()){
      sh.getRange(i+1, urlCol+1).setValue(url);
      return;
    }
  }
}

function getOrCreateFolder(parent, name){
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ============================================================
// ===== Sync History — บันทึก/อ่านประวัติการ sync Excel ต้นทุน
// ============================================================
// schema (header แถว 1): at | file | result | plotsAffected | totalCost | totalDelta | newItems | duplicates | auditFile | topPlots | note
// แถว 2 (ป้ายไทย): วันเวลา | ไฟล์ | ผลลัพธ์ | จำนวนแปลงที่กระทบ | ต้นทุนรวม | ส่วนต่าง | สินค้าใหม่ | รายการซ้ำ | ไฟล์ audit | แปลงเด่น (JSON) | หมายเหตุ

const SYNC_HISTORY_TAB = 'sync_history';
const SYNC_HISTORY_KEYS = ['at','file','result','plotsAffected','totalCost','totalDelta','newItems','duplicates','auditFile','topPlots','note'];
const SYNC_HISTORY_LABELS = ['วันเวลา','ไฟล์','ผลลัพธ์','จำนวนแปลงที่กระทบ','ต้นทุนรวม','ส่วนต่าง','สินค้าใหม่','รายการซ้ำ','ไฟล์ audit','แปลงเด่น (JSON)','หมายเหตุ'];

function ensureSyncHistoryTab(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SYNC_HISTORY_TAB);
  if(!sh){
    sh = ss.insertSheet(SYNC_HISTORY_TAB);
    sh.getRange(1,1,1,SYNC_HISTORY_KEYS.length).setValues([SYNC_HISTORY_KEYS]);
    sh.getRange(2,1,1,SYNC_HISTORY_LABELS.length).setValues([SYNC_HISTORY_LABELS]);
    sh.setFrozenRows(2);
  }
  return sh;
}

function pushSyncHistory(data){
  if(!data || typeof data !== 'object') return {ok:false, error:'ต้องมี data object'};
  const sh = ensureSyncHistoryTab();
  if(!data.at) data.at = new Date().toISOString();
  // serialize topPlots ถ้าเป็น array
  if(data.topPlots && typeof data.topPlots !== 'string'){
    try { data.topPlots = JSON.stringify(data.topPlots); } catch(e){ data.topPlots = String(data.topPlots); }
  }
  const row = SYNC_HISTORY_KEYS.map(k => (data[k]!==undefined && data[k]!==null) ? data[k] : '');
  sh.appendRow(row);
  return {ok:true, saved:data};
}

function getSyncHistory(limit){
  const sh = ensureSyncHistoryTab();
  const vals = sh.getDataRange().getValues();
  if(vals.length < 3) return {ok:true, items:[]};
  const keys = vals[0];
  const out = [];
  for(let i = vals.length - 1; i >= 2; i--){
    const row = {};
    let empty = true;
    keys.forEach((k,j)=>{
      row[k] = vals[i][j];
      if(vals[i][j]!=='' && vals[i][j]!=null) empty = false;
    });
    if(empty) continue;
    // parse topPlots JSON string → array
    if(row.topPlots && typeof row.topPlots === 'string' && row.topPlots.charAt(0) === '['){
      try { row.topPlots = JSON.parse(row.topPlots); } catch(e){}
    }
    out.push(row);
    if(out.length >= limit) break;
  }
  return {ok:true, items:out};
}

// ============================================================
// ===== Cost Inbox — สะพานให้ GitHub Actions ดึงไฟล์ Excel ต้นทุน
// ============================================================
// admin-upload.html อัปไฟล์เข้า: FILES_FOLDER / "แปลง _excel_inbox" / "ต้นทุน_Ecount"
// GitHub Actions เรียก endpoint เหล่านี้ดึงไฟล์ไปประมวลผล (repo private — token ฝังในโค้ดได้)
const CI_TOKEN        = 'onevela-ci-7f3a9k2x';   // shared secret กับ GitHub Actions
const COST_INBOX_PLOT = '_excel_inbox';
const COST_INBOX_CAT  = 'ต้นทุน_Ecount';
const COST_INBOX_DONE = '_done';

function costInboxFolder(){
  const root  = DriveApp.getFolderById(FILES_FOLDER_ID);
  const plotF = getOrCreateFolder(root, 'แปลง ' + COST_INBOX_PLOT);
  return getOrCreateFolder(plotF, COST_INBOX_CAT);
}

// list ไฟล์ .xlsx ที่ยังไม่ประมวลผล (เรียงใหม่สุดก่อน)
function listCostInbox(){
  try{
    const folder = costInboxFolder();
    const it = folder.getFiles();
    const files = [];
    while(it.hasNext()){
      const f = it.next();
      const nm = f.getName();
      if(/\.xlsx$/i.test(nm)){
        files.push({id:f.getId(), name:nm, size:f.getSize(),
                    modified:f.getLastUpdated().toISOString()});
      }
    }
    files.sort(function(a,b){ return a.name < b.name ? 1 : (a.name > b.name ? -1 : 0); });
    return {ok:true, files:files};
  }catch(err){ return {ok:false, error:String(err)}; }
}

// คืนเนื้อไฟล์เป็น base64
function getCostInboxFile(fileId){
  if(!fileId) return {ok:false, error:'ต้องระบุ fileId'};
  try{
    const f = DriveApp.getFileById(fileId);
    return {ok:true, name:f.getName(),
            base64:Utilities.base64Encode(f.getBlob().getBytes())};
  }catch(err){ return {ok:false, error:String(err)}; }
}

// ย้ายไฟล์เข้าโฟลเดอร์ _done (กันประมวลผลซ้ำ)
function markCostInboxDone(fileId){
  if(!fileId) return {ok:false, error:'ต้องระบุ fileId'};
  try{
    const doneF = getOrCreateFolder(costInboxFolder(), COST_INBOX_DONE);
    const f = DriveApp.getFileById(fileId);
    f.moveTo(doneF);
    return {ok:true, moved:f.getName()};
  }catch(err){ return {ok:false, error:String(err)}; }
}
