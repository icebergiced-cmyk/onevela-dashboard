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
 * ───────────────────────────────────────────────────────
 */

// ⚙️ กรอก 2 ค่านี้:
// SHEET_ID = ส่วนกลาง URL ของ Sheet:  docs.google.com/spreadsheets/d/【SHEET_ID】/edit
const SHEET_ID = '1vUB9IwiUa_KpDYdKF3NyBYi3gABS7Ag7pvi8FNrYbg0';
// FILES_FOLDER_ID = ส่วนท้าย URL ของโฟลเดอร์:  drive.google.com/drive/folders/【FOLDER_ID】
const FILES_FOLDER_ID = '1cCPU9Zja185ELGihkrWTmh21fSu3Q1pk';

// ===== Router =====
function doGet(e){
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  try {
    if (action === 'ping')         return json({ok:true, msg:'One Vela Sales API พร้อมใช้งาน'});
    if (action === 'getSalesData') return json(getSalesData());
    if (action === 'getNextNo')    return json({ok:true, no:getNextNo(e.parameter.type, e.parameter.plot)});
    return json({ok:false, error:'ไม่รู้จัก action: '+action});
  } catch(err){ return json({ok:false, error:String(err)}); }
}

function doPost(e){
  try {
    const body = JSON.parse(e.postData.contents);
    switch(body.action){
      case 'saveBooking':  return json(saveRow('bookings',  body.data));
      case 'saveContract': return json(saveRow('contracts', body.data));
      case 'savePayment':  return json(saveRow('payments',  body.data));
      case 'uploadFile':   return json(uploadFile(body));
      default: return json({ok:false, error:'ไม่รู้จัก action: '+body.action});
    }
  } catch(err){ return json({ok:false, error:String(err)}); }
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
  };
}

// ===== เขียน 1 แถวต่อท้าย tab =====
function saveRow(tabName, data){
  const sh = sheet(tabName);
  if(!sh) return {ok:false, error:'ไม่พบ tab: '+tabName};
  const keys = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  const row = keys.map(k => (data[k]!==undefined && data[k]!==null) ? data[k] : '');
  sh.appendRow(row);
  return {ok:true, tab:tabName, saved:data};
}

// ===== เลขรันเอกสาร — รูปแบบ ddmmyy-C{แปลง} =====
function getNextNo(type, plot){
  const d = new Date();
  const dd = ('0'+d.getDate()).slice(-2);
  const mm = ('0'+(d.getMonth()+1)).slice(-2);
  const yy = (''+((d.getFullYear()+543)%100)).slice(-2);
  return dd+mm+yy+'-C'+(plot||'');
}

// ===== อัปโหลดไฟล์แนบ → โฟลเดอร์รายแปลง → คืนลิงก์ =====
// body: {plot, category('จอง'/'สัญญา'/'ผ่อนดาวน์'), fileName, mimeType, fileBase64}
function uploadFile(body){
  const root = DriveApp.getFolderById(FILES_FOLDER_ID);
  const plotFolder = getOrCreateFolder(root, 'แปลง ' + body.plot);
  const catFolder  = getOrCreateFolder(plotFolder, body.category || 'อื่นๆ');
  const bytes = Utilities.base64Decode(body.fileBase64);
  const blob  = Utilities.newBlob(bytes, body.mimeType, body.fileName);
  const file  = catFolder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return {ok:true, link:file.getUrl(), name:file.getName()};
}

function getOrCreateFolder(parent, name){
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
