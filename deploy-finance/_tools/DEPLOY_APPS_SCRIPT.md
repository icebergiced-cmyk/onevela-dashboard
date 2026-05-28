# 🚀 คู่มือ Deploy Apps Script — Round 2+3

## ทำไมต้อง deploy?

ระบบใหม่ (ติดตามงานก่อสร้าง) ใช้ endpoints ใหม่ใน `sales_api.gs`:
- `getActivePlots`, `getPlotsByForeman`, `getCounts`
- `startBuilding`, `stopBuilding`, `saveUpdate`
- `getTrackerData`, `getMilestones`, `foremanLogin`

โค้ดใน repo (GitHub) **ไม่ใช่** เวอร์ชันที่รันจริง — ต้องเอาไปวางใน Google Apps Script Editor และกด Deploy ใหม่

ตอนนี้เว็บ (Cloudflare) deploy แล้วก็จริง แต่จะเรียก endpoints ใหม่ไม่ได้จนกว่าจะ deploy Apps Script — admin/foreman pages จะขึ้น error เพราะ API ตอบ "ไม่รู้จัก action"

---

## 📋 ขั้นตอน (5 นาที)

### 1. เปิด Apps Script Editor
- ไปที่ https://script.google.com/
- เปิด project "One Vela Sales API" (โปรเจกต์เดิมที่ใช้อยู่)

### 2. คัดลอกโค้ดใหม่
- เปิดไฟล์ `_tools/sales_api.gs` ใน repo (~/Desktop/one vela main file/dashboard-online/_tools/sales_api.gs) หรือ
- เปิด https://github.com/icebergiced-cmyk/onevela-dashboard/blob/main/_tools/sales_api.gs → กดปุ่ม "Raw" → คัดลอกทั้งหมด (Cmd+A → Cmd+C)

### 3. วางทับใน Apps Script Editor
- ใน Apps Script Editor → ไฟล์ "sales_api" (หรือชื่อที่ตั้งไว้)
- เลือกทั้งหมด (Cmd+A) → ลบ → วาง (Cmd+V)
- บันทึก (Cmd+S)

### 4. Deploy เวอร์ชันใหม่
- กดปุ่ม **Deploy** (มุมขวาบน) → **Manage deployments**
- เลือก deployment เดิม (ที่ใช้อยู่) → กด ✏️ (Edit pencil)
- ตรง **Version** → เลือก **New version**
- กด **Deploy**
- ⚠️ **อย่ากด "New deployment"** — จะได้ URL ใหม่ ต้องไปแก้ทุกไฟล์

### 5. ทดสอบ
- เปิด https://onevela-dashboard.iceberg-iced.workers.dev/admin-construction.html
- ควรเห็น stats + ตาราง 6 แปลงที่ Round 1 setup ไว้ (140/155/170/200/088/092)
- ถ้าเห็น error "ไม่รู้จัก action" → ยังไม่ deploy เวอร์ชันใหม่

---

## 🔧 ถ้ามีปัญหา

### ขึ้น "ไม่รู้จัก action: getActivePlots"
แสดงว่า Web App ยัง serve โค้ดเก่า → ทำขั้นตอน 4 อีกครั้ง (ต้องเลือก "New version")

### ขึ้น "ไม่พบ tab: plot_construction"
แสดงว่า Sheet ยังไม่มี tab — รันสคริปต์ `tracker_setup.gs` ก่อน
1. ใน Apps Script Editor → กด ➕ ข้าง "Files" → Script → ตั้งชื่อ `tracker_setup` → วางโค้ดจาก `_tools/tracker_setup.gs`
2. เลือกฟังก์ชัน `setupTrackerTabs` จาก dropdown → กด ▶ Run
3. อนุญาต permissions
4. ดูใน Sheet — จะมี 6 tab ใหม่ + seed 64 milestones + 2 test users

### Login ไม่ผ่าน (PIN ผิด)
- Default PIN = `1234` ถ้าใน `users` tab ยังไม่ได้ตั้ง column `phone`
- ถ้าอยากตั้ง PIN จริง → แก้ column `phone` ของแถว user ในแก้ Sheet ตามที่ต้องการ
  - แถว 3: TEST_ADMIN (admin)
  - แถว 4: TEST_FOREMAN (foreman)
- เพิ่ม user ใหม่ได้โดย add แถวใหม่: user_id | line_user_id | display_name | line_picture_url | phone (=PIN) | role | active | created_at | last_login_at

---

## 🎯 หลัง deploy แล้ว ใช้ได้เลย

| URL | บทบาท |
|---|---|
| `/home.html` | หน้าแรก — 12 cards (มี 2 ใหม่: 🏗️ จัดการก่อสร้าง + 👷 อัปเดตงาน) |
| `/admin-construction.html` | คุณไอซ์ — เริ่ม/หยุดก่อสร้าง |
| `/foreman-update.html` | โฟร์แมน (มือถือ) — อัปเดตงาน + ส่งรายงาน |
| `/plot-detail.html?plot=140` | ทีมขาย — มี section 🏗️ งานก่อสร้างเพิ่ม |

## 📱 ติดตั้งบนมือถือโฟร์แมน (PWA)
1. โฟร์แมนเปิด `foreman-update.html` ใน Safari/Chrome บนมือถือ
2. กด **Share → Add to Home Screen** → ตั้งชื่อ "One Vela งาน"
3. ได้ icon บน home screen — เปิดเร็ว ไม่เห็น URL bar เหมือนแอปจริง
