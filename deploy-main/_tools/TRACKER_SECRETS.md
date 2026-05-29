# Secrets & Config — ระบบติดตามงานก่อสร้าง

สถาปัตยกรรมนี้ไม่มี `wrangler.toml` / `.env` (ไม่มี Worker)
**ค่าลับเก็บใน Apps Script Script Properties** — ฝั่ง server ปลอดภัย ไม่เข้า git

> 🔴 **ห้ามใส่ค่าลับลงใน `sales_api.gs` โดยตรง** — เพราะไฟล์นั้นถูก commit ขึ้น git
> ต้องอ่านผ่าน `PropertiesService.getScriptProperties().getProperty('KEY')` เสมอ

---

## 🔑 รายการ Secrets — แยกเป็น 2 กลุ่ม

### กลุ่ม A — ค่าลับ (เก็บใน Apps Script Script Properties)

| Key | ใช้ทำอะไร | ได้มาจาก |
|---|---|---|
| `LINE_LOGIN_CHANNEL_SECRET` | ตรวจสอบ token ตอน LINE Login | LINE Developers Console → LINE Login channel |
| `LINE_MESSAGING_TOKEN` | ส่งข้อความแจ้งเตือนผ่าน LINE | LINE Developers Console → Messaging API channel |
| `JWT_SECRET` | เซ็น session token (อายุ 30 วัน) | สุ่มเอง — string ยาว ≥32 ตัวอักษร |
| `ANTHROPIC_API_KEY` | AI วิเคราะห์รูป (เผื่อใช้ทีหลัง) | console.anthropic.com |

### กลุ่ม B — ค่าสาธารณะ (ใส่ในโค้ดฝั่งหน้าเว็บได้ — ไม่ลับ)

| Key | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|
| `LINE_LIFF_ID` | เริ่มต้น LIFF SDK ในเบราว์เซอร์ | ฝังในหน้า HTML ได้ — ไม่ลับ |
| `LINE_LOGIN_CHANNEL_ID` | ใช้ใน LINE login URL | ไม่ลับ (เปิดเผยได้) |

---

## ⚙️ วิธีตั้งค่า Script Properties (กลุ่ม A)

ทำเมื่อถึง Round ที่ต่อ LINE Login จริง — ขั้นตอน:

1. เปิด Apps Script Editor (project One Vela)
2. ไอคอน ⚙️ **Project Settings** (เมนูซ้าย)
3. เลื่อนลงหา **Script Properties** → **Add script property**
4. ใส่ทีละคู่ key/value ตามตารางกลุ่ม A ด้านบน
5. กด **Save script properties**

> ค่าเหล่านี้อยู่กับ Apps Script project — ไม่ต้องใส่ใหม่ตอน deploy เวอร์ชันใหม่

---

## 🛡️ Security Checklist

- [x] `.gitignore` กัน `.env`, `.dev.vars`, `*.secret` แล้ว
- [ ] ไม่ hardcode ค่ากลุ่ม A ใน `sales_api.gs` — อ่านผ่าน `PropertiesService` เท่านั้น
- [ ] LINE callback URL ตั้งให้ตรงโดเมน `onevela-dashboard.iceberg-iced.workers.dev`
- [ ] `JWT_SECRET` สุ่มใหม่ ไม่ใช้ค่าตัวอย่าง

---

## 📌 หมายเหตุสถาปัตยกรรม

| Prompt เดิม (Worker) | ของจริง (Apps Script) |
|---|---|
| `wrangler secret put X` | Script Properties |
| `.env` / `.dev.vars` | Script Properties (ไม่มีไฟล์ในเครื่อง) |
| `.env.example` | ไฟล์นี้ (`TRACKER_SECRETS.md`) |
