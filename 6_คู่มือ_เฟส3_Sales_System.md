# เฟส 3 — Sales System ครบวงจร

> Dashboard ใหม่: ข้อมูลลูกค้า + โปรโมชั่น + รูปบ้าน + Customer view + Sales funnel

URL: **https://onevela-cost.netlify.app**

---

## 🆕 ที่เพิ่มขึ้นในเฟส 3

### 1. ข้อมูลลูกค้า (per plot)
ชื่อ · เบอร์ · LINE · Email · ที่อยู่ · อาชีพ · บริษัท · รายได้ · คู่สมรส · วันเกิด

> ⚠️ **PII Public**: Sheet เปิด CSV public ตามที่ตกลง — อย่าให้ URL หลุดถึงคนที่ไม่ไว้ใจ

### 2. Sales funnel tracking
จอง → สัญญา → ผ่อนดาวน์ครบ → ยื่นกู้ → อนุมัติ → โอน (timeline กราฟิก)

### 3. ธนาคารกู้
สถานะกู้ + วงเงินอนุมัติ + ธนาคารที่ใช้

### 4. โปรโมชั่น
รายการโปรที่ใช้ (chips) + มูลค่าโปรรวม

### 5. รูปบ้าน + ผัง (4 รูป/ไทป์)
หน้าบ้าน · ผังบ้าน · ภายในบ้าน · ผังโครงการ — กดดูเต็มจอ (lightbox)

### 6. ลิงก์ภายนอก
Google Maps พิกัด · VDO walkthrough / 360° tour

### 7. Customer View mode (URL `?view=customer`)
- 🎯 มุมมองสำหรับลูกค้า
- ซ่อนข้อมูลภายในหมด: customer info, agents, ต้นทุน, audit
- โชว์เฉพาะ: รูปบ้าน, ผัง, ราคา, สถานะ, ทำเล
- มีปุ่ม "🔗 ส่งให้ลูกค้า" ในหน้า detail → copy ลิงก์ส่ง LINE

### 8. ปุ่ม view toggle (มุมล่างขวา)
สลับ Sales view ↔ Customer view ได้ทันที

---

## 📊 Sheet ใหม่ — 41 คอลัมน์ (จากเดิม 15)

### คอลัมน์ที่เพิ่มมาใหม่ 26 ตัว:

**👤 Customer (10):** cName, cPhone, cLine, cEmail, cAddress, cJob, cCompany, cIncome, cSpouse, cBirthday

**📈 Sales Funnel (12):** agent, leadSource, dateBook, dateContract, dateDownEnd, dateTransfer, bookAmount, loanBank, loanStatus, loanAmount, followNote, lastContact

**🎁 Promotions (2):** promos, promoValue

**📸 Media (2):** mapsUrl, virtualTour

---

## ⚙️ วิธีอัพเดต Sheet ของคุณ (เลือก 1 ใน 2)

### ทางที่ A — Re-import ทั้งหมด (แนะนำ, 5 นาที)

1. เปิด Sheet เดิมใน Google Drive
2. **File → Import** เลือก:
   - "Replace spreadsheet"
   - Upload ไฟล์ `houses_metadata.xlsx` ตัวใหม่ ([เปิดไฟล์](computer:///Users/imacm4/Desktop/one vela main file/dashboard-online/_tools/houses_metadata.xlsx))
3. Sheet จะมี 41 column ครบ
4. ⚠️ ตั้ง Publish CSV ใหม่ (File → Share → Publish to web) — **URL จะเปลี่ยน** ส่ง URL ใหม่ให้ผม
5. แชร์ permission ให้ทีม Sales อีกครั้ง

### ทางที่ B — Add columns เอง (ไม่ต้องเปลี่ยน URL)

ที่ Sheet เดิม → คลิกที่ column P (ขวาสุด) → Insert column right ทีละ column ตามรายการนี้:

```
Row 1 (English keys): cName | cPhone | cLine | cEmail | cAddress | cJob | cCompany | cIncome | cSpouse | cBirthday | agent | leadSource | dateBook | dateContract | dateDownEnd | dateTransfer | bookAmount | loanBank | loanStatus | loanAmount | followNote | lastContact | promos | promoValue | mapsUrl | virtualTour

Row 2 (Thai labels): ชื่อลูกค้า | เบอร์โทร | LINE ID | Email | ที่อยู่ปัจจุบัน | อาชีพ | บริษัท | รายได้ต่อเดือน | คู่สมรส | วันเกิด | Agent/Sales | ที่มาลูกค้า | วันที่จอง | วันทำสัญญา | วันผ่อนดาวน์ครบ | วันโอน | เงินจอง | ธนาคารยื่นกู้ | สถานะกู้ | วงเงินอนุมัติ | บันทึก follow-up | วันที่ติดต่อล่าสุด | โปรโมชั่นที่ใช้ | มูลค่าโปร | Google Maps URL | VDO/360 URL
```

---

## 🎨 รูปบ้าน — Placeholder + วิธีใส่รูปจริง

**ตอนนี้:** SVG placeholder 16 ไฟล์ (A/B/C/D × 4 มุม) บอกว่า "ใส่รูปจริงที่นี่"

**วิธีใส่รูปจริง:**

1. เตรียมรูป .jpg ขนาด 4:3 (เช่น 800×600 หรือ 1600×1200) max 500KB/ไฟล์
2. ตั้งชื่อตามรูปแบบ:
   - `A_exterior.jpg` — หน้าบ้านไทป์ A
   - `A_floorplan.jpg` — ผังบ้าน A
   - `A_interior.jpg` — ภายในบ้าน A
   - `A_siteplan.jpg` — ผังโครงการ highlight A
   - (เหมือนกันสำหรับ B, C, D)
3. วางในโฟลเดอร์ `assets/photos/` ในเครื่องคุณ
4. รัน converter → จะ pack รูปลง zip
5. Deploy zip ใหม่
6. Dashboard ใช้ .jpg แทน .svg อัตโนมัติ

---

## 🎁 รูปแบบกรอกโปรโมชั่น

ใน column "โปรโมชั่นที่ใช้" (promos) ให้คั่นด้วย **` | `** (pipe + เว้นวรรค)

ตัวอย่าง:
```
ฟรีโอน | ฟรีจดจำนอง | แอร์ 3 ตัว | ฟรีค่าส่วนกลาง 1 ปี
```

Dashboard จะแสดงเป็น chip สีเขียวสวยๆ พร้อมราคารวมที่ column "มูลค่าโปร" (promoValue)

---

## 🔗 Customer link สำหรับ Sales

ที่หน้า detail ของแปลง คลิกปุ่ม **"🔗 ส่งให้ลูกค้า"** → copy ลิงก์เปิดดูแปลงนั้น

ตัวอย่างลิงก์:
```
https://onevela-cost.netlify.app/?view=customer&plot=5
```

ลูกค้ากดดูจะเห็น:
✅ รูปบ้าน · ผัง · ราคา · สถานะการขาย · ทำเล · โปรโมชั่นที่ได้
❌ ชื่อลูกค้าเอง · ต้นทุน · audit · agent · funnel

ส่งใน LINE ส่วนตัวลูกค้าได้เลย

---

## 🎯 ลำดับงานต่อไป

1. ⚙️ Re-import Sheet หรือ add columns
2. 🔄 Publish CSV ใหม่ (ถ้าใช้ทางที่ A) — ส่ง URL ใหม่ให้ผม
3. 📝 ลองกรอกข้อมูลลูกค้า 1-2 แปลงที่ขายแล้วเพื่อทดสอบ
4. 🔄 รีเฟรช Dashboard ดูว่าข้อมูลขึ้น
5. 🔗 ทดลองส่ง Customer link ให้ตัวเองดูบนมือถือ
6. 📸 (ภายหลัง) อัพรูปจริงแทน placeholder

---

## ❓ คำถามที่อาจมี

**Q: ทีม Sales พิมพ์ภาษาไทยใน Sheet ได้ไหม?**
A: ได้ทุก field — รวมชื่อลูกค้า, ที่อยู่, บันทึก follow-up

**Q: ใส่หลายเบอร์โทรได้ไหม?**
A: ใส่คั่นด้วย " / " เช่น "081-234-5678 / 02-555-1234"

**Q: ผ่าน Customer view ลูกค้าเห็นข้อมูลส่วนตัวตัวเองไหม?**
A: ไม่เห็น — Customer view ซ่อนทั้งหมด เห็นแค่ "แปลง 5 / สัญญา / ฿4.1M / รูปบ้าน"

**Q: รูปจริงไม่ต้องผ่านอะไรเพิ่ม?**
A: ใช่ — ใส่ใน /assets/photos/ ตั้งชื่อตาม convention → deploy ใหม่ → ใช้ได้

**Q: ถ้าอยากใส่รูปต่อแปลงต่างกัน (ไม่ใช่ต่อไทป์)?**
A: ระบบปัจจุบันรูปเป็นต่อไทป์ — ถ้าอยากต่อแปลง บอก Claude สร้างระบบ override
