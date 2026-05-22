# สถาปัตยกรรม — ระบบติดตามงานก่อสร้าง One Vela

> เอกสาร Round 1 (Foundation) · อัปเดต พ.ค. 2569

## 1. ภาพรวม & ปรัชญา

ขยายระบบ `onevela-dashboard` เดิม ให้รองรับการอัปเดตงานก่อสร้างจากโฟร์แมน
โดย**ไม่สร้างระบบใหม่แยก** — ใช้หน้า `plot-detail` เดิมเป็น Single Source of Truth

- ขยายระบบเดิม → เพิ่ม section "งานก่อสร้าง" ในหน้า plot-detail
- ทุก role ใช้เว็บเดียวกัน — ระบบซ่อน/แสดง section ตาม permission
- โฟร์แมนใช้บนมือถือ (responsive) · พี่ Ice ดูบน desktop
- ขอบเขตรอบนี้: ตัด "ขอเบิกวัสดุ" และ "Customer Portal" ออก เพื่อโฟกัส

## 2. สถาปัตยกรรม

ใช้ stack เดียวกับระบบเดิม — **ไม่มี Cloudflare Worker / D1 / R2**

```
[เบราว์เซอร์] plot-detail.html (static + JS)
      │  fetch()
      ▼
[Google Apps Script Web App]  ← logic + auth
      │
      ├──▶ [Google Sheet "One Vela Sales DB"]  ← ฐานข้อมูล (15 tab)
      └──▶ [Google Drive "One Vela Sales Files"] ← รูปหน้างาน
```

| ชั้น | เทคโนโลยี |
|---|---|
| หน้าเว็บ | HTML/JS static — deploy ผ่าน Cloudflare (auto จาก GitHub) |
| Logic / API | Google Apps Script Web App (`sales_api.gs`) |
| ฐานข้อมูล | Google Sheet — 6 tab ใหม่ + 9 tab เดิม |
| ไฟล์รูป | Google Drive — โฟลเดอร์ย่อย `รูปหน้างาน/` |
| Auth | LINE LIFF (client) + JWT (Apps Script) |

## 3. ฐานข้อมูล — 6 tab ใหม่

| tab | บทบาท |
|---|---|
| `users` | ผู้ใช้ + บทบาท 4 role |
| `plot_construction` | สถานะก่อสร้างปัจจุบันรายแปลง (ขยาย plot เดิม) |
| `milestones_template` | แม่แบบ milestone 4 ไทป์ (64 รายการ) |
| `construction_updates` | รายการอัปเดตจากโฟร์แมน (รออนุมัติ) |
| `construction_photos` | รูปหน้างาน (อ้างอิงไฟล์ใน Drive) |
| `notifications_log` | ประวัติการแจ้งเตือน |

**ความสัมพันธ์ (FK เชิงตรรกะ — Sheet ไม่บังคับ):**
```
metadata.plot (เดิม) ──< plot_construction.plot_id
                     ──< construction_updates.plot_id
milestones_template.template_id ──< plot_construction.current_milestone_id
users.user_id ──< plot_construction.assigned_foreman_id
              ──< construction_updates.foreman_id / approved_by
construction_updates.update_id ──< construction_photos.update_id
```

## 4. Data Flow — การอัปเดตงาน

```
1. โฟร์แมนเปิด plot-detail บนมือถือ → กด "อัปเดตงาน"
2. เลือก milestone ที่เสร็จ + ถ่ายรูป + GPS + โน้ต (+ ปัญหาถ้ามี)
3. บันทึก → construction_updates (status = pending)
   รูป → Drive + construction_photos
4. แอดมินตรวจ → อนุมัติ/ปฏิเสธ
5. ถ้าอนุมัติ → อัปเดต plot_construction (progress%, milestone, status)
6. plot-detail แสดง % คืบหน้า + timeline + รูป
7. notifications_log บันทึกการแจ้งเตือนที่ส่ง
```

progress% คำนวณจากผลรวม `weight_percent` ของ milestone ที่เสร็จ (รวม 100/ไทป์)

## 5. Authentication

- **LINE Login** ผ่าน LIFF (LINE Front-end Framework) — ทำงานฝั่ง client
- Apps Script ตรวจ ID token กับ LINE → ออก **JWT** (อายุ 30 วัน) เก็บใน browser
- เปิดหน้าเว็บ → ตรวจ JWT → รู้ role → ซ่อน/แสดง section
- ผู้ใช้ใหม่ (LINE ID ไม่อยู่ใน tab `users`) → เข้าได้แบบจำกัด รอแอดมินกำหนด role

## 6. การเชื่อมกับ plot-detail เดิม

หน้า `plot-detail.html` เดิมแสดง: หัวบ้าน + 4 ตารางเอกสาร (เสนอราคา/จอง/สัญญา/ใบเสร็จ)
**เพิ่ม section ใหม่ "งานก่อสร้าง"** แบบ side-by-side — ไม่แตะ logic เดิม:
- แถบความคืบหน้า % + milestone ปัจจุบัน
- Timeline การอัปเดต + รูป
- รายการปัญหาหน้างาน
- ปุ่ม "อัปเดตงาน" (เห็นเฉพาะ admin/foreman)

## 7. ขอบเขต Round 1 (Foundation) — ทำอะไรไปแล้ว

- ✅ Schema 6 tab + seed 64 milestones (`_tools/TRACKER_SETUP.md`, `tracker_seed_milestones.csv`)
- ✅ แผนโฟลเดอร์ Drive (`รูปหน้างาน/`)
- ✅ แผน secrets (`_tools/TRACKER_SECRETS.md`)
- ✅ เอกสารสถาปัตยกรรม + permission matrix

**ยังไม่ทำ (Round ถัดไป):** Apps Script actions (API), LINE Login, section UI ใน plot-detail,
ฟอร์มอัปเดตงานบนมือถือ, ระบบอนุมัติ, การแจ้งเตือน LINE
