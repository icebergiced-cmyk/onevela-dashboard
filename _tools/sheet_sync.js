/* ───────────────────────────────────────────────
   Google Sheet Sync — Phase 2 metadata layer
   ───────────────────────────────────────────────
   Strategy:
   - HTML has full PROJECT_DATA embedded (works without internet)
   - On load: fetch CSV from Sheet, parse, merge into HOUSES[].
     "Merge" only overrides metadata fields (status, prices, houseNo, ...)
     never the cost data computed from transactions.
   - localStorage cache for fast load between sessions
   - "Re-sync" button + last-sync time in header
*/
(function() {
  const SHEET_CSV_URL = "__SHEET_CSV_URL__"; // injected by build script
  const INSTALLMENTS_CSV_URL = "__INSTALLMENTS_CSV_URL__";
  const SHEET_EDIT_URL = "__SHEET_EDIT_URL__";
  const CACHE_KEY = 'onevela_metadata_csv_v1';
  const CACHE_KEY_INST = 'onevela_installments_csv_v1';
  const CACHE_MIN = 5;

  /* Fields the Sheet is allowed to override (everything else stays from embedded data) */
  const META_FIELDS = new Set([
    // Property + pricing (Phase 2)
    'deed','houseNo','area','areaAdd',
    'priceStart','priceDiff','priceNet','apprSCB',
    'status','note',
    // Customer info (Phase 3 PII)
    'cName','cPhone','cLine','cEmail','cAddress','cJob','cCompany',
    'cIncome','cSpouse','cBirthday',
    // Sales funnel
    'agent','leadSource','dateBook','dateContract','dateDownEnd','dateTransfer',
    'bookAmount','loanBank','loanStatus','loanAmount',
    // Activity
    'followNote','lastContact',
    // Promotions
    'promos','promoValue',
    // Media
    'mapsUrl','virtualTour',
  ]);

  /* ─── Minimal correct CSV parser ─── */
  function parseCSV(text) {
    // Strip BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; } // escaped quote
          else { inQ = false; }
        } else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ''; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (c === '\r') { /* skip */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function coerce(value, key) {
    if (value === '' || value == null) return null;
    const numericFields = ['plot','area','areaAdd','priceStart','priceDiff','priceNet','apprSCB',
                           'cIncome','bookAmount','loanAmount','promoValue',
                           'dueAmount','paidAmount'];
    if (numericFields.includes(key)) {
      const n = parseFloat(value);
      return isNaN(n) ? null : n;
    }
    return String(value).trim();
  }

  function rowsToObjects(rows) {
    if (rows.length < 3) return [];
    const headers = rows[0]; // English keys
    // rows[1] = Thai labels (skip)
    const out = [];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i];
      if (!r || !r[0]) continue; // skip empty
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = coerce(r[idx], h);
      });
      out.push(obj);
    }
    return out;
  }

  /* ─── Fetch with cache ─── */
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const ageMin = (Date.now() - parsed.ts) / 60000;
      if (ageMin > CACHE_MIN * 6) return null; // discard if > 30 min
      return parsed;
    } catch (e) { return null; }
  }
  function writeCache(text) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), text }));
    } catch (e) {}
  }

  async function fetchSheet(baseUrl) {
    const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'cb=' + Date.now();
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  }

  /* ─── Merge Sheet data into HOUSES ─── */
  function mergeMetadata(houses, sheetRows) {
    const byPlot = new Map();
    for (const r of sheetRows) {
      if (r.plot != null) byPlot.set(Number(r.plot), r);
    }
    let changed = 0;
    for (const h of houses) {
      const m = byPlot.get(h.plot);
      if (!m) continue;
      for (const field of META_FIELDS) {
        if (m[field] !== undefined && m[field] !== h[field]) {
          h[field] = m[field];
          changed++;
        }
      }
    }
    return changed;
  }

  /* ─── Merge installments data ─── */
  function mergeInstallments(houses, instRows) {
    // Group by plot
    const byPlot = new Map();
    for (const r of instRows) {
      if (r.plot == null) continue;
      const p = Number(r.plot);
      if (!byPlot.has(p)) byPlot.set(p, []);
      byPlot.get(p).push(r);
    }
    let total = 0;
    for (const h of houses) {
      const arr = byPlot.get(h.plot) || [];
      // Sort: type order (จอง→สัญญา→ดาวน์→กู้→โอน), then due date
      const typeOrder = {'จอง':1,'สัญญา':2,'ดาวน์':3,'กู้':4,'โอน':5,'อื่นๆ':6};
      arr.sort((a,b) => {
        const ta = typeOrder[a.type] || 7;
        const tb = typeOrder[b.type] || 7;
        if (ta !== tb) return ta - tb;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      });
      // Auto-compute status: เลยกำหนด if dueDate < today and status === 'รอจ่าย'
      const today = new Date().toISOString().slice(0, 10);
      for (const inst of arr) {
        if (inst.status === 'รอจ่าย' && inst.dueDate && inst.dueDate < today) {
          inst._autoOverdue = true;
        }
      }
      h.installments = arr;
      total += arr.length;
    }
    return total;
  }

  /* ─── UI: status badge in header ─── */
  function injectStatusUI() {
    const gen = document.getElementById('hdGen');
    if (!gen) return null;
    const wrap = document.createElement('span');
    wrap.id = 'syncStatus';
    wrap.style.cssText = 'display:block;font-size:11px;margin-top:4px;color:#8fb0cf;';
    wrap.innerHTML = '<span id="syncDot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#94a3b8;margin-right:4px;vertical-align:middle;"></span>' +
      '<span id="syncText">กำลังเชื่อมต่อ Google Sheet...</span> · ' +
      '<a href="#" id="syncReload" style="color:#aac4dd;text-decoration:underline;">รีเฟรช</a>';
    gen.appendChild(wrap);
    document.getElementById('syncReload').addEventListener('click', (e) => {
      e.preventDefault();
      doSync(true);
    });
    return { dot: document.getElementById('syncDot'), text: document.getElementById('syncText') };
  }

  function setStatus(ui, color, text) {
    if (!ui) return;
    ui.dot.style.background = color;
    ui.text.textContent = text;
  }

  function rerender() {
    if (typeof renderKPI === 'function') renderKPI();
    if (typeof renderTypes === 'function') renderTypes();
    if (typeof applyFilter === 'function') applyFilter();
  }

  async function doSync(force = false) {
    const ui = window.__syncUI || (window.__syncUI = injectStatusUI());

    // Try cache first (unless force)
    if (!force) {
      const cached = readCache();
      if (cached) {
        try {
          const rows = parseCSV(cached.text);
          const objs = rowsToObjects(rows);
          if (objs.length) {
            const changes = mergeMetadata(window.HOUSES || [], objs);
            if (changes > 0) rerender();
            const ageMin = Math.round((Date.now() - cached.ts) / 60000);
            setStatus(ui, '#10b981', `ใช้แคช (${ageMin} นาทีก่อน) — ${objs.length} แปลง`);
          }
        } catch (e) {}
      }
    }

    // Always do live fetch in background — both metadata and installments in parallel
    setStatus(ui, '#f59e0b', 'กำลังเชื่อมต่อ Google Sheet...');
    try {
      const fetches = [fetchSheet(SHEET_CSV_URL).then(text => ({type:'meta', text}))];
      if (INSTALLMENTS_CSV_URL && INSTALLMENTS_CSV_URL.startsWith('http')) {
        fetches.push(fetchSheet(INSTALLMENTS_CSV_URL).then(text => ({type:'inst', text})));
      }
      const results = await Promise.allSettled(fetches);
      let changes = 0;
      let instCount = 0;
      let metaCount = 0;
      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        const {type, text} = r.value;
        const rows = parseCSV(text);
        const objs = rowsToObjects(rows);
        if (type === 'meta') {
          writeCache(text);
          changes += mergeMetadata(window.HOUSES || [], objs);
          metaCount = objs.length;
        } else if (type === 'inst') {
          localStorage.setItem(CACHE_KEY_INST, JSON.stringify({ts:Date.now(), text}));
          instCount = mergeInstallments(window.HOUSES || [], objs);
        }
      }
      rerender();
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const instTxt = instCount ? ` · ${instCount} งวด` : '';
      setStatus(ui, '#10b981', `ซิงค์ ${hh}:${mm} — ${metaCount} แปลง${instTxt} (${changes} เปลี่ยน)`);
    } catch (e) {
      console.warn('Sheet sync failed:', e);
      setStatus(ui, '#ef4444', 'เชื่อมต่อ Sheet ไม่ได้ — ใช้ข้อมูลล่าสุดที่บันทึกไว้');
    }
  }

  /* Expose HOUSES to window for the sync layer */
  window.addEventListener('load', () => {
    if (typeof HOUSES !== 'undefined') window.HOUSES = HOUSES;
    setTimeout(() => doSync(false), 100);
    // Auto-refresh every 5 minutes while page is open
    setInterval(() => doSync(false), CACHE_MIN * 60 * 1000);
  });
})();
