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
    // ===== Construction Tracker (Round 2 — อ่านอย่างเดียว) =====
    if (action === 'getTrackerData') return json(getTrackerData(p.plot));
    if (action === 'getMilestones')  return json(getMilestones(p.houseType));
    // ===== Construction — admin/foreman actions (Round 3) =====
    if (action === 'getActivePlots')    return json(getActivePlots());
    if (action === 'getPlotsByForeman') return json(getPlotsByForeman(p.foreman));
    if (action === 'getCounts')         return json(getConstructionCounts());
    if (action === 'startBuilding')     return json(startBuilding(p.plot, p.foreman));
    if (action === 'stopBuilding')      return json(stopBuilding(p.plot));
    if (action === 'saveUpdate')        return json(saveConstructionUpdate(parseData(p.data)));
    if (action === 'foremanLogin')      return json(foremanLogin(p.foreman, p.pin));
    if (action === 'foremanInit')       return json(foremanInit(p.foreman, p.pin));
    if (action === 'getMilestonesAll')  return json(getMilestonesAll());
    // ===== Auth (Round 5) — universal login + permissions =====
    if (action === 'authLogin')      return json(authLogin(p.username, p.pin));
    if (action === 'authVerify')     return json(authVerify(p.token));
    if (action === 'authLogout')     return json(authLogout(p.token));
    if (action === 'userList')       return json(userList(p.token));
    if (action === 'userSave')       return json(userSave(p.token, parseData(p.data)));
    if (action === 'userDelete')     return json(userDelete(p.token, p.userId));
    if (action === 'listAllPermissions') return json(listAllPermissions(p.token));
    // ===== Walkin v2 (Round 5) =====
    if (action === 'getWalkinsV2')   return json(getWalkinsV2(p.token));
    if (action === 'saveWalkinV2')   return json(saveWalkinV2(p.token, parseData(p.data)));
    if (action === 'deleteWalkinV2') return json(deleteWalkinV2(p.token, p.walkinId));
    // ===== Payment / Fee / Transfer (Round 5) =====
    if (action === 'getPayments')        return json(getPayments(p.token));
    if (action === 'savePayment')        return json(savePayment(p.token, parseData(p.data)));
    if (action === 'getFees')            return json(getFees(p.token));
    if (action === 'saveFee')            return json(saveFee(p.token, parseData(p.data)));
    if (action === 'deleteFee')          return json(deleteFee(p.token, p.feeId));
    if (action === 'getTransfers')       return json(getTransfers(p.token));
    if (action === 'saveTransfer')       return json(saveTransfer(p.token, parseData(p.data)));
    if (action === 'getChecklistState')  return json(getChecklistState(p.token, p.plot));
    if (action === 'saveChecklistState') return json(saveChecklistState(p.token, parseData(p.data)));
    // ===== Plot Folders (Round 6) =====
    if (action === 'getPlotFolderUrls')  return json(getPlotFolderUrls(p.token, p.plot));
    if (action === 'prewarmPlotFolders') return json(prewarmPlotFolders(p.token, Number(p.start)||1, Number(p.count)||50));
    if (action === 'listDocsInPlot')     return json(listDocsInPlot(p.token, p.plot, p.docType));
    if (action === 'getFeeRate')         return json(getFeeRate());
    if (action === 'setFeeRate')         return json(setFeeRate(p.token, Number(p.rate)));
    // Invoice (Round 8)
    if (action === 'saveInvoice')        return json(saveInvoice(p.token, parseData(p.data)));
    if (action === 'listInvoicesForPlot')return json(listInvoicesForPlot(p.token, p.plot));
    if (action === 'getNextInvoiceNo')   return json({ok:true, no:getNextInvoiceNo()});
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
      case 'saveUpdate':   return json(saveConstructionUpdate(body.data));
      case 'startBuilding':return json(startBuilding(body.plot, body.foreman));
      case 'stopBuilding': return json(stopBuilding(body.plot));
      case 'savePayment':  return json(savePayment(body.token, body.data));
      case 'saveFee':      return json(saveFee(body.token, body.data));
      case 'saveWalkinV2': return json(saveWalkinV2(body.token, body.data));
      case 'saveTransfer': return json(saveTransfer(body.token, body.data));
      case 'userSave':     return json(userSave(body.token, body.data));
      case 'uploadDocToPlot':return json(uploadDocToPlot(body.token, body.data));
      case 'saveInvoice':  return json(saveInvoice(body.token, body.data));
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
// ===== Construction Tracker — Round 2 (อ่านอย่างเดียว)
// ============================================================
// คืนข้อมูลครบของ 1 แปลง: construction status, milestones template (filter by house_type),
// updates ทั้งหมด (เรียงใหม่→เก่า), photos ของแปลงนั้น
//
// House type mapping — milestones_template ใช้ key อังกฤษ (ULTRA/MINUTES/SECOND/MOMENT)
// metadata.typeCode อาจเป็นรูปแบบต่างกัน — ใช้ best-effort matching (case-insensitive substring)
function resolveHouseType(typeCode){
  if(!typeCode) return '';
  var s = String(typeCode).trim().toUpperCase();
  // จับ keyword ที่อยู่ใน house_type ที่เรามี
  if(s.indexOf('ULTRA') >= 0)   return 'ULTRA';
  if(s.indexOf('MINUTE') >= 0)  return 'MINUTES';   // MINUTE/MINUTES
  if(s.indexOf('SECOND') >= 0)  return 'SECOND';
  if(s.indexOf('MOMENT') >= 0)  return 'MOMENT';
  return s;  // ส่งค่าเดิมกลับ — frontend จะเห็นว่าไม่มี match
}

// คืน milestones_template — filter ตาม house_type ถ้าส่งมา
function getMilestones(houseType){
  var all = readTab('milestones_template');
  if(!all) return {ok:true, milestones:[]};
  var key = resolveHouseType(houseType);
  var out = key
    ? all.filter(function(m){ return String(m.house_type||'').trim().toUpperCase() === key; })
    : all;
  // เรียงตาม order
  out.sort(function(a,b){ return (Number(a.milestone_order)||0) - (Number(b.milestone_order)||0); });
  return {ok:true, houseType:key, milestones:out};
}

// คืน tracker payload ครบของ 1 แปลง
function getTrackerData(plot){
  if(!plot) return {ok:false, error:'ต้องระบุ plot'};
  var key = String(plot).trim();

  // หาแปลงใน metadata เพื่อรู้ typeCode
  var plotMeta = null;
  var allPlots = readTab('metadata');
  for(var i=0;i<allPlots.length;i++){
    if(String(allPlots[i].plot||'').trim() === key){ plotMeta = allPlots[i]; break; }
  }
  var houseTypeRaw = plotMeta ? plotMeta.typeCode : '';
  var houseType = resolveHouseType(houseTypeRaw);

  // construction row
  var construction = null;
  var consAll = readTab('plot_construction');
  for(var j=0;j<consAll.length;j++){
    if(String(consAll[j].plot_id||'').trim() === key){ construction = consAll[j]; break; }
  }

  // updates ของแปลงนี้ เรียงใหม่→เก่า
  var updates = readTab('construction_updates').filter(function(u){
    return String(u.plot_id||'').trim() === key;
  });
  updates.sort(function(a,b){
    return String(b.created_at||'').localeCompare(String(a.created_at||''));
  });

  // photos ของ update_ids ในแปลงนี้
  var updateIds = {};
  updates.forEach(function(u){ if(u.update_id) updateIds[String(u.update_id).trim()] = true; });
  var photos = readTab('construction_photos').filter(function(ph){
    return updateIds[String(ph.update_id||'').trim()];
  });
  photos.sort(function(a,b){
    return String(b.taken_at||'').localeCompare(String(a.taken_at||''));
  });

  // milestones template สำหรับ house_type นี้
  var mt = getMilestones(houseTypeRaw).milestones;

  // current milestone object (lookup จาก template_id)
  var currentMilestone = null;
  if(construction && construction.current_milestone_id){
    var cid = String(construction.current_milestone_id).trim();
    for(var k=0;k<mt.length;k++){
      if(String(mt[k].template_id).trim() === cid){ currentMilestone = mt[k]; break; }
    }
  }

  // นับ milestones ที่เสร็จแล้ว — รวบรวมจาก updates ทั้งหมด (column milestones_completed = JSON array)
  var completedSet = {};
  updates.forEach(function(u){
    var raw = u.milestones_completed;
    if(!raw) return;
    try {
      var arr = (typeof raw === 'string') ? JSON.parse(raw) : raw;
      if(Array.isArray(arr)){
        arr.forEach(function(id){ completedSet[String(id).trim()] = true; });
      }
    } catch(e){ /* skip malformed */ }
  });

  return {
    ok: true,
    plot: key,
    houseType: houseType,
    houseTypeRaw: houseTypeRaw,
    plotMeta: plotMeta,
    construction: construction,
    currentMilestone: currentMilestone,
    milestones: mt,
    completedIds: Object.keys(completedSet),
    updates: updates,
    photos: photos
  };
}

// ============================================================
// ===== Construction Actions — Round 3 (write API)
// ============================================================
// Field "status" ใน plot_construction ใช้บอกสถานะ:
//   'กำลังก่อสร้าง' — แสดงใน dropdown โฟร์แมน
//   'หยุด'         — ไม่แสดง (admin กดหยุด)
//   'เสร็จ'        — เสร็จสมบูรณ์ (อนาคต)
//
// Foreman mapping (auto from type):
//   ULTRA          → 'โก้'
//   อื่นๆ (B/C/D)  → 'ใหญ่'

const FOREMAN_TYPE_MAP = {
  'โก้':  ['ULTRA'],
  'ใหญ่': ['MINUTES','SECOND','MOMENT']
};

function foremanOfType_(type){
  if(!type) return '';
  return String(type).toUpperCase() === 'ULTRA' ? 'โก้' : 'ใหญ่';
}

// แปลง typeCode จาก metadata → key milestones_template (เรียกใช้ resolveHouseType เดิม)
function plotTypeKey_(plot){
  // หาแปลงใน metadata
  const allPlots = readTab('metadata');
  for(var i=0;i<allPlots.length;i++){
    if(String(allPlots[i].plot||'').trim() === String(plot).trim()){
      return resolveHouseType(allPlots[i].typeCode);
    }
  }
  return '';
}

// ===== getActivePlots — แปลงที่ status = 'กำลังก่อสร้าง' =====
function getActivePlots(){
  const cons = readTab('plot_construction').filter(function(c){
    return String(c.status||'').trim() === 'กำลังก่อสร้าง';
  });
  // join กับ metadata เพื่อได้ typeCode + status ขาย
  const meta = readTab('metadata');
  const metaMap = {};
  meta.forEach(function(m){ metaMap[String(m.plot||'').trim()] = m; });
  const out = cons.map(function(c){
    const pid = String(c.plot_id||'').trim();
    const m = metaMap[pid] || {};
    const type = resolveHouseType(m.typeCode);
    return {
      plot: pid,
      type: type,
      typeCode: m.typeCode,
      saleStatus: m.status || 'ว่าง',
      progress: Number(c.progress_percent)||0,
      curMilestoneId: Number(c.current_milestone_id)||1,
      status: c.status,
      foreman: c.assigned_foreman_id || foremanOfType_(type),
      startedAt: c.actual_start_date,
      lastUpdateAt: c.last_update_at,
      cName: m.cName, cPhone: m.cPhone
    };
  });
  return {ok:true, plots:out};
}

// ===== getPlotsByForeman — กรองตามชื่อโฟร์แมน (โก้/ใหญ่) =====
function getPlotsByForeman(foreman){
  if(!foreman) return {ok:false, error:'ต้องระบุชื่อโฟร์แมน'};
  const types = FOREMAN_TYPE_MAP[foreman] || [];
  if(types.length === 0) return {ok:false, error:'ไม่รู้จักโฟร์แมน: '+foreman};
  const all = getActivePlots().plots;
  const filtered = all.filter(function(p){ return types.indexOf(p.type) >= 0; });
  return {ok:true, foreman:foreman, plots:filtered};
}

// ===== getConstructionCounts — stats สำหรับ admin =====
function getConstructionCounts(){
  const meta = readTab('metadata');
  const total = meta.length;
  const cons = readTab('plot_construction');
  const active = cons.filter(function(c){ return String(c.status||'').trim() === 'กำลังก่อสร้าง'; });
  const koLoad = active.filter(function(c){
    const m = meta.find(function(x){ return String(x.plot||'').trim() === String(c.plot_id||'').trim(); });
    return m && resolveHouseType(m.typeCode) === 'ULTRA';
  }).length;
  return {
    ok:true,
    total: total,
    active: active.length,
    empty: total - active.length,
    koLoad: koLoad,
    yaiLoad: active.length - koLoad
  };
}

// ===== startBuilding — เพิ่ม/อัปเดต row ใน plot_construction =====
// foremanOverride: ถ้าส่งมา (เช่น 'โก้' / 'ใหญ่') จะใช้แทน default ตามไทป์
function startBuilding(plot, foremanOverride){
  if(!plot) return {ok:false, error:'ต้องระบุ plot'};
  const sh = sheet('plot_construction');
  if(!sh) return {ok:false, error:'ไม่พบ tab: plot_construction'};
  const vals = sh.getDataRange().getValues();
  if(vals.length < 2) return {ok:false, error:'tab plot_construction ว่าง'};
  const keys = vals[0];
  const colPlot = keys.indexOf('plot_id');
  if(colPlot < 0) return {ok:false, error:'ไม่พบ column plot_id'};

  // หา type ของแปลง
  const typeKey = plotTypeKey_(plot);
  if(!typeKey) return {ok:false, error:'ไม่พบแปลง '+plot+' หรือไม่ทราบ typeCode'};
  // ใช้ override ถ้าส่งมา ไม่งั้น auto-assign ตามไทป์
  const foreman = (foremanOverride && String(foremanOverride).trim())
    ? String(foremanOverride).trim()
    : foremanOfType_(typeKey);

  // หา row เดิม
  const today = new Date().toISOString().slice(0,10);
  const nowIso = new Date().toISOString();
  let foundRow = -1;
  for(let i = 2; i < vals.length; i++){
    if(String(vals[i][colPlot]||'').trim() === String(plot).trim()){
      foundRow = i + 1; break;
    }
  }

  const data = {
    plot_id: plot,
    current_milestone_id: 1,
    progress_percent: 0,
    status: 'กำลังก่อสร้าง',
    assigned_foreman_id: foreman,
    actual_start_date: today,
    estimated_completion_date: '',
    last_update_at: nowIso
  };

  if(foundRow > 0){
    // อัปเดตเฉพาะ column ที่จำเป็น (รักษา progress เดิมถ้ามี)
    const curProgress = Number(vals[foundRow-1][keys.indexOf('progress_percent')])||0;
    const curMs = Number(vals[foundRow-1][keys.indexOf('current_milestone_id')])||1;
    sh.getRange(foundRow, keys.indexOf('status')+1).setValue('กำลังก่อสร้าง');
    sh.getRange(foundRow, keys.indexOf('assigned_foreman_id')+1).setValue(foreman);
    sh.getRange(foundRow, keys.indexOf('last_update_at')+1).setValue(nowIso);
    if(!vals[foundRow-1][keys.indexOf('actual_start_date')]){
      sh.getRange(foundRow, keys.indexOf('actual_start_date')+1).setValue(today);
    }
    return {ok:true, plot:plot, foreman:foreman, action:'resumed',
            progress:curProgress, currentMilestone:curMs};
  } else {
    const row = keys.map(function(k){ return data[k] !== undefined ? data[k] : ''; });
    sh.appendRow(row);
    return {ok:true, plot:plot, foreman:foreman, action:'started'};
  }
}

// ===== stopBuilding — เปลี่ยน status เป็น 'หยุด' (ไม่ลบ) =====
function stopBuilding(plot){
  if(!plot) return {ok:false, error:'ต้องระบุ plot'};
  const sh = sheet('plot_construction');
  if(!sh) return {ok:false, error:'ไม่พบ tab: plot_construction'};
  const vals = sh.getDataRange().getValues();
  if(vals.length < 3) return {ok:false, error:'tab ว่าง'};
  const keys = vals[0];
  const colPlot = keys.indexOf('plot_id');
  const colStatus = keys.indexOf('status');
  const colLast = keys.indexOf('last_update_at');
  if(colPlot < 0 || colStatus < 0) return {ok:false, error:'schema ผิด'};

  for(let i = 2; i < vals.length; i++){
    if(String(vals[i][colPlot]||'').trim() === String(plot).trim()){
      sh.getRange(i+1, colStatus+1).setValue('หยุด');
      if(colLast >= 0) sh.getRange(i+1, colLast+1).setValue(new Date().toISOString());
      return {ok:true, plot:plot, action:'stopped'};
    }
  }
  return {ok:false, error:'ไม่พบแปลง '+plot+' ใน plot_construction'};
}

// ===== saveConstructionUpdate — โฟร์แมนส่งอัปเดต =====
// data: {plot, foreman, msDone:[], note, photos:N or [base64...], hasIssue, issueDesc, issueSev, gpsLat, gpsLng}
function saveConstructionUpdate(data){
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุ plot'};
  if(!data.foreman) return {ok:false, error:'ต้องระบุชื่อโฟร์แมน'};

  const sh = sheet('construction_updates');
  if(!sh) return {ok:false, error:'ไม่พบ tab: construction_updates'};
  const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];

  // generate update_id
  const updId = 'U' + Date.now() + '-' + Math.floor(Math.random()*1000);
  const nowIso = new Date().toISOString();
  const msDoneJson = JSON.stringify(data.msDone || []);

  const row = {
    update_id: updId,
    plot_id: data.plot,
    foreman_id: data.foreman,
    created_at: nowIso,
    milestones_completed: msDoneJson,
    progress_delta: 0,  // จะคำนวณ
    gps_lat: data.gpsLat || '',
    gps_lng: data.gpsLng || '',
    gps_accuracy: data.gpsAccuracy || '',
    text_note: data.note || '',
    voice_note_url: '',
    has_issue: data.hasIssue ? 1 : 0,
    issue_description: data.issueDesc || '',
    issue_severity: data.issueSev || '',
    issue_status: data.hasIssue ? 'open' : '',
    status: 'submitted',
    approved_by: '',
    approved_at: '',
    rejection_reason: ''
  };

  const rowArr = keys.map(function(k){ return row[k] !== undefined ? row[k] : ''; });
  sh.appendRow(rowArr);

  // อัปเดต progress + currentMilestone + lastUpdate ใน plot_construction
  if(data.msDone && data.msDone.length){
    updatePlotConstructionProgress_(data.plot, data.msDone);
  } else {
    // แค่อัปเดต lastUpdate
    updatePlotConstructionField_(data.plot, 'last_update_at', nowIso);
  }

  // เก็บ photos (ถ้ามี base64 array — อัปขึ้น Drive)
  let photoCount = 0;
  if(Array.isArray(data.photos)){
    data.photos.forEach(function(p){
      try {
        const saved = uploadConstructionPhoto_(updId, data.plot, p);
        if(saved) photoCount++;
      } catch(e){}
    });
  } else if(typeof data.photos === 'number'){
    photoCount = data.photos;
  }

  return {ok:true, updateId:updId, photoCount:photoCount};
}

function updatePlotConstructionField_(plot, field, value){
  const sh = sheet('plot_construction');
  if(!sh) return false;
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];
  const colPlot = keys.indexOf('plot_id');
  const colField = keys.indexOf(field);
  if(colPlot < 0 || colField < 0) return false;
  for(let i = 2; i < vals.length; i++){
    if(String(vals[i][colPlot]||'').trim() === String(plot).trim()){
      sh.getRange(i+1, colField+1).setValue(value);
      return true;
    }
  }
  return false;
}

function updatePlotConstructionProgress_(plot, msDone){
  const sh = sheet('plot_construction');
  if(!sh) return false;
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];
  const colPlot = keys.indexOf('plot_id');
  const colCur  = keys.indexOf('current_milestone_id');
  const colPct  = keys.indexOf('progress_percent');
  const colLast = keys.indexOf('last_update_at');
  if(colPlot < 0) return false;

  for(let i = 2; i < vals.length; i++){
    if(String(vals[i][colPlot]||'').trim() === String(plot).trim()){
      const curId = Number(vals[i][colCur])||1;
      const maxDone = Math.max.apply(null, msDone.map(Number));
      const newCur = Math.max(curId, maxDone + 1);
      // คำนวณ progress: ใช้ weight% รวม
      const typeKey = plotTypeKey_(plot);
      const ms = readTab('milestones_template').filter(function(m){
        return String(m.house_type||'').toUpperCase() === typeKey;
      });
      let totalWt = 0, doneWt = 0;
      ms.forEach(function(m){
        const wt = Number(m.weight_percent)||0;
        totalWt += wt;
        if(Number(m.template_id) < newCur) doneWt += wt;
      });
      const newPct = totalWt > 0 ? Math.round(doneWt / totalWt * 100) : 0;
      if(colCur >= 0)  sh.getRange(i+1, colCur+1).setValue(newCur);
      if(colPct >= 0)  sh.getRange(i+1, colPct+1).setValue(newPct);
      if(colLast >= 0) sh.getRange(i+1, colLast+1).setValue(new Date().toISOString());
      return true;
    }
  }
  return false;
}

// อัปรูปหน้างานเข้า Drive + บันทึก row ใน construction_photos
// photo: {base64, mimeType, fileName, takenAt?, lat?, lng?}
function uploadConstructionPhoto_(updateId, plot, photo){
  if(!photo || !photo.base64) return null;
  const root = DriveApp.getFolderById(FILES_FOLDER_ID);
  const photoRoot = getOrCreateFolder(root, 'รูปหน้างาน');
  const plotFolder = getOrCreateFolder(photoRoot, 'แปลง ' + plot);
  const bytes = Utilities.base64Decode(photo.base64);
  const fileName = photo.fileName || ('photo-'+Date.now()+'.jpg');
  const blob = Utilities.newBlob(bytes, photo.mimeType || 'image/jpeg', fileName);
  const file = plotFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // บันทึก row ใน construction_photos
  const sh = sheet('construction_photos');
  if(sh){
    const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
    const photoId = 'P' + Date.now() + '-' + Math.floor(Math.random()*1000);
    const driveUrl = file.getUrl();
    const thumbUrl = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400';
    const row = {
      photo_id: photoId,
      update_id: updateId,
      drive_file_id: file.getId(),
      drive_url: driveUrl,
      thumbnail_url: thumbUrl,
      taken_at: photo.takenAt || new Date().toISOString(),
      exif_lat: photo.lat || '',
      exif_lng: photo.lng || '',
      file_size_kb: Math.round(bytes.length/1024),
      width: photo.width || '',
      height: photo.height || '',
      ai_caption: ''
    };
    sh.appendRow(keys.map(function(k){ return row[k] !== undefined ? row[k] : ''; }));
  }
  return file.getUrl();
}

// ===== getMilestonesAll — ดึง template ทั้งหมด (cache ได้นาน — ไม่ค่อยเปลี่ยน) =====
function getMilestonesAll(){
  const all = readTab('milestones_template');
  all.sort(function(a,b){
    const ha = String(a.house_type||'').localeCompare(String(b.house_type||''));
    if(ha !== 0) return ha;
    return (Number(a.milestone_order)||0) - (Number(b.milestone_order)||0);
  });
  // group by house_type
  const grouped = {};
  all.forEach(function(m){
    const t = String(m.house_type||'').toUpperCase();
    if(!grouped[t]) grouped[t] = [];
    grouped[t].push(m);
  });
  return {ok:true, milestones:all, byType:grouped};
}

// ===== foremanInit — รวม login + plots ใน call เดียว (เร็วขึ้นมาก) =====
function foremanInit(foreman, pin){
  const loginRes = foremanLogin(foreman, pin);
  if(!loginRes.ok) return loginRes;
  const plotsRes = getPlotsByForeman(foreman);
  const msRes = getMilestonesAll();
  return {
    ok: true,
    foreman: foreman,
    name: loginRes.name,
    plots: plotsRes.ok ? plotsRes.plots : [],
    milestones: msRes.ok ? msRes.byType : {}
  };
}

// ===== foremanLogin — ตรวจ PIN จาก users tab =====
// ของจริง: เก็บ PIN hash ใน users tab — โดย admin ตั้งให้แต่ละโฟร์แมน
// ของเดโม: ถ้าไม่พบ PIN ใน Sheet ใช้ '1234' เป็น default (เพื่อทดสอบได้)
function foremanLogin(foreman, pin){
  if(!foreman || !pin) return {ok:false, error:'ต้องระบุชื่อ + PIN'};
  const users = readTab('users');
  // หา user ที่ display_name มี foreman key
  const match = users.find(function(u){
    return String(u.display_name||'').indexOf(foreman) >= 0 ||
           String(u.role||'') === 'foreman';
  });
  // เช็ค PIN
  const expectedPin = (match && String(match.phone||'').trim()) || '1234';
  if(String(pin).trim() !== expectedPin){
    return {ok:false, error:'PIN ไม่ถูกต้อง'};
  }
  return {ok:true, foreman:foreman, name:'โฟร์แมน'+foreman};
}

// ============================================================
// ===== Round 5 — Auth + Roles + production tabs
// ============================================================
//
// users tab — column ที่ใช้ (extend จาก Round 1):
//   user_id | line_user_id | display_name | line_picture_url | phone | role | active | created_at | last_login_at
//   note: ใช้ "phone" column เก็บ PIN (4-6 หลัก) เพื่อรักษา schema เดิม
//
// 7 Roles + permissions (ตรงกับ demo-auth.js):
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

// ── All available permissions (สำหรับ UI กำหนดสิทธิ์รายคน) ──
const ALL_PERMISSIONS = [
  // View permissions
  {key:'view.home',                 group:'ดู — หน้าแรก',          label:'หน้า Home + filter ปุ่มตามสิทธิ์'},
  {key:'view.cost',                 group:'ดู — แดชบอร์ด',          label:'แดชบอร์ดต้นทุนบ้าน'},
  {key:'view.sales.dashboard',      group:'ดู — แดชบอร์ด',          label:'แดชบอร์ดงานขาย'},
  {key:'view.income.calc',          group:'ดู — แดชบอร์ด',          label:'คำนวณรายได้/สินเชื่อ'},
  {key:'view.construction.admin',   group:'ดู — แดชบอร์ด',          label:'แดชบอร์ดก่อสร้าง (admin)'},
  {key:'view.foreman',              group:'ดู — แดชบอร์ด',          label:'หน้าโฟร์แมน'},
  {key:'view.transfer',             group:'ดู — งานโอน',           label:'แดชบอร์ดงานโอนกรรมสิทธิ์'},
  {key:'view.payments',             group:'ดู — การเงิน',          label:'รายการผ่อนดาวน์'},
  {key:'view.fees',                 group:'ดู — การเงิน',          label:'ค่าส่วนกลาง'},
  {key:'view.customers',            group:'ดู — ลูกค้า',           label:'ลูกค้าวอร์คอิน'},
  // Create — เอกสารขาย
  {key:'create.quotation',          group:'สร้าง — เอกสาร',        label:'ออกใบเสนอราคา'},
  {key:'create.booking',            group:'สร้าง — เอกสาร',        label:'ออกใบจอง'},
  {key:'create.contract',           group:'สร้าง — เอกสาร',        label:'ออกสัญญา'},
  {key:'create.receipt',            group:'สร้าง — เอกสาร',        label:'ออกใบเสร็จ'},
  {key:'create.promotion',          group:'สร้าง — เอกสาร',        label:'ใบโปรโมชั่น'},
  {key:'create.walkin',             group:'สร้าง — ลูกค้า',         label:'บันทึกลูกค้าวอร์คอิน'},
  // Manage — แก้/บันทึก
  {key:'manage.construction',       group:'จัดการ — ก่อสร้าง',      label:'เริ่ม/หยุดการก่อสร้าง · assign โฟร์แมน'},
  {key:'update.field',              group:'จัดการ — ก่อสร้าง',      label:'อัปเดตงานหน้าไซต์ (โฟร์แมน)'},
  {key:'manage.payments',           group:'จัดการ — การเงิน',       label:'บันทึก/แก้ผ่อนดาวน์'},
  {key:'manage.fees',               group:'จัดการ — การเงิน',       label:'บันทึกค่าส่วนกลาง · แก้อัตรา'},
  {key:'manage.transfer',           group:'จัดการ — งานโอน',        label:'แก้ checklist · บันทึกเอกสารวันโอน'},
  {key:'upload.cost',               group:'จัดการ — อื่นๆ',          label:'อัปโหลด Excel ต้นทุน Ecount'}
];

function canPermission_(role, perm){
  const perms = ROLE_PERMS[role] || [];
  return perms.indexOf('*') >= 0 || perms.indexOf(perm) >= 0;
}

// เช็คสิทธิ์โดยรวม role + custom permissions (ใช้ session.permissions ถ้ามี)
function canPermissionUser_(session, perm){
  const perms = (session && session.permissions) || ROLE_PERMS[session && session.role] || [];
  return perms.indexOf('*') >= 0 || perms.indexOf(perm) >= 0;
}

// Sessions เก็บใน Script Properties (ขึ้น/ลง = ภายใน 1 ชม. ก็โอเค) แต่ schema:
// SessionMap = {token: {userId, role, username, expiresAt}}
function loadSessions_(){
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('OV_SESSIONS');
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}
function saveSessions_(m){
  PropertiesService.getScriptProperties().setProperty('OV_SESSIONS', JSON.stringify(m));
}
function pruneSessions_(m){
  const now = Date.now(); let changed = false;
  Object.keys(m).forEach(t => { if(m[t].expiresAt < now){ delete m[t]; changed=true; }});
  if(changed) saveSessions_(m);
  return m;
}
function genToken_(){
  return 'tok_' + Date.now() + '_' + Math.random().toString(36).slice(2,12);
}

// Helper — รวม role permissions + custom permissions
function getUserPermissions_(u){
  const rolePerms = ROLE_PERMS[u.role] || [];
  if(rolePerms.indexOf('*') >= 0) return ['*'];
  let custom = [];
  try {
    if(u.custom_permissions){
      const v = String(u.custom_permissions).trim();
      if(v && v !== 'null') custom = JSON.parse(v);
      if(!Array.isArray(custom)) custom = [];
    }
  } catch(e){ custom = []; }
  return Array.from(new Set([...rolePerms, ...custom]));
}

// authLogin — return {ok, token, user:{username,role,permissions}}
function authLogin(username, pin){
  if(!username || !pin) return {ok:false, error:'ต้องระบุชื่อ + PIN'};
  const users = readTab('users');
  const u = users.find(x =>
    String(x.display_name||'').trim() === String(username).trim() &&
    String(x.phone||'').trim() === String(pin).trim());
  if(!u) return {ok:false, error:'ชื่อ หรือ PIN ไม่ถูกต้อง'};
  if(String(u.active) === '0' || String(u.active).toLowerCase() === 'false')
    return {ok:false, error:'บัญชีนี้ถูกระงับการใช้งาน'};

  const token = genToken_();
  const sessions = pruneSessions_(loadSessions_());
  sessions[token] = {
    userId: u.user_id,
    username: u.display_name,
    role: u.role || 'viewer',
    permissions: getUserPermissions_(u),
    expiresAt: Date.now() + (8 * 60 * 60 * 1000)
  };
  saveSessions_(sessions);

  return {
    ok: true,
    token: token,
    user: {
      userId: u.user_id,
      username: u.display_name,
      role: u.role || 'viewer',
      permissions: sessions[token].permissions
    }
  };
}

function authVerify(token){
  if(!token) return {ok:false, error:'no token'};
  const sessions = pruneSessions_(loadSessions_());
  const s = sessions[token];
  if(!s) return {ok:false, error:'session หมดอายุ — กรุณา login ใหม่'};
  return {
    ok: true,
    user: {
      userId: s.userId, username: s.username, role: s.role,
      permissions: s.permissions || ROLE_PERMS[s.role] || []
    }
  };
}

function authLogout(token){
  const sessions = loadSessions_();
  delete sessions[token];
  saveSessions_(sessions);
  return {ok:true};
}

// requireAuth_ — helper สำหรับ functions ที่ต้องเช็คสิทธิ์ก่อน
// ใช้ session.permissions (รวม role + custom) แทน ROLE_PERMS ตรงๆ
function requireAuth_(token, permission){
  const v = authVerify(token);
  if(!v.ok) return v;
  if(permission){
    const perms = v.user.permissions || [];
    if(perms.indexOf('*') < 0 && perms.indexOf(permission) < 0){
      return {ok:false, error:'ไม่มีสิทธิ์: '+permission};
    }
  }
  return {ok:true, user:v.user};
}

// ── User CRUD (admin/developer only) ──
function userList(token){
  const a = requireAuth_(token, '*');
  // อนุญาตให้ admin ดู users ด้วย (ไม่ใช่แค่ dev)
  if(!a.ok){
    const a2 = requireAuth_(token);
    if(!a2.ok) return a;
    if(a2.user.role !== 'admin' && a2.user.role !== 'developer'){
      return {ok:false, error:'ไม่มีสิทธิ์ดู users'};
    }
  }
  const users = readTab('users');
  return {ok:true, users:users};
}

function userSave(token, data){
  const a = requireAuth_(token);
  if(!a.ok) return a;
  if(a.user.role !== 'developer'){
    return {ok:false, error:'เฉพาะ developer แก้ users ได้'};
  }
  if(!data || !data.username || !data.pin) return {ok:false, error:'ต้องระบุ username + pin'};

  const sh = sheet('users');
  if(!sh) return {ok:false, error:'ไม่พบ tab: users'};
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];

  // หาตำแหน่งของ row ที่ตรงกับ user_id หรือ display_name
  let foundRow = -1;
  if(data.userId){
    for(let i=2; i<vals.length; i++){
      if(String(vals[i][keys.indexOf('user_id')]) === String(data.userId)){ foundRow = i+1; break; }
    }
  }

  // ถ้าไม่มี และเพิ่มใหม่ — ตรวจชื่อซ้ำ
  if(foundRow < 0){
    for(let i=2; i<vals.length; i++){
      if(String(vals[i][keys.indexOf('display_name')]).trim() === String(data.username).trim()){
        return {ok:false, error:'ชื่อนี้มีอยู่แล้ว'};
      }
    }
  }

  // ตรวจว่ามี column custom_permissions ใน users tab ไหม — ถ้าไม่มี เพิ่มให้
  ensureUsersCustomPermsColumn_();
  const keys2 = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];

  const row = {
    user_id: data.userId || ('u_' + Date.now()),
    line_user_id: '',
    display_name: String(data.username).trim(),
    line_picture_url: '',
    phone: String(data.pin).trim(),
    role: data.role || 'viewer',
    active: (data.active === false || String(data.active)==='0') ? 0 : 1,
    created_at: new Date().toISOString(),
    last_login_at: '',
    custom_permissions: data.customPermissions
      ? JSON.stringify(Array.isArray(data.customPermissions) ? data.customPermissions : [])
      : ''
  };

  if(foundRow > 0){
    // update — keep created_at + only update fields ที่ส่งมา
    Object.keys(row).forEach(k => {
      const col = keys2.indexOf(k);
      if(col >= 0 && k !== 'created_at' && k !== 'user_id'){
        sh.getRange(foundRow, col+1).setValue(row[k]);
      }
    });
    return {ok:true, userId: row.user_id, action:'updated'};
  } else {
    const rowArr = keys2.map(k => row[k] !== undefined ? row[k] : '');
    sh.appendRow(rowArr);
    return {ok:true, userId: row.user_id, action:'added'};
  }
}

// เพิ่ม column custom_permissions ถ้ายังไม่มี
function ensureUsersCustomPermsColumn_(){
  const sh = sheet('users');
  if(!sh) return;
  const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  if(keys.indexOf('custom_permissions') >= 0) return;
  const newCol = sh.getLastColumn() + 1;
  sh.getRange(1, newCol).setValue('custom_permissions');
  sh.getRange(2, newCol).setValue('สิทธิ์เพิ่ม (JSON)');
}

// listAllPermissions — สำหรับ developer page (เลือกสิทธิ์รายตัว)
function listAllPermissions(token){
  const a = requireAuth_(token);
  if(!a.ok) return a;
  if(a.user.role !== 'developer' && a.user.role !== 'admin') return {ok:false, error:'ไม่มีสิทธิ์'};
  return {ok:true, permissions: ALL_PERMISSIONS, rolePerms: ROLE_PERMS};
}

function userDelete(token, userId){
  const a = requireAuth_(token);
  if(!a.ok) return a;
  if(a.user.role !== 'developer') return {ok:false, error:'เฉพาะ developer ลบ user ได้'};
  if(!userId) return {ok:false, error:'ต้องระบุ userId'};

  const sh = sheet('users');
  if(!sh) return {ok:false, error:'ไม่พบ tab: users'};
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];
  const userIdCol = keys.indexOf('user_id');
  const roleCol = keys.indexOf('role');

  for(let i=2; i<vals.length; i++){
    if(String(vals[i][userIdCol]) === String(userId)){
      // ห้ามลบ developer คนสุดท้าย
      if(vals[i][roleCol] === 'developer'){
        const devs = vals.filter((r,idx) => idx>=2 && r[roleCol] === 'developer');
        if(devs.length <= 1) return {ok:false, error:'ต้องมี developer อย่างน้อย 1 คน'};
      }
      sh.deleteRow(i+1);
      return {ok:true};
    }
  }
  return {ok:false, error:'ไม่พบ user'};
}

// ============================================================
// ===== Walkin v2 — Sheet tab "walkins_v2" (Round 5)
// ============================================================
const WALKIN_V2_KEYS = ['walkin_id','date','name','phone','fb','line','source',
  'budget','houseType','plotInterest','promo','agent','compete','status','rating',
  'feedback','followup','createdAt','updatedAt'];

function ensureWalkinV2_(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName('walkins_v2');
  if(!sh){
    sh = ss.insertSheet('walkins_v2');
    sh.getRange(1,1,1,WALKIN_V2_KEYS.length).setValues([WALKIN_V2_KEYS]);
    sh.getRange(2,1,1,WALKIN_V2_KEYS.length).setValues([['ID','วันที่','ชื่อ','โทร','Facebook','LINE','แหล่งที่มา',
      'งบ','แบบบ้าน','แปลงสนใจ','โปรโม','เซลส์','คู่แข่ง','สถานะ','คะแนน',
      'คำติชม','Follow-up','สร้างเมื่อ','แก้ไขเมื่อ']]);
    sh.setFrozenRows(2);
  }
  return sh;
}

function getWalkinsV2(token){
  const a = requireAuth_(token, 'view.customers');
  if(!a.ok){
    const a2 = requireAuth_(token, 'create.walkin');
    if(!a2.ok) return a;
  }
  ensureWalkinV2_();
  return {ok:true, walkins: readTab('walkins_v2')};
}

function saveWalkinV2(token, data){
  const a = requireAuth_(token, 'create.walkin');
  if(!a.ok) return a;
  if(!data || !data.name) return {ok:false, error:'ต้องระบุชื่อ'};

  const sh = ensureWalkinV2_();
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];
  const now = new Date().toISOString();

  if(data.walkin_id){
    // Update
    for(let i=2; i<vals.length; i++){
      if(String(vals[i][keys.indexOf('walkin_id')]) === String(data.walkin_id)){
        WALKIN_V2_KEYS.forEach(k => {
          if(k === 'walkin_id' || k === 'createdAt') return;
          const col = keys.indexOf(k);
          if(col >= 0 && data[k] !== undefined){
            sh.getRange(i+1, col+1).setValue(data[k]);
          }
        });
        sh.getRange(i+1, keys.indexOf('updatedAt')+1).setValue(now);
        return {ok:true, walkin_id: data.walkin_id, action:'updated'};
      }
    }
  }
  // Insert
  const id = 'w_' + Date.now();
  const row = {...data, walkin_id: id, createdAt: now, updatedAt: now};
  const rowArr = keys.map(k => row[k] !== undefined ? row[k] : '');
  sh.appendRow(rowArr);
  return {ok:true, walkin_id: id, action:'added'};
}

function deleteWalkinV2(token, walkinId){
  const a = requireAuth_(token, 'create.walkin');
  if(!a.ok) return a;
  if(!walkinId) return {ok:false, error:'ต้องระบุ walkinId'};
  const sh = sheet('walkins_v2');
  if(!sh) return {ok:false, error:'ไม่พบ tab'};
  const vals = sh.getDataRange().getValues();
  const idCol = vals[0].indexOf('walkin_id');
  for(let i=2; i<vals.length; i++){
    if(String(vals[i][idCol]) === String(walkinId)){
      sh.deleteRow(i+1);
      return {ok:true};
    }
  }
  return {ok:false, error:'ไม่พบ'};
}

// ============================================================
// ===== Payments / Fees / Transfers (Round 5)
// ============================================================
const PAYMENT_KEYS = ['payment_id','plot','installmentNo','dueDate','paid','paidDate',
  'amount','method','slipUrl','note','createdAt'];
const FEE_KEYS = ['fee_id','plot','date','months','amount','method','period','slipUrl','note','createdAt'];
const TRANSFER_KEYS = ['plot','transferDate','bank','loanAmount','docsReady','docsTotal','status',
  'cName','deed','landNo','contractPrice','assetPrice','evalPrice','note','updatedAt'];
const CHECKLIST_KEYS = ['plot','checklist_state','updatedAt']; // JSON blob ใน checklist_state

function ensureTab_(name, keys, labels){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if(!sh){
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,keys.length).setValues([keys]);
    sh.getRange(2,1,1,(labels||keys).length).setValues([labels||keys]);
    sh.setFrozenRows(2);
  }
  return sh;
}

function getPayments(token){
  const a = requireAuth_(token, 'view.payments');
  if(!a.ok) return a;
  ensureTab_('down_installments', PAYMENT_KEYS);
  return {ok:true, payments: readTab('down_installments')};
}
function savePayment(token, data){
  const a = requireAuth_(token, 'manage.payments');
  if(!a.ok) return a;
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุ plot'};
  const sh = ensureTab_('down_installments', PAYMENT_KEYS);
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];
  const now = new Date().toISOString();

  // อัปสลิป ถ้ามี base64 — เก็บใน "แปลง XXX/ผ่อนดาวน์/"
  let slipUrl = data.slipUrl || '';
  if(data.slipBase64){
    try {
      const folder = getOrCreateSubFolder_(data.plot, 'payment');
      const bytes = Utilities.base64Decode(data.slipBase64);
      const fileName = data.slipFileName || ('slip-'+data.plot+'-งวด'+(data.installmentNo||'')+'-'+Date.now()+'.jpg');
      const file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', fileName));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      slipUrl = file.getUrl();
    } catch(e){}
  }

  // ค้น row เดิม (by plot + installmentNo)
  if(data.installmentNo){
    for(let i=2; i<vals.length; i++){
      if(String(vals[i][keys.indexOf('plot')]) === String(data.plot) &&
         String(vals[i][keys.indexOf('installmentNo')]) === String(data.installmentNo)){
        // update
        ['paid','paidDate','amount','method','note','dueDate'].forEach(k => {
          const col = keys.indexOf(k);
          if(col >= 0 && data[k] !== undefined) sh.getRange(i+1, col+1).setValue(data[k]);
        });
        if(slipUrl) sh.getRange(i+1, keys.indexOf('slipUrl')+1).setValue(slipUrl);
        return {ok:true, slipUrl, action:'updated'};
      }
    }
  }
  // insert
  const id = 'pay_' + Date.now();
  const row = {...data, payment_id: id, slipUrl, createdAt: now};
  sh.appendRow(keys.map(k => row[k] !== undefined ? row[k] : ''));
  return {ok:true, payment_id: id, slipUrl, action:'added'};
}

function getFees(token){
  const a = requireAuth_(token, 'view.fees');
  if(!a.ok) return a;
  ensureTab_('fees', FEE_KEYS);
  return {ok:true, fees: readTab('fees')};
}
function saveFee(token, data){
  const a = requireAuth_(token, 'manage.fees');
  if(!a.ok) return a;
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุ plot'};
  const sh = ensureTab_('fees', FEE_KEYS);

  let slipUrl = data.slipUrl || '';
  if(data.slipBase64){
    try {
      const folder = getOrCreateSubFolder_(data.plot, 'fee');
      const bytes = Utilities.base64Decode(data.slipBase64);
      const fileName = data.slipFileName || ('fee-'+data.plot+'-'+Date.now()+'.jpg');
      const file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', fileName));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      slipUrl = file.getUrl();
    } catch(e){}
  }
  const id = 'fee_' + Date.now();
  const row = {...data, fee_id: id, slipUrl, createdAt: new Date().toISOString()};
  const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(keys.map(k => row[k] !== undefined ? row[k] : ''));
  return {ok:true, fee_id: id, slipUrl};
}
function deleteFee(token, feeId){
  const a = requireAuth_(token, 'manage.fees');
  if(!a.ok) return a;
  const sh = sheet('fees');
  if(!sh) return {ok:false, error:'ไม่พบ tab'};
  const vals = sh.getDataRange().getValues();
  const idCol = vals[0].indexOf('fee_id');
  for(let i=2; i<vals.length; i++){
    if(String(vals[i][idCol]) === String(feeId)){
      sh.deleteRow(i+1);
      return {ok:true};
    }
  }
  return {ok:false, error:'ไม่พบ'};
}

function getTransfers(token){
  const a = requireAuth_(token, 'view.transfer');
  if(!a.ok) return a;
  ensureTab_('transfers', TRANSFER_KEYS);
  return {ok:true, transfers: readTab('transfers')};
}
function saveTransfer(token, data){
  const a = requireAuth_(token, 'manage.transfer');
  if(!a.ok) return a;
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุ plot'};
  const sh = ensureTab_('transfers', TRANSFER_KEYS);
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];
  const now = new Date().toISOString();

  for(let i=2; i<vals.length; i++){
    if(String(vals[i][keys.indexOf('plot')]) === String(data.plot)){
      keys.forEach(k => {
        if(k === 'plot' || data[k] === undefined) return;
        const col = keys.indexOf(k);
        if(col >= 0) sh.getRange(i+1, col+1).setValue(data[k]);
      });
      sh.getRange(i+1, keys.indexOf('updatedAt')+1).setValue(now);
      return {ok:true, action:'updated'};
    }
  }
  const row = {...data, updatedAt: now};
  sh.appendRow(keys.map(k => row[k] !== undefined ? row[k] : ''));
  return {ok:true, action:'added'};
}

function getChecklistState(token, plot){
  const a = requireAuth_(token, 'view.transfer');
  if(!a.ok) return a;
  if(!plot) return {ok:false, error:'ต้องระบุ plot'};
  ensureTab_('transfer_checklists', CHECKLIST_KEYS);
  const all = readTab('transfer_checklists');
  const row = all.find(x => String(x.plot) === String(plot));
  if(!row) return {ok:true, state: null};
  try {
    return {ok:true, state: JSON.parse(row.checklist_state)};
  } catch(e){
    return {ok:true, state: null};
  }
}
function saveChecklistState(token, data){
  const a = requireAuth_(token, 'manage.transfer');
  if(!a.ok) return a;
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุ plot'};
  const sh = ensureTab_('transfer_checklists', CHECKLIST_KEYS);
  const vals = sh.getDataRange().getValues();
  const keys = vals[0];
  const blob = JSON.stringify(data.state || {});
  const now = new Date().toISOString();
  for(let i=2; i<vals.length; i++){
    if(String(vals[i][keys.indexOf('plot')]) === String(data.plot)){
      sh.getRange(i+1, keys.indexOf('checklist_state')+1).setValue(blob);
      sh.getRange(i+1, keys.indexOf('updatedAt')+1).setValue(now);
      return {ok:true, action:'updated'};
    }
  }
  sh.appendRow([data.plot, blob, now]);
  return {ok:true, action:'added'};
}

// ============================================================
// ===== Round 6 — Plot Folders + Doc Upload + Invoice
// ============================================================
//
// โครงสร้างโฟลเดอร์ใน Drive (One Vela Sales Files):
//   แปลง XXX/
//     ผ่อนดาวน์/            (สลิปผ่อนดาวน์)
//     ค่าส่วนกลาง/          (สลิปค่าส่วนกลาง + ใบแจ้งหนี้)
//     ใบชี้แจงเงินวันโอน/   (PDF ที่ออกในวันโอน — versioned)
//     ใบแยกเช็ค/            (PDF ที่ส่งธนาคาร — versioned)
//     เอกสาร/               (ใบเสนอราคา/จอง/สัญญา/ใบเสร็จ — ของเดิม)
//
// Sub-folder names ใช้ตัวเดียวกันทั้งระบบ (เพื่อให้หาง่าย)
const SUBFOLDERS = {
  payment:   'ผ่อนดาวน์',
  fee:       'ค่าส่วนกลาง',
  transferMoney: 'ใบชี้แจงเงินวันโอน',
  transferCheque: 'ใบแยกเช็ค',
  docs:      'เอกสาร'
};

// ── สร้าง/หา folder ของแปลง + sub-folder ──
function getOrCreatePlotFolder_(plot){
  const root = DriveApp.getFolderById(FILES_FOLDER_ID);
  return getOrCreateFolder(root, 'แปลง ' + String(plot).replace(/^0+/,''));
}

function getOrCreateSubFolder_(plot, subKey){
  const subName = SUBFOLDERS[subKey] || subKey;
  return getOrCreateFolder(getOrCreatePlotFolder_(plot), subName);
}

// คืน URLs ของ folder รายแปลง + sub-folders ทั้งหมด
function getPlotFolderUrls(token, plot){
  const a = requireAuth_(token);
  if(!a.ok) return a;
  if(!plot) return {ok:false, error:'ต้องระบุ plot'};
  try {
    const main = getOrCreatePlotFolder_(plot);
    const result = {ok:true, plot:plot, mainUrl: main.getUrl(), subs:{}};
    Object.keys(SUBFOLDERS).forEach(function(k){
      result.subs[k] = {name: SUBFOLDERS[k], url: getOrCreateSubFolder_(plot, k).getUrl()};
    });
    return result;
  } catch(e){ return {ok:false, error:String(e)}; }
}

// Bulk create — สำหรับ admin รัน 1 ครั้ง (483 แปลง batch ครั้งละ 50)
function prewarmPlotFolders(token, start, count){
  const a = requireAuth_(token);
  if(!a.ok) return a;
  if(a.user.role !== 'developer' && a.user.role !== 'admin'){
    return {ok:false, error:'เฉพาะ admin/developer'};
  }
  start = Math.max(1, Number(start)||1);
  count = Math.min(100, Math.max(1, Number(count)||50));

  // ดึง plot numbers จาก metadata
  const plots = readTab('metadata').map(p => String(p.plot||'').trim()).filter(Boolean);
  const created = [];
  const errors = [];
  const slice = plots.slice(start-1, start-1+count);
  const startMs = Date.now();

  for(let i = 0; i < slice.length; i++){
    if(Date.now() - startMs > 280000) break; // safety: หยุดก่อน timeout 6 นาที
    const p = slice[i];
    try {
      const main = getOrCreatePlotFolder_(p);
      // สร้าง 4 sub-folders ที่ใช้บ่อย
      ['payment','fee','transferMoney','transferCheque'].forEach(function(k){
        getOrCreateSubFolder_(p, k);
      });
      created.push(p);
    } catch(e){ errors.push({plot:p, error:String(e)}); }
  }
  return {
    ok:true, processed: created.length, errors: errors,
    total: plots.length, from: start, to: start + created.length - 1,
    hasMore: (start + created.length - 1) < plots.length
  };
}

// upload เอกสารใดๆ เข้า sub-folder ของแปลง
// data: {plot, docType ('payment'|'fee'|'transferMoney'|'transferCheque'), base64, fileName, mimeType?}
function uploadDocToPlot(token, data){
  const a = requireAuth_(token);
  if(!a.ok) return a;
  if(!data || !data.plot || !data.docType || !data.base64) {
    return {ok:false, error:'ต้องระบุ plot + docType + base64'};
  }
  if(!SUBFOLDERS[data.docType]) return {ok:false, error:'docType ไม่ถูกต้อง'};
  try {
    const folder = getOrCreateSubFolder_(data.plot, data.docType);
    const bytes = Utilities.base64Decode(data.base64);
    const fileName = data.fileName || (data.docType+'-'+data.plot+'-'+Date.now()+'.pdf');
    const file = folder.createFile(Utilities.newBlob(bytes, data.mimeType || 'application/pdf', fileName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {ok:true, fileId: file.getId(), fileName: fileName, url: file.getUrl()};
  } catch(e){ return {ok:false, error:String(e)}; }
}

// list ไฟล์ใน sub-folder ของแปลง (ดูประวัติ)
function listDocsInPlot(token, plot, docType){
  const a = requireAuth_(token);
  if(!a.ok) return a;
  if(!plot || !docType) return {ok:false, error:'ต้องระบุ plot + docType'};
  if(!SUBFOLDERS[docType]) return {ok:false, error:'docType ไม่ถูกต้อง'};
  try {
    const folder = getOrCreateSubFolder_(plot, docType);
    const it = folder.getFiles();
    const list = [];
    while(it.hasNext()){
      const f = it.next();
      list.push({
        id: f.getId(), name: f.getName(),
        url: f.getUrl(), size: f.getSize(),
        created: f.getDateCreated().toISOString()
      });
    }
    list.sort(function(a,b){ return b.created.localeCompare(a.created); });
    return {ok:true, folderUrl: folder.getUrl(), files: list};
  } catch(e){ return {ok:false, error:String(e)}; }
}

// ── Fee rate (เก็บใน Script Properties) ──
function getFeeRate(){
  try {
    const r = PropertiesService.getScriptProperties().getProperty('OV_FEE_RATE');
    return {ok:true, rate: Number(r) || 1500};
  } catch(e){ return {ok:true, rate: 1500}; }
}
function setFeeRate(token, rate){
  const a = requireAuth_(token, 'manage.fees');
  if(!a.ok) return a;
  if(!rate || rate < 0) return {ok:false, error:'rate ไม่ถูกต้อง'};
  PropertiesService.getScriptProperties().setProperty('OV_FEE_RATE', String(rate));
  return {ok:true, rate: rate};
}

// แก้ saveFee ให้ใช้ folder รายแปลง (override + override slipBase64 ไป sub-folder ค่าส่วนกลาง)
function saveFee_v2_(token, data){
  const a = requireAuth_(token, 'manage.fees');
  if(!a.ok) return a;
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุ plot'};
  const sh = ensureTab_('fees', FEE_KEYS);

  let slipUrl = data.slipUrl || '';
  if(data.slipBase64){
    try {
      const folder = getOrCreateSubFolder_(data.plot, 'fee');
      const bytes = Utilities.base64Decode(data.slipBase64);
      const fileName = data.slipFileName || ('fee-'+data.plot+'-'+Date.now()+'.jpg');
      const file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', fileName));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      slipUrl = file.getUrl();
    } catch(e){}
  }
  const id = 'fee_' + Date.now();
  const row = {...data, fee_id: id, slipUrl, createdAt: new Date().toISOString()};
  const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(keys.map(function(k){ return row[k] !== undefined ? row[k] : ''; }));
  return {ok:true, fee_id: id, slipUrl};
}

// ============================================================
// ===== Round 8 — Fee Invoices (ใบแจ้งหนี้ค่าส่วนกลาง)
// ============================================================
// Sheet tab "fee_invoices":
//   invoice_no | plot | cName | cAddr | periodFrom | periodTo | months | rate |
//   total | dueDate | status | pdfUrl | note | createdAt | createdBy

const INVOICE_KEYS = ['invoice_no','plot','cName','cAddr','periodFrom','periodTo',
  'months','rate','total','dueDate','status','pdfUrl','note','createdAt','createdBy'];

function ensureInvoiceTab_(){
  return ensureTab_('fee_invoices', INVOICE_KEYS,
    ['เลขที่ใบ','แปลง','ลูกค้า','ที่อยู่','ช่วงตั้งแต่','ถึง','เดือน','อัตรา',
     'รวม','วันครบ','สถานะ','ลิงก์ PDF','หมายเหตุ','สร้างเมื่อ','สร้างโดย']);
}

// auto-gen เลขที่ใบ: INV-YYMM-NNN
function getNextInvoiceNo(){
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const d = new Date();
    const mm = ('0'+(d.getMonth()+1)).slice(-2);
    const yy = ((d.getFullYear()+543) % 100).toString().padStart(2,'0');
    const prefix = 'INV-'+yy+mm;
    const sh = sheet('counters');
    if(!sh) return prefix+'-001';
    const vals = sh.getDataRange().getValues();
    let row = -1, current = 0;
    for(let i=1; i<vals.length; i++){
      if(String(vals[i][0]).trim() === prefix){ row = i+1; current = Number(vals[i][1])||0; break; }
    }
    const next = current + 1;
    if(row > 0) sh.getRange(row, 2).setValue(next);
    else sh.appendRow([prefix, next]);
    return prefix + '-' + String(next).padStart(3,'0');
  } finally { lock.releaseLock(); }
}

// บันทึก invoice + render HTML → upload เข้า "แปลง XXX/ค่าส่วนกลาง/"
function saveInvoice(token, data){
  const a = requireAuth_(token, 'manage.fees');
  if(!a.ok) return a;
  if(!data || !data.plot) return {ok:false, error:'ต้องระบุ plot'};

  const sh = ensureInvoiceTab_();
  const invoiceNo = data.invoice_no || getNextInvoiceNo();
  const now = new Date().toISOString();

  // render HTML ของใบแจ้งหนี้
  const html = renderInvoiceHTML_(Object.assign({invoice_no: invoiceNo}, data));

  // upload เข้า Drive "แปลง XXX/ค่าส่วนกลาง/"
  let pdfUrl = '';
  try {
    const folder = getOrCreateSubFolder_(data.plot, 'fee');
    const fileName = 'invoice-'+invoiceNo+'-'+data.plot+'.html';
    const bytes = Utilities.newBlob(html, 'text/html', fileName).getBytes();
    const file = folder.createFile(Utilities.newBlob(bytes, 'text/html', fileName));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    pdfUrl = file.getUrl();
  } catch(e){}

  // บันทึก Sheet
  const row = {
    invoice_no: invoiceNo,
    plot: data.plot,
    cName: data.cName || '',
    cAddr: data.cAddr || '',
    periodFrom: data.periodFrom || '',
    periodTo: data.periodTo || '',
    months: Number(data.months)||0,
    rate: Number(data.rate)||0,
    total: Number(data.total)||0,
    dueDate: data.dueDate || '',
    status: data.status || 'unpaid',
    pdfUrl: pdfUrl,
    note: data.note || '',
    createdAt: now,
    createdBy: a.user.username
  };
  const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  sh.appendRow(keys.map(function(k){ return row[k] !== undefined ? row[k] : ''; }));
  return {ok:true, invoice_no: invoiceNo, pdfUrl: pdfUrl};
}

function listInvoicesForPlot(token, plot){
  const a = requireAuth_(token, 'view.fees');
  if(!a.ok) return a;
  if(!plot) return {ok:false, error:'ต้องระบุ plot'};
  ensureInvoiceTab_();
  const all = readTab('fee_invoices');
  const filtered = all.filter(function(r){
    return String(r.plot).trim() === String(plot).trim();
  });
  filtered.sort(function(a,b){
    return String(b.createdAt||'').localeCompare(String(a.createdAt||''));
  });
  return {ok:true, invoices: filtered};
}

// render HTML ของใบแจ้งหนี้ (สไตล์เดียวกับใบเสร็จ — หัวบริษัท + รายการ + ลายเซ็น)
function renderInvoiceHTML_(d){
  const fmt = function(n){ return Number(n||0).toLocaleString('th-TH'); };
  const th = function(dStr){
    if(!dStr) return '-';
    const dt = new Date(dStr);
    const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    if(isNaN(dt.getTime())) return dStr;
    return dt.getDate()+' '+m[dt.getMonth()]+' '+(dt.getFullYear()+543);
  };
  return '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">' +
    '<title>ใบแจ้งหนี้ '+d.invoice_no+'</title>' +
    '<style>body{font-family:"Sarabun",sans-serif;padding:30px;color:#2b2b2b;max-width:780px;margin:auto}' +
    '.hd{display:flex;align-items:center;gap:14px;border-bottom:2px solid #3d3d3d;padding-bottom:12px;margin-bottom:16px}' +
    '.hd .logo{width:60px;height:60px;background:linear-gradient(135deg,#3d3d3d,#5a5a5a);color:#fff;border-radius:8px;' +
      'display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800}' +
    '.hd .co{flex:1}.co-nm{font-size:18px;font-weight:800;color:#3d3d3d;line-height:1.2}' +
    '.co-sub{font-size:11.5px;color:#666;margin-top:2px;line-height:1.5}' +
    '.title{background:#fce7f3;border:1px solid #f9a8d4;color:#9d174d;padding:10px 16px;border-radius:8px;' +
      'text-align:center;font-weight:800;font-size:18px;margin:14px 0}' +
    '.no-date{display:flex;justify-content:space-between;font-size:13px;margin-bottom:14px}' +
    '.no-date .lbl{color:#666;font-weight:600}.no-date .val{font-weight:700;color:#b08d57}' +
    '.cust{background:#f7f8fa;padding:12px 16px;border-radius:8px;margin-bottom:14px;font-size:13px}' +
    '.cust .lbl{color:#666;font-weight:600;display:inline-block;min-width:80px}' +
    '.cust .val{font-weight:700}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px}' +
    'th{background:#3d3d3d;color:#fff;font-weight:700;padding:10px 12px;text-align:left;font-size:12px;letter-spacing:.5px}' +
    'td{padding:10px 12px;border-bottom:1px solid #e2e6ea}' +
    '.r{text-align:right}.total-row{background:#fef3c7;font-weight:800}' +
    '.due-box{background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:12px 16px;border-radius:8px;' +
      'text-align:center;font-weight:700;margin:14px 0;font-size:14px}' +
    '.pay-info{background:#e0f2fe;border:1px solid #7dd3fc;color:#075985;padding:12px 16px;border-radius:8px;' +
      'font-size:12.5px;line-height:1.7;margin-bottom:14px}' +
    '.pay-info b{color:#0c4a6e}' +
    '.foot{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:30px}' +
    '.sig{text-align:center}.sig .line{border-bottom:1px solid #000;height:50px;margin-bottom:6px}' +
    '.sig .lbl{font-weight:700;font-size:13px}.sig .sub{font-size:11px;color:#666}' +
    '.note{font-size:11px;color:#666;margin-top:14px;border-top:1px dashed #ccc;padding-top:10px}' +
    '@media print{body{padding:15px}.title{background:#fce7f3!important}}' +
    '</style></head><body>' +
    '<div class="hd"><div class="logo">TB</div>' +
      '<div class="co"><div class="co-nm">บริษัท ทู บิลด์ ดีเวลลอปเม้นท์ จำกัด</div>' +
      '<div class="co-sub">TWO BUILD DEVELOPMENT CO., LTD. · TAX ID: ___________<br>' +
      '89 หมู่ที่ 1 ต.คลองตำหรุ อ.เมืองชลบุรี จ.ชลบุรี 20000 · โทร 092-787-4222</div></div></div>' +
    '<div class="title">📄 ใบแจ้งหนี้ค่าส่วนกลาง · INVOICE</div>' +
    '<div class="no-date">' +
      '<div><span class="lbl">เลขที่ใบ:</span> <span class="val">'+d.invoice_no+'</span></div>' +
      '<div><span class="lbl">วันที่ออก:</span> <span class="val">'+th(d.createdAt||new Date().toISOString())+'</span></div>' +
    '</div>' +
    '<div class="cust">' +
      '<div><span class="lbl">เรียน:</span> <span class="val">'+(d.cName||'-')+'</span></div>' +
      '<div><span class="lbl">บ้านเลขที่:</span> <span class="val">แปลง '+d.plot+'</span></div>' +
      (d.cAddr?'<div><span class="lbl">ที่อยู่:</span> <span class="val">'+d.cAddr+'</span></div>':'') +
    '</div>' +
    '<table><thead><tr>' +
      '<th>รายการ</th><th class="r">จำนวน (เดือน)</th><th class="r">อัตรา/เดือน</th><th class="r">รวม (บาท)</th>' +
    '</tr></thead><tbody>' +
    '<tr><td>ค่าส่วนกลาง ช่วง '+(d.periodFrom||'-')+' ถึง '+(d.periodTo||'-')+'</td>' +
      '<td class="r">'+d.months+'</td><td class="r">'+fmt(d.rate)+'</td><td class="r">'+fmt(d.total)+'</td></tr>' +
    '<tr class="total-row"><td colspan="3" class="r">รวมทั้งสิ้น</td>' +
      '<td class="r">'+fmt(d.total)+' บาท</td></tr>' +
    '</tbody></table>' +
    (d.dueDate?'<div class="due-box">⏰ กรุณาชำระภายในวันที่ '+th(d.dueDate)+'</div>':'') +
    '<div class="pay-info"><b>📑 วิธีชำระเงิน</b><br>' +
      'โอนเข้าบัญชี <b>ธนาคารไทยพาณิชย์</b> เลขที่บัญชี <b>409-691797-6</b><br>' +
      'ชื่อบัญชี <b>บริษัท ทูบิลด์ ดีเวลลอปเม้นท์ จำกัด</b><br>' +
      'หลังโอนแล้ว กรุณาส่งสลิปผ่าน LINE / Email ของโครงการ พร้อมระบุเลขที่ใบ '+d.invoice_no+
    '</div>' +
    (d.note?'<div class="note"><b>หมายเหตุ:</b> '+d.note+'</div>':'') +
    '<div class="foot">' +
      '<div class="sig"><div class="line"></div><div class="lbl">ลูกค้า / ผู้ชำระ</div></div>' +
      '<div class="sig"><div class="line"></div><div class="lbl">เจ้าหน้าที่โครงการ</div></div>' +
    '</div></body></html>';
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
