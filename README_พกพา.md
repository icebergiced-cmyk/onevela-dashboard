# 📦 คู่มือทำงานต่อบนโน้ตบุ๊คอีกเครื่อง

> Setup ทั้งระบบใหม่ใน 2-5 นาที — มีทุกอย่างที่ต้องใช้ในโฟลเดอร์นี้

---

## ขั้นที่ 1 — Setup ทั้งโฟลเดอร์ที่เครื่องใหม่

### ตัวเลือก A (แนะนำ): Copy โฟลเดอร์ทั้งก้อนผ่าน Google Drive

1. **บนเครื่องเดิม** — เปิด Google Drive web (drive.google.com)
2. ลาก **โฟลเดอร์ `dashboard-online` ทั้งโฟลเดอร์** ใส่ Drive
   - ขนาดประมาณ 1-2 MB
   - ใช้เวลาอัพ 30 วินาที
3. **บนเครื่องใหม่** — เปิด Drive → Download โฟลเดอร์
4. แตก zip → วางใน Desktop หรือ Documents

### ตัวเลือก B: Copy ผ่าน USB หรือ AirDrop

ลาก `dashboard-online` ทั้งโฟลเดอร์ใส่ USB / AirDrop เลย

---

## ขั้นที่ 2 — ติดตั้ง Python + dependencies (ครั้งเดียว, 2 นาที)

เปิด Terminal บนเครื่องใหม่:

```bash
# ตรวจว่ามี Python 3
python3 --version
# ควรเห็น Python 3.x.x — ถ้าไม่มี ลงจาก python.org

# ติดตั้ง libraries ที่ใช้
pip3 install openpyxl Pillow --break-system-packages
```

---

## ขั้นที่ 3 — เริ่มทำงาน

```bash
# เข้าโฟลเดอร์
cd "~/Desktop/one vela main file/dashboard-online"

# เช็คว่าทุกอย่างอยู่ครบ
ls -la
```

ควรเห็น:
- `index.html` (Dashboard ปัจจุบัน)
- `dashboard-deploy.zip` (พร้อม upload Cloudflare)
- `_tools/` (script + config)
- `assets/photos/` (SVG placeholders)
- `1_…7_*.md` (คู่มือทั้งหมด)

---

## 🎯 Workflow รายวัน — ที่เครื่องใหม่

### A. Update ข้อมูลจาก Excel ของ Ecount

```bash
cd "~/Desktop/one vela main file/dashboard-online/_tools"
python3 excel_to_dashboard.py /path/to/excel_ใหม่.xlsx
```

จะได้ `dashboard-deploy.zip` ใหม่ ลาก upload Cloudflare → เสร็จ

### B. แก้สถานะแปลง / ราคา ผ่าน metadata

```bash
cd "~/Desktop/one vela main file/dashboard-online/_tools"
python3 update_metadata.py 5 status=สัญญา priceNet=4100000
# แล้วรัน excel_to_dashboard.py ซ้ำเพื่อ rebuild
```

### C. แก้สถานะแปลง / ลูกค้า ผ่าน Google Sheet
เปิด Sheet ตามปกติ → แก้ → Dashboard sync เองภายใน 5 นาที (ไม่ต้องทำอะไรบนเครื่อง)

---

## 📁 ไฟล์สำคัญที่ต้องมี

| ไฟล์ | ขนาด | สำคัญแค่ไหน |
|------|------|------------|
| `_tools/excel_to_dashboard.py` | 17KB | ⭐⭐⭐ converter หลัก |
| `_tools/inject_sales_panel.py` | 22KB | ⭐⭐⭐ Sales panel injector |
| `_tools/sheet_sync.js` | 8KB | ⭐⭐⭐ template Sheet sync |
| `_tools/sheet_config.json` | <1KB | ⭐⭐⭐ URL ทั้ง 2 ของ Sheet |
| `_tools/plots_metadata.json` | 200KB | ⭐⭐⭐ ข้อมูล 483 แปลง |
| `_tools/item_categories.json` | 18KB | ⭐⭐ Dictionary หมวด |
| `_tools/houses_metadata.xlsx` | 90KB | ⭐⭐ Template Excel |
| `_tools/update_metadata.py` | 5KB | ⭐⭐ Metadata editor |
| `index.html` | 770KB | ⭐⭐⭐ Dashboard ปัจจุบัน |
| `dashboard-deploy.zip` | 86KB | ⭐⭐⭐ พร้อม deploy Cloudflare |
| `manifest.json`, `sw.js`, icons | 30KB | ⭐⭐ PWA files |
| `assets/photos/*.svg` | 35KB | ⭐ Placeholder รูป |
| คู่มือ `1_-7_*.md` | 60KB | ⭐⭐ Reference |

---

## 🔗 ลิงก์สำคัญ

- **Dashboard ปัจจุบัน:** https://mute-fog-d814.iceberg-iced.workers.dev/
- **Cloudflare Dashboard:** https://dash.cloudflare.com (login เดิม)
- **Google Sheet — metadata:** [Sheet ของคุณ]
- **CSV URLs (ใน sheet_config.json):**
  - metadata: gid=1161906404
  - installments: gid=680588198

---

## ⚠️ ที่ค้างไว้ ณ ตอนออกจากเครื่องเดิม

1. **Bug Sales panel** — แก้แล้วใน zip ใหม่ (รอ user upload Cloudflare)
2. **เริ่ม phase 3.5 ตารางผ่อนดาวน์** — มี sample 75 row pre-fill 5 แปลงแรก
3. **ระบบ customer view** — `?view=customer` URL ทำได้แล้ว
4. **ทีม Sales เริ่มกรอกข้อมูล** — แปลง 1 มีข้อมูลทดสอบใน Sheet

ทำต่อจากจุดนี้ได้เลยที่เครื่องใหม่ 👍

---

## 🆘 ถ้าติดปัญหาบนเครื่องใหม่

เปิด Claude Cowork บนเครื่องใหม่ → ส่งข้อความว่า:

> "ฉันย้ายจากเครื่องเดิมมา ทำงาน Dashboard ต่อ Sheet URL อยู่ใน /Users/<ชื่อ>/Desktop/one vela main file/dashboard-online/_tools/sheet_config.json"

Claude จะอ่าน config + ทำต่อให้ตรงจุด
