# คู่มือ Deploy Apps Script เวอร์ชันใหม่ (พ.ค. 2026)

มีการเพิ่ม actions ใหม่: `saveQuotation`, `saveWalkIn`, `getDocsByPlot`, `getNextQuoteNo`
ต้องเพิ่ม **3 tab ใหม่** ใน Google Sheet ก่อน deploy

---

## ขั้นที่ 1: เพิ่ม tabs ใน Google Sheet

เปิด Google Sheet (SHEET_ID: `1vUB9IwiUa_KpDYdKF3NyBYi3gABS7Ag7pvi8FNrYbg0`) แล้วเพิ่ม 3 tab ตามนี้:

### Tab `quotations`
| แถว | A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|---|
| **1** (key อังกฤษ) | `docNo` | `plot` | `cName` | `cPhone` | `priceNet` | `downPmt` | `months` | `createdAt` | `fileUrl` |
| **2** (ป้ายไทย) | เลขใบเสนอราคา | แปลง | ชื่อลูกค้า | เบอร์โทร | ราคาสุทธิ | เงินดาวน์ | งวด | วันที่สร้าง | ลิงก์ไฟล์ |

### Tab `walkins`
| แถว | A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|---|
| **1** | `visitDate` | `cName` | `cPhone` | `plotInterest` | `source` | `note` | `salesPerson` | `createdAt` |
| **2** | วันที่เข้าชม | ชื่อลูกค้า | เบอร์โทร | แปลงที่สนใจ | แหล่งที่มา | หมายเหตุ | เซลล์ | วันที่บันทึก |

### Tab `counters`
| แถว | A | B |
|---|---|---|
| **1** | `key` | `value` |
| **2** | (ปล่อยว่าง) | (ปล่อยว่าง) |

**สำคัญ:** แถว 2 ของ `counters` ปล่อยว่างไว้ — Apps Script จะเติมข้อมูลเข้าไปเอง
แต่แถว 1 ต้องเป็น `key | value` (Apps Script อ่านแถว 1 เป็น header)

### เพิ่มคอลัมน์ `fileUrl` ใน tab เดิม (เพื่อให้ plot-detail เห็นลิงก์ไฟล์ PDF)

ในแต่ละ tab ด้านล่าง — ให้เพิ่มคอลัมน์ใหม่ที่ขวาสุด ชื่อ key (แถว 1) คือ `fileUrl` ป้ายไทย (แถว 2) คือ `ลิงก์ไฟล์`

- **bookings** : เพิ่ม `fileUrl` / `ลิงก์ไฟล์`
- **contracts** : เพิ่ม `fileUrl` / `ลิงก์ไฟล์`
- **payments** : เพิ่ม `fileUrl` / `ลิงก์ไฟล์` (และเพิ่ม `plot` / `แปลง` ด้วยถ้ายังไม่มี)

> ถ้า tab ไหนมีคอลัมน์ `fileUrl` อยู่แล้ว ข้ามได้
> Apps Script จะ update คอลัมน์นี้อัตโนมัติเมื่ออัปโหลด PDF

---

## ขั้นที่ 2: อัปเดตโค้ด Apps Script

1. เปิด https://script.google.com → เปิด project ที่ deploy Web App อยู่
2. เปิดไฟล์ `Code.gs` ลบโค้ดทั้งหมด
3. เปิด `_tools/sales_api.gs` ในเครื่อง → copy ทั้งหมด → paste ลง `Code.gs`
4. กดบันทึก (💾) → ตั้งชื่อ project ถ้าจำเป็น

---

## ขั้นที่ 3: Deploy เวอร์ชันใหม่

1. กดปุ่ม **Deploy** (มุมขวาบน) → **Manage deployments**
2. กดไอคอนดินสอ ✏️ (Edit) ที่ deployment ปัจจุบัน
3. ใน "Version" เลือก **New version**
4. ใส่คำอธิบาย: "เพิ่ม saveQuotation, saveWalkIn, getDocsByPlot, daily counter"
5. กด **Deploy**
6. URL **ไม่เปลี่ยน** — ใช้ตัวเดิม:
   `https://script.google.com/macros/s/AKfycbzR-qHtv0GgHRVmon14YEPM_2XFACo2ZzdPTYc0UBLgAjPHYrr9FTt7L4B2xZVLAi1F/exec`

---

## ขั้นที่ 4: ทดสอบ

เปิดในเบราว์เซอร์:

- `<URL>?action=ping` → ต้องได้ `{ok:true, msg:"..."}` 
- `<URL>?action=getNextQuoteNo` → ต้องได้ `{ok:true, no:"DDMMYY-1"}` (ครั้งแรกของวันนั้น)
- กดซ้ำอีกครั้ง → `{ok:true, no:"DDMMYY-2"}` (counter +1)
- `<URL>?action=getDocsByPlot&plot=140` → ต้องได้ `{ok:true, plot:"140", quotations:[...], bookings:[...], ...}`

ถ้าผ่านทั้งหมด = backend พร้อมใช้ ✅

---

## หมายเหตุ

- **counter รีเซ็ตอัตโนมัติทุกวัน** — เพราะ key ใช้รูปแบบ `quote_DDMMYY` วันใหม่ key ใหม่ ค่าเริ่มที่ 1
- **ถ้าอยาก reset counter วันนี้** — ไปที่ tab `counters` ลบแถวที่ key เป็น `quote_DDMMYY` (เช่น `quote_200569`) ออก
- **LockService** ใช้ป้องกัน race condition ถ้าหลายคนกดออกใบเสนอราคาพร้อมกัน — เลขจะไม่ซ้ำ
