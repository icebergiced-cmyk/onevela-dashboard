"""
Inject Phase 3 Sales Panel features into the Dashboard HTML.

What this script adds:
  • CSS for sales panel, photo gallery, promotion chips, view-mode toggle
  • JavaScript to render: customer info, sales funnel, promotions, photos
  • Customer-facing view mode (URL ?view=customer hides PII + cost data)

Run this ONCE after a fresh build (or whenever you need to refresh structure).
The converter (excel_to_dashboard.py) preserves these injections.
"""
from pathlib import Path
import os

# Try both mac path (when run via Claude) and sandbox-mapped path (when run via bash)
_candidates = [
    '/Users/imacm4/Desktop/one vela main file/dashboard-online',
    '/sessions/ecstatic-fervent-bardeen/mnt/one vela main file/dashboard-online',
]
DASHBOARD = next(Path(p) for p in _candidates if Path(p).exists())
HTML = DASHBOARD / 'index.html'

html = HTML.read_text(encoding='utf-8')

# ─────────────────────────────────────────────
# IDEMPOTENCY CHECK — refuse to re-inject if already done
# (Otherwise duplicate `const` declarations break the page)
# ─────────────────────────────────────────────
if html.count('PHASE 3 — Sales Panel renderer') > 0:
    print('⚠ Phase 3 injection already present — skipping to avoid duplicates')
    print('  If you want to re-inject, reset index.html from clean source first:')
    print('  bash> rm /path/to/index.html && python3 build_dashboard.py')
    raise SystemExit(0)


# ─────────────────────────────────────────────
# 1. CSS injection — append to <style> block
# ─────────────────────────────────────────────
CSS_BLOCK = """

  /* ============ PHASE 3 — Sales Panel ============ */
  .vmode-toggle{position:fixed;bottom:14px;right:14px;z-index:100;
    background:var(--card);border:1px solid var(--line);border-radius:24px;
    padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;
    box-shadow:0 3px 12px rgba(0,0,0,.18);display:flex;gap:6px;align-items:center;}
  .vmode-toggle:hover{border-color:var(--teal);}
  .vmode-toggle i{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;}
  body.view-customer .vmode-toggle i{background:var(--blue);}
  body.view-customer .salesOnly,
  body.view-customer .adminOnly{display:none!important;}

  /* Sales panel */
  .sales-panel{background:linear-gradient(135deg,#7c2d12,#9a3412);color:#fff;
    border-radius:14px;padding:18px 22px;margin-top:14px;}
  .sales-panel h3{font-size:16px;font-weight:800;margin-bottom:12px;color:#fde68a;
    display:flex;align-items:center;gap:8px;}
  .sales-panel h3::before{content:"👤";}
  .sales-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;}
  .sgi{background:rgba(255,255,255,.08);border-radius:8px;padding:10px 13px;}
  .sgi .lbl{font-size:11px;color:#fed7aa;font-weight:600;text-transform:uppercase;letter-spacing:.5px;}
  .sgi .val{font-size:15px;font-weight:700;margin-top:2px;word-break:break-word;}
  .sgi .val a{color:#fde68a;text-decoration:underline;}
  .sgi.empty .val{color:#fdba74;font-weight:400;font-style:italic;}

  /* Sales funnel timeline */
  .funnel{background:var(--card);border-radius:12px;padding:18px;margin-top:14px;
    box-shadow:0 1px 3px rgba(0,0,0,.06);}
  .funnel h3{font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  .funnel h3::before{content:"📅";}
  .funnel-steps{display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;}
  .fstep{flex:1;min-width:130px;text-align:center;position:relative;}
  .fstep .dot{width:34px;height:34px;border-radius:50%;background:#e2e8f0;
    margin:0 auto 6px;display:flex;align-items:center;justify-content:center;
    font-size:16px;color:#94a3b8;font-weight:800;}
  .fstep.done .dot{background:var(--green);color:#fff;}
  .fstep.current .dot{background:var(--accent);color:#fff;animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.4);}
                   50%{box-shadow:0 0 0 8px rgba(245,158,11,0);}}
  .fstep .fname{font-size:12px;font-weight:700;color:var(--ink);}
  .fstep .fdate{font-size:11px;color:var(--muted);margin-top:2px;}

  /* Promotions */
  .promo-panel{background:linear-gradient(135deg,#047857,#065f46);color:#fff;
    border-radius:12px;padding:16px 20px;margin-top:14px;}
  .promo-panel h3{font-size:15px;font-weight:800;margin-bottom:10px;display:flex;align-items:center;gap:8px;}
  .promo-panel h3::before{content:"🎁";}
  .promo-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;}
  .promo-chip{background:rgba(255,255,255,.18);padding:5px 12px;border-radius:20px;
    font-size:12px;font-weight:600;}
  .promo-summary{display:flex;justify-content:space-between;align-items:center;
    margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.2);font-size:13px;}
  .promo-summary b{font-size:18px;}

  /* Photo gallery */
  .photo-panel{background:var(--card);border-radius:12px;padding:18px;margin-top:14px;
    box-shadow:0 1px 3px rgba(0,0,0,.06);}
  .photo-panel h3{font-size:15px;font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
  .photo-panel h3::before{content:"📸";}
  .photo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
  @media(min-width:880px){.photo-grid{grid-template-columns:repeat(4,1fr);}}
  .pcell{background:#f1f5f9;border-radius:8px;overflow:hidden;aspect-ratio:4/3;
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    transition:transform .15s;}
  .pcell:hover{transform:scale(1.02);}
  .pcell img{width:100%;height:100%;object-fit:cover;display:block;}
  .pcaption{font-size:11px;text-align:center;color:var(--muted);margin-top:4px;}
  .photo-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
  .photo-actions a{flex:1;min-width:120px;text-align:center;padding:10px 12px;
    border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;
    background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;}
  .photo-actions a:hover{background:#dbeafe;}

  /* Lightbox */
  .lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:1000;
    display:none;align-items:center;justify-content:center;padding:20px;cursor:zoom-out;}
  .lightbox.open{display:flex;}
  .lightbox img{max-width:95%;max-height:95vh;border-radius:8px;}
  .lightbox-close{position:absolute;top:14px;right:18px;color:#fff;font-size:30px;
    cursor:pointer;background:none;border:none;}

  /* Share customer link button */
  .share-link{display:inline-flex;align-items:center;gap:6px;background:#10b981;color:#fff;
    border:none;padding:9px 16px;border-radius:8px;font-family:inherit;font-size:13px;
    font-weight:700;cursor:pointer;margin-top:8px;}
  .share-link:hover{background:#059669;}

  /* Customer-mode banner */
  body.view-customer .vmode-banner{display:flex;}
  .vmode-banner{display:none;background:linear-gradient(135deg,var(--blue),#2563eb);color:#fff;
    padding:9px 18px;font-size:13px;align-items:center;justify-content:center;gap:10px;
    font-weight:600;}

  /* Installments panel */
  .inst-panel{background:var(--card);border-radius:12px;padding:18px;margin-top:14px;
    box-shadow:0 1px 3px rgba(0,0,0,.06);}
  .inst-panel h3{font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  .inst-panel h3::before{content:"💳";}
  .inst-progress{margin-bottom:12px;}
  .inst-progress .ipbar{height:14px;background:var(--line);border-radius:7px;overflow:hidden;
    position:relative;}
  .inst-progress .ipbar > i{display:block;height:100%;
    background:linear-gradient(90deg,#10b981,#34d399);transition:width .4s;}
  .inst-progress .iptxt{display:flex;justify-content:space-between;
    font-size:12px;margin-top:5px;color:var(--muted);}
  .inst-progress .iptxt b{color:var(--ink);}
  .inst-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
    gap:10px;margin-bottom:14px;}
  .inst-summary .is{background:#f8fafc;border-radius:8px;padding:9px 12px;
    border:1px solid var(--line);}
  .inst-summary .is .lbl{font-size:11px;color:var(--muted);}
  .inst-summary .is .val{font-size:14px;font-weight:800;margin-top:2px;}
  .inst-summary .is.pos .val{color:var(--green);}
  .inst-summary .is.neg .val{color:var(--red);}
  .inst-table{width:100%;border-collapse:collapse;font-size:12.5px;}
  .inst-table th{background:#f8fafc;color:var(--muted);font-weight:700;font-size:11px;
    padding:7px 8px;text-align:left;text-transform:uppercase;letter-spacing:.3px;
    border-bottom:1px solid var(--line);}
  .inst-table td{padding:8px;border-bottom:1px solid var(--line);}
  .inst-table tr:hover td{background:#f8fafc;}
  .inst-table .ist-num{text-align:right;font-variant-numeric:tabular-nums;}
  .inst-table .ist-type{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:5px;
    display:inline-block;white-space:nowrap;}
  .ist-type.t-จอง{background:#dbeafe;color:#1d4ed8;}
  .ist-type.t-สัญญา{background:#ede9fe;color:#6d28d9;}
  .ist-type.t-ดาวน์{background:#fef3c7;color:#b45309;}
  .ist-type.t-กู้{background:#fce7f3;color:#be185d;}
  .ist-type.t-โอน{background:#d1fae5;color:#047857;}
  .ist-type.t-อื่นๆ{background:#f1f5f9;color:#64748b;}
  .inst-table .ist-status{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:12px;
    white-space:nowrap;}
  .is-paid{background:#d1fae5;color:#047857;}
  .is-pending{background:#fef3c7;color:#92400e;}
  .is-overdue{background:#fee2e2;color:#b91c1c;animation:overdue 1.6s infinite;}
  @keyframes overdue{0%,100%{opacity:1}50%{opacity:.6}}
  .is-partial{background:#ffedd5;color:#c2410c;}
  .is-cancel{background:#f1f5f9;color:#94a3b8;text-decoration:line-through;}
  .inst-empty{padding:18px;text-align:center;color:var(--muted);font-size:13px;
    background:#f8fafc;border-radius:8px;}
  .overdue-alert{background:#fef2f2;border:1px solid #fecaca;color:#991b1b;
    padding:11px 14px;border-radius:9px;font-size:13px;margin-bottom:12px;
    display:flex;align-items:center;gap:8px;}
  .overdue-alert b{font-weight:800;}
  .inst-tablebox{overflow-x:auto;}
"""

# Find </style> and insert before it
style_close_idx = html.find('</style>')
html = html[:style_close_idx] + CSS_BLOCK + '\n' + html[style_close_idx:]

# ─────────────────────────────────────────────
# 2. HTML banner — insert before <header>
# ─────────────────────────────────────────────
BANNER_HTML = '''<div class="vmode-banner">🎯 <b>กำลังพรีวิวที่ลูกค้าเห็น</b> — ข้อมูลภายใน (ราคาทุน, customer info, การผ่อน) ถูกซ่อนชั่วคราว
<a href="?" style="background:#fff;color:#2563eb;padding:5px 14px;border-radius:14px;text-decoration:none;font-weight:700;margin-left:12px;">← ออกจากพรีวิว</a></div>
'''
html = html.replace('<header>', BANNER_HTML + '<header>', 1)

# ─────────────────────────────────────────────
# 3. View-mode toggle button (fixed position)
# ─────────────────────────────────────────────
TOGGLE_HTML = '''<button class="vmode-toggle" id="vmodeToggle" title="คลิกเพื่อสลับมุมมอง"><i></i>👁 พรีวิวมุมลูกค้า</button>
'''
html = html.replace('</body>', TOGGLE_HTML + '\n<div class="lightbox" id="lightbox" onclick="this.classList.remove(\'open\')"><button class="lightbox-close">×</button><img id="lightboxImg" src=""></div>\n</body>')

# ─────────────────────────────────────────────
# 4. JavaScript — append before closing </script> in init
# ─────────────────────────────────────────────
JS_BLOCK = '''

/* ============ PHASE 3 — Sales Panel renderer ============ */
const PHOTO_VIEWS = [
  {key:'exterior',  label:'หน้าบ้าน'},
  {key:'floorplan', label:'ผังบ้าน'},
  {key:'interior',  label:'ภายในบ้าน'},
  {key:'siteplan',  label:'ผังโครงการ'},
];

function photoSrc(typeKey, viewKey){
  // try .jpg first, fallback to .svg via onerror
  return `assets/photos/${typeKey}_${viewKey}.jpg`;
}

function fmtMoney(n){ return n ? '฿' + Math.round(n).toLocaleString('th-TH') : '—'; }
function emptyOrText(v){ return v ? v : '<span style="opacity:.6">—</span>'; }

function renderPhotos(h){
  if(!h.typeKey) return '';
  const grid = PHOTO_VIEWS.map(v => {
    const jpg = photoSrc(h.typeKey, v.key);
    const svg = `assets/photos/${h.typeKey}_${v.key}.svg`;
    return `<div>
      <div class="pcell" onclick="openLightbox('${jpg}','${svg}')">
        <img src="${jpg}" onerror="this.onerror=null;this.src='${svg}'" alt="${v.label}">
      </div>
      <div class="pcaption">${v.label}</div>
    </div>`;
  }).join('');

  const mapsLink = h.mapsUrl ? `<a href="${h.mapsUrl}" target="_blank">🗺 ดูบนแผนที่</a>` : '';
  const tourLink = h.virtualTour ? `<a href="${h.virtualTour}" target="_blank">🎥 VDO/360°</a>` : '';
  const customerShare = `<a href="#" onclick="shareCustomerLink(${h.plot});return false;" class="salesOnly">🔗 ส่งให้ลูกค้า</a>`;

  return `<div class="panel photo-panel">
    <h3>รูปบ้าน — ${h.typeShort || ''}</h3>
    <div class="photo-grid">${grid}</div>
    ${(mapsLink || tourLink || true) ? `<div class="photo-actions">${mapsLink}${tourLink}${customerShare}</div>` : ''}
  </div>`;
}

function renderCustomer(h){
  const fields = [
    ['ชื่อลูกค้า', h.cName],
    ['เบอร์โทร', h.cPhone ? `<a href="tel:${h.cPhone}">${h.cPhone}</a>` : ''],
    ['LINE ID', h.cLine],
    ['Email', h.cEmail ? `<a href="mailto:${h.cEmail}">${h.cEmail}</a>` : ''],
    ['อาชีพ / บริษัท', [h.cJob, h.cCompany].filter(Boolean).join(' · ')],
    ['รายได้/เดือน', h.cIncome ? fmtMoney(h.cIncome) : ''],
    ['คู่สมรส', h.cSpouse],
    ['วันเกิด', h.cBirthday],
    ['ที่อยู่ปัจจุบัน', h.cAddress],
    ['Agent', h.agent],
    ['ที่มา Lead', h.leadSource],
    ['ติดต่อล่าสุด', h.lastContact],
  ];
  const hasData = fields.some(f => f[1]);
  if (!hasData && h.status === 'ว่าง') return '';

  const grid = fields.map(([lbl, v]) =>
    `<div class="sgi ${v ? '' : 'empty'}"><div class="lbl">${lbl}</div>
      <div class="val">${v || 'ยังไม่ระบุ'}</div></div>`
  ).join('');

  const followNote = h.followNote ? `<div class="sgi" style="grid-column:1/-1">
    <div class="lbl">บันทึก Follow-up</div>
    <div class="val">${h.followNote}</div></div>` : '';

  return `<div class="sales-panel salesOnly">
    <h3>ข้อมูลลูกค้า (เฉพาะทีม Sales)</h3>
    <div class="sales-grid">${grid}${followNote}</div>
  </div>`;
}

function renderFunnel(h){
  const steps = [
    {key:'จอง',         icon:'1', date:h.dateBook,     done:!!h.dateBook},
    {key:'สัญญา',       icon:'2', date:h.dateContract, done:!!h.dateContract},
    {key:'ผ่อนดาวน์',   icon:'3', date:h.dateDownEnd,  done:!!h.dateDownEnd},
    {key:'ยื่นกู้',      icon:'4', date:h.loanBank,     done:!!h.loanBank},
    {key:'อนุมัติกู้',   icon:'5', date:h.loanStatus === 'อนุมัติแล้ว' ? '✓' : '',
     done:h.loanStatus === 'อนุมัติแล้ว'},
    {key:'โอน',         icon:'6', date:h.dateTransfer, done:h.status === 'โอนแล้ว'},
  ];
  // Detect current step
  const lastDoneIdx = steps.map(s => s.done).lastIndexOf(true);
  const currentIdx = lastDoneIdx + 1;
  if(currentIdx < steps.length) steps[currentIdx].current = true;

  const hasAny = steps.some(s => s.done);
  if (!hasAny) return '';

  return `<div class="funnel salesOnly">
    <h3>Sales Funnel</h3>
    <div class="funnel-steps">${steps.map(s => `
      <div class="fstep ${s.done?'done':''} ${s.current?'current':''}">
        <div class="dot">${s.done?'✓':s.icon}</div>
        <div class="fname">${s.key}</div>
        <div class="fdate">${s.date || (s.done?'เสร็จ':'รอ')}</div>
      </div>`).join('')}</div>
    ${h.loanBank ? `<div style="margin-top:12px;font-size:13px;color:var(--muted)">
      ธนาคาร: <b>${h.loanBank}</b> · สถานะ: <b>${h.loanStatus||'—'}</b>
      ${h.loanAmount?`· วงเงิน <b>${fmtMoney(h.loanAmount)}</b>`:''}
    </div>` : ''}
  </div>`;
}

function renderPromos(h){
  if(!h.promos) return '';
  const list = h.promos.split('|').map(s => s.trim()).filter(Boolean);
  if(!list.length) return '';
  return `<div class="promo-panel">
    <h3>โปรโมชั่นที่ลูกค้าได้รับ</h3>
    <div class="promo-list">${list.map(p => `<span class="promo-chip">${p}</span>`).join('')}</div>
    <div class="promo-summary">
      <span>มูลค่าโปรโมชั่นรวม</span>
      <b>${fmtMoney(h.promoValue)}</b>
    </div>
  </div>`;
}

function fmtThaiDate(iso){
  if(!iso) return '—';
  // YYYY-MM-DD → DD/MM/YY (Thai year)
  const m = String(iso).match(/(\\d{4})-(\\d{2})-(\\d{2})/);
  if(!m) return iso;
  const y = parseInt(m[1]) + 543;
  return `${parseInt(m[3])}/${parseInt(m[2])}/${y % 100}`;
}

function renderInstallments(h){
  const arr = h.installments || [];
  if(!arr.length) return '';

  // Compute totals
  let totalDue = 0, totalPaid = 0, overdue = [], downDue = 0, downPaid = 0;
  for(const i of arr){
    const due = Number(i.dueAmount) || 0;
    const paid = Number(i.paidAmount) || 0;
    totalDue += due;
    totalPaid += paid;
    if(i.type === 'ดาวน์'){
      downDue += due;
      downPaid += paid;
    }
    if(i._autoOverdue || i.status === 'เลยกำหนด') overdue.push(i);
  }
  const pct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
  const downPct = downDue > 0 ? Math.round((downPaid / downDue) * 100) : 0;

  const overdueAmt = overdue.reduce((s,i) => s + (Number(i.dueAmount) || 0), 0);
  const overdueBlock = overdue.length ? `<div class="overdue-alert">
    🔴 <b>เลยกำหนด ${overdue.length} งวด</b> · ค่างวดค้าง <b>${fmtMoney(overdueAmt)}</b>
  </div>` : '';

  const today = new Date().toISOString().slice(0,10);
  const rows = arr.map(i => {
    const due = Number(i.dueAmount) || 0;
    const paid = Number(i.paidAmount) || 0;
    let statusClass = 'is-pending';
    let statusText = i.status || 'รอจ่าย';
    if(i._autoOverdue || i.status === 'เลยกำหนด'){
      statusClass = 'is-overdue';
      statusText = 'เลยกำหนด';
    } else if(i.status === 'จ่ายแล้ว'){
      statusClass = 'is-paid';
    } else if(i.status === 'จ่ายบางส่วน'){
      statusClass = 'is-partial';
    } else if(i.status === 'ยกเลิก'){
      statusClass = 'is-cancel';
    }
    return `<tr>
      <td>${i.seq || ''}</td>
      <td>${i.label || ''}</td>
      <td><span class="ist-type t-${i.type || 'อื่นๆ'}">${i.type || ''}</span></td>
      <td>${fmtThaiDate(i.dueDate)}</td>
      <td class="ist-num">${due ? fmtMoney(due) : '—'}</td>
      <td>${fmtThaiDate(i.paidDate)}</td>
      <td class="ist-num">${paid ? fmtMoney(paid) : '—'}</td>
      <td><span class="ist-status ${statusClass}">${statusText}</span></td>
      <td style="font-size:11px;color:var(--muted)">${i.note || ''}</td>
    </tr>`;
  }).join('');

  return `<div class="inst-panel salesOnly">
    <h3>ตารางผ่อนดาวน์</h3>
    ${overdueBlock}
    <div class="inst-progress">
      <div class="ipbar"><i style="width:${Math.min(pct,100)}%"></i></div>
      <div class="iptxt">
        <span>จ่ายไปแล้ว <b>${fmtMoney(totalPaid)}</b> จาก <b>${fmtMoney(totalDue)}</b></span>
        <span><b>${pct}%</b> ของยอดรวม</span>
      </div>
    </div>
    <div class="inst-summary">
      <div class="is"><div class="lbl">งวดทั้งหมด</div><div class="val">${arr.length}</div></div>
      <div class="is pos"><div class="lbl">จ่ายแล้ว</div><div class="val">${arr.filter(i => i.status==='จ่ายแล้ว').length}</div></div>
      <div class="is"><div class="lbl">รอจ่าย</div><div class="val">${arr.filter(i => i.status==='รอจ่าย' && !i._autoOverdue).length}</div></div>
      ${overdue.length ? `<div class="is neg"><div class="lbl">เลยกำหนด</div><div class="val">${overdue.length}</div></div>` : ''}
      ${downDue > 0 ? `<div class="is"><div class="lbl">ผ่อนดาวน์</div><div class="val">${downPct}%</div></div>` : ''}
    </div>
    <div class="inst-tablebox"><table class="inst-table">
      <thead><tr>
        <th>ลำดับ</th><th>ชื่องวด</th><th>ประเภท</th>
        <th>วันกำหนด</th><th class="ist-num">ต้องจ่าย</th>
        <th>วันจ่ายจริง</th><th class="ist-num">จ่ายจริง</th>
        <th>สถานะ</th><th>หมายเหตุ</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

/* Open lightbox */
function openLightbox(jpgUrl, svgUrl){
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.onerror = () => { img.onerror = null; img.src = svgUrl; };
  img.src = jpgUrl;
  lb.classList.add('open');
}

/* Share customer link — generates URL with view=customer */
function shareCustomerLink(plot){
  const url = `${location.origin}${location.pathname}?view=customer&plot=${plot}`;
  navigator.clipboard.writeText(url).then(() => {
    alert('คัดลอกลิงก์สำหรับลูกค้าแล้ว!\\n\\n' + url + '\\n\\nส่งใน LINE ได้เลย — ลูกค้าจะเห็นเฉพาะรูป ราคา และสถานะ');
  }).catch(() => {
    prompt('คัดลอกลิงก์นี้ส่งลูกค้า:', url);
  });
}

/* View mode handling */
function applyViewMode(){
  const params = new URLSearchParams(location.search);
  const mode = params.get('view');
  document.body.classList.toggle('view-customer', mode === 'customer');
  const toggle = document.getElementById('vmodeToggle');
  if (toggle) {
    // Show the target mode (where clicking will take you)
    toggle.innerHTML = mode === 'customer'
      ? '<i></i>← ออกจากพรีวิว'
      : '<i></i>👁 พรีวิวมุมลูกค้า';
    toggle.title = mode === 'customer'
      ? 'กลับไปมุม Sales (เห็นข้อมูลครบ)'
      : 'ดูตัวอย่างหน้าจอที่ลูกค้าจะเห็น (ข้อมูลภายในจะถูกซ่อน)';
    // Force visible at all times
    toggle.classList.remove('adminOnly');
    toggle.style.display = 'flex';
    toggle.onclick = () => {
      const next = mode === 'customer' ? '' : '?view=customer';
      location.href = location.pathname + next + location.hash;
    };
  }
  // Auto-open plot if specified in URL
  const plotParam = params.get('plot');
  if (plotParam && typeof openDetail === 'function') {
    setTimeout(() => openDetail(parseInt(plotParam)), 300);
  }
}
window.addEventListener('load', applyViewMode);

/* ============ Inject sales panels via MutationObserver ============
   Why: the original openDetail isn't on window, so we can't wrap it.
   Instead, we watch for #detailView becoming visible + #detailBody changing
   and inject our panels after the .dhead header. */
let _lastInjectedPlot = null;
function injectSalesSections(){
  try {
    const dhead = document.querySelector('#detailBody .dhead');
    if(!dhead){ return; }
    // Extract plot number from dhead text
    const m = dhead.textContent.match(/แปลง\\s+(\\d+)/);
    if(!m){ return; }
    const plot = parseInt(m[1]);

    // Skip if our wrapper already exists AND it's for the same plot
    const existingWrap = document.querySelector('.sales-extras-wrapper');
    if(existingWrap && _lastInjectedPlot === plot){
      return; // already injected for this plot — break infinite loop
    }

    const houses = window.HOUSES || (typeof HOUSES !== 'undefined' ? HOUSES : null);
    if(!houses){ console.warn('[SalesPanel] HOUSES not accessible'); return; }
    const h = houses.find(x => x.plot === plot);
    if(!h){ console.warn('[SalesPanel] Plot', plot, 'not found'); return; }

    // Remove previous injection (if any)
    if(existingWrap) existingWrap.remove();

    // Build extras
    const extras = renderPhotos(h) + renderPromos(h) + renderCustomer(h) + renderFunnel(h) + renderInstallments(h);
    if(!extras){ console.log('[SalesPanel] No extras to inject for plot', plot); _lastInjectedPlot = plot; return; }
    console.log('[SalesPanel] Injecting plot', plot, '— bytes:', extras.length);
    _lastInjectedPlot = plot;

  // Wrap and insert after dhead
  const wrap = document.createElement('div');
  wrap.className = 'sales-extras-wrapper';
  wrap.innerHTML = extras;
  dhead.parentNode.insertBefore(wrap, dhead.nextSibling);

    // Customer view: hide cost-related panels (mark non-sales/non-photo/non-promo as adminOnly)
    if(document.body.classList.contains('view-customer')){
      const detailBody = document.getElementById('detailBody');
      detailBody.querySelectorAll('.panel, .alert, .kpis').forEach(el => {
        if(wrap.contains(el)) return; // skip our injected panels
        if(!el.classList.contains('salesOnly')) el.classList.add('adminOnly');
      });
    }
  } catch(err) {
    console.error('[SalesPanel] injectSalesSections error:', err);
  }
}

function setupSalesHook(){
  const detailBody = document.getElementById('detailBody');
  const detailView = document.getElementById('detailView');
  if(!detailBody || !detailView){
    console.warn('[SalesPanel] detailBody/View missing — retry in 500ms');
    setTimeout(setupSalesHook, 500);
    return;
  }
  console.log('[SalesPanel] Hook initialized');

  // Approach 1: Event delegation on document — most reliable
  document.addEventListener('click', (e) => {
    const hcard = e.target.closest('.hcard');
    if(!hcard) return;
    console.log('[SalesPanel] hcard clicked plot=', hcard.dataset.plot);
    // Wait a few ms for original openDetail to render
    setTimeout(injectSalesSections, 50);
    setTimeout(injectSalesSections, 200);  // retry in case slow
  });

  // Approach 2: MutationObserver on detailBody (backup)
  const bodyObserver = new MutationObserver(() => {
    if(detailView.classList.contains('hide')) return;
    setTimeout(injectSalesSections, 0);
  });
  bodyObserver.observe(detailBody, {childList: true, subtree: false});

  // Approach 3: ViewObserver on detailView class (URL-based deep linking)
  const viewObserver = new MutationObserver(() => {
    if(!detailView.classList.contains('hide')){
      setTimeout(injectSalesSections, 0);
    }
  });
  viewObserver.observe(detailView, {attributes: true, attributeFilter: ['class']});
}
// Run setup even if load already fired
if(document.readyState === 'complete'){
  setupSalesHook();
} else {
  window.addEventListener('load', setupSalesHook);
}
'''

# Insert JS_BLOCK before the closing </script> tag of the main script (the one after PROJECT_DATA)
# Find pattern: applyFilter();\n</script>
marker = "applyFilter();"
idx = html.find(marker)
end_of_line = html.find("\n", idx)
# Insert JS_BLOCK after applyFilter line
html = html[:end_of_line + 1] + JS_BLOCK + html[end_of_line + 1:]

HTML.write_text(html, encoding='utf-8')

print(f'✓ Phase 3 features injected into {HTML}')
print(f'  Final size: {len(html):,} chars')

# Sanity checks
checks = [
    ('CSS sales-panel', '.sales-panel{'),
    ('CSS lightbox', '.lightbox{'),
    ('CSS view-customer', 'body.view-customer'),
    ('vmode-banner HTML', 'vmode-banner'),
    ('renderCustomer JS', 'function renderCustomer'),
    ('renderFunnel JS', 'function renderFunnel'),
    ('renderPromos JS', 'function renderPromos'),
    ('shareCustomerLink', 'function shareCustomerLink'),
    ('applyViewMode', 'function applyViewMode'),
    ('Photo gallery', "function renderPhotos"),
]
print('\nVerification:')
for label, needle in checks:
    print(f"  {'✓' if needle in html else '✗'} {label}")
