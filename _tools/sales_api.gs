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
    if (action === 'saveBooking')   return json(saveRow('bookings',  parseData(p.data)));
    if (action === 'saveContract')  return json(saveRow('contracts', parseData(p.data)));
    if (action === 'savePayment')   return json(saveRow('payments',  parseData(p.data)));
    if (action === 'saveWalkIn')    return json(saveRow('walkins',   parseData(p.data)));
    return json({ok:false, error:'ไม่รู้จัก action: '+action});
  } catch(err){ return json({ok:false, error:String(err)}); }
}

function doPost(e){
  try {
    const body = parsePostBody(e);
    if(!body || !body.action) return json({ok:false, error:'invalid body'});
    switch(body.action){
      case 'saveQuotation':return json(saveQuotation(body.data));
      case 'saveBooking':  return json(saveRow('bookings',  body.data));
      case 'saveContract': return json(saveRow('contracts', body.data));
      case 'savePayment':  return json(saveRow('payments',  body.data));
      case 'saveWalkIn':   return json(saveRow('walkins',   body.data));
      case 'uploadFile':   return json(uploadFile(body));
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
