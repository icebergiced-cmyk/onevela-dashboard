# คู่มือสร้างระบบติดตามงานก่อสร้าง — Round 1 (Foundation)

ขยายระบบ One Vela เดิม ให้รองรับการอัปเดตงานก่อสร้างจากโฟร์แมน
โดยใช้หน้า `plot-detail` เดิมเป็น Single Source of Truth

**สถาปัตยกรรม:** Google Sheet + Apps Script + Google Drive (สอดคล้องระบบเดิม — ไม่มี D1/R2)
**ที่เก็บข้อมูล:** เพิ่ม 6 tab ใน Sheet เดิม **"One Vela Sales DB"**
(SHEET_ID: `1vUB9IwiUa_KpDYdKF3NyBYi3gABS7Ag7pvi8FNrYbg0`)

> **กติกาโครงสร้าง tab** (เหมือน tab เดิมทุกอัน):
> - แถว 1 = key อังกฤษ (Apps Script ใช้อ่าน — ห้ามแก้)
> - แถว 2 = ป้ายไทย (คนอ่าน — แก้ได้)
> - แถว 3 ลงไป = ข้อมูล

---

## 📋 ส่วนที่ 1 — สร้าง 6 tab

เปิด Sheet "One Vela Sales DB" → กด ➕ สร้าง tab ใหม่ทีละอัน ตั้งชื่อ + ใส่หัวตามตาราง

### Tab 1: `users` — ผู้ใช้ระบบ + บทบาท

| คอลัมน์ | key (แถว 1) | ป้ายไทย (แถว 2) | หมายเหตุ |
|---|---|---|---|
| A | `user_id` | รหัสผู้ใช้ | PK — รันเลข 1,2,3,... |
| B | `line_user_id` | LINE User ID | ได้จาก LINE Login · ห้ามซ้ำ |
| C | `display_name` | ชื่อแสดง | |
| D | `line_picture_url` | รูปโปรไฟล์ LINE | |
| E | `phone` | เบอร์โทร | ไม่บังคับ |
| F | `role` | บทบาท | `admin` / `foreman` / `sales` / `finance` |
| G | `active` | ใช้งาน | `1` = เปิด, `0` = ปิด |
| H | `created_at` | สร้างเมื่อ | ISO datetime |
| I | `last_login_at` | เข้าระบบล่าสุด | ISO datetime |

### Tab 2: `plot_construction` — สถานะก่อสร้างรายแปลง (ขยาย plot เดิม)

| คอลัมน์ | key | ป้ายไทย | หมายเหตุ |
|---|---|---|---|
| A | `plot_id` | เลขแปลง | PK — อ้างอิงแปลงใน tab `metadata` เดิม |
| B | `current_milestone_id` | milestone ปัจจุบัน | FK → `milestones_template.template_id` |
| C | `progress_percent` | %คืบหน้า | 0-100 |
| D | `status` | สถานะ | `not_started`/`in_progress`/`completed`/`on_hold` |
| E | `assigned_foreman_id` | โฟร์แมนผู้รับผิดชอบ | FK → `users.user_id` |
| F | `actual_start_date` | วันเริ่มจริง | |
| G | `estimated_completion_date` | วันคาดเสร็จ | |
| H | `last_update_at` | อัปเดตล่าสุด | ISO datetime |

### Tab 3: `milestones_template` — แม่แบบ milestone 4 ไทป์

| คอลัมน์ | key | ป้ายไทย |
|---|---|---|
| A | `template_id` | รหัส (PK) |
| B | `house_type` | ไทป์บ้าน — `ULTRA`/`MINUTES`/`SECOND`/`MOMENT` |
| C | `milestone_order` | ลำดับ |
| D | `milestone_name` | ชื่องาน |
| E | `milestone_category` | หมวดงาน — โครงสร้าง/งานสถาปัตย์/งานระบบ/งานตกแต่ง |
| F | `expected_days` | วันที่คาด |
| G | `weight_percent` | น้ำหนัก% |
| H | `photo_required` | ต้องมีรูป (1/0) |
| I | `description` | คำอธิบาย |

> ⚡ tab นี้**ไม่ต้องพิมพ์เอง** — import จากไฟล์ CSV (ดูส่วนที่ 2)

### Tab 4: `construction_updates` — รายการอัปเดตงานจากโฟร์แมน

| คอลัมน์ | key | ป้ายไทย | หมายเหตุ |
|---|---|---|---|
| A | `update_id` | รหัสอัปเดต | PK |
| B | `plot_id` | เลขแปลง | FK → metadata เดิม |
| C | `foreman_id` | โฟร์แมน | FK → users |
| D | `created_at` | บันทึกเมื่อ | |
| E | `milestones_completed` | milestone ที่เสร็จ | JSON เช่น `[3,4,5]` |
| F | `progress_delta` | %เพิ่มจากครั้งก่อน | |
| G | `gps_lat` | พิกัด lat | |
| H | `gps_lng` | พิกัด lng | |
| I | `gps_accuracy` | ความแม่นยำ GPS (ม.) | |
| J | `text_note` | บันทึกข้อความ | |
| K | `voice_note_url` | ลิงก์ไฟล์เสียง | |
| L | `has_issue` | มีปัญหา (1/0) | |
| M | `issue_description` | รายละเอียดปัญหา | |
| N | `issue_severity` | ระดับ — `low`/`medium`/`high` | |
| O | `issue_status` | สถานะปัญหา — `open`/`acknowledged`/`in_progress`/`resolved` | |
| P | `status` | สถานะอัปเดต — `pending`/`approved`/`rejected` | |
| Q | `approved_by` | ผู้อนุมัติ | FK → users |
| R | `approved_at` | อนุมัติเมื่อ | |
| S | `rejection_reason` | เหตุผลปฏิเสธ | |

### Tab 5: `construction_photos` — รูปถ่ายหน้างาน

| คอลัมน์ | key | ป้ายไทย | หมายเหตุ |
|---|---|---|---|
| A | `photo_id` | รหัสรูป | PK |
| B | `update_id` | รหัสอัปเดต | FK → construction_updates |
| C | `drive_file_id` | Drive File ID | *(แทน r2_key — สถาปัตยกรรมใช้ Drive)* |
| D | `drive_url` | ลิงก์รูป Drive | |
| E | `thumbnail_url` | ลิงก์รูปย่อ | |
| F | `taken_at` | ถ่ายเมื่อ | |
| G | `exif_lat` | พิกัด EXIF lat | |
| H | `exif_lng` | พิกัด EXIF lng | |
| I | `file_size_kb` | ขนาดไฟล์ (KB) | |
| J | `width` | กว้าง (px) | |
| K | `height` | สูง (px) | |
| L | `ai_caption` | คำบรรยายจาก AI | เผื่อใช้ทีหลัง — รอบนี้แค่ช่องว่าง |

### Tab 6: `notifications_log` — ประวัติการแจ้งเตือน

| คอลัมน์ | key | ป้ายไทย | หมายเหตุ |
|---|---|---|---|
| A | `log_id` | รหัส log | PK |
| B | `notification_type` | ประเภท — `line_message`/`email`/`in_app` | |
| C | `recipient_line_id` | LINE ID ผู้รับ | |
| D | `recipient_user_id` | user_id ผู้รับ | |
| E | `related_plot_id` | แปลงที่เกี่ยวข้อง | |
| F | `related_update_id` | อัปเดตที่เกี่ยวข้อง | |
| G | `message` | ข้อความ | |
| H | `status` | สถานะ — `sent`/`failed` | |
| I | `sent_at` | ส่งเมื่อ | |
| J | `error_message` | ข้อความ error | |

---

## 📥 ส่วนที่ 2 — Import seed milestones (64 รายการ)

tab `milestones_template` มีข้อมูล seed 64 รายการ (A=21, B=15, C=15, D=13)
**ไม่ต้องพิมพ์เอง** — import จากไฟล์:

1. เปิด Sheet → ไปที่ tab **`milestones_template`** (สร้างว่างไว้ตามส่วนที่ 1)
2. เมนู **File → Import**
3. แท็บ **Upload** → เลือกไฟล์ `_tools/tracker_seed_milestones.csv`
4. Import location → เลือก **"Replace current sheet"**
5. Separator type → **Comma** → กด **Import data**

เสร็จแล้ว tab จะมี: แถว 1 = key, แถว 2 = ป้ายไทย, แถว 3-66 = milestone 64 รายการ

> ตรวจ: แถว 3 ต้องเป็น `1 · ULTRA · 1 · เตรียมพื้นที่...` และแถวสุดท้าย (66) เป็น `64 · MOMENT · 13 · สุขภัณฑ์-ดวงไฟ...`

---

## 👤 ส่วนที่ 3 — เพิ่ม Test Users (2 คน)

ที่ tab `users` แถว 3-4 ใส่ผู้ใช้ทดสอบ (ค่า `line_user_id` ใส่จริงทีหลังเมื่อต่อ LINE Login):

| user_id | line_user_id | display_name | line_picture_url | phone | role | active | created_at | last_login_at |
|---|---|---|---|---|---|---|---|---|
| 1 | `TEST_ADMIN` | ไอซ์ (แอดมิน) | | | `admin` | 1 | | |
| 2 | `TEST_FOREMAN` | โฟร์แมนทดสอบ | | | `foreman` | 1 | | |

> เมื่อต่อ LINE Login จริง — เปลี่ยน `TEST_ADMIN`/`TEST_FOREMAN` เป็น LINE User ID จริง

---

## ✅ Checklist STEP 3

- [ ] สร้าง 6 tab: `users`, `plot_construction`, `milestones_template`, `construction_updates`, `construction_photos`, `notifications_log`
- [ ] ใส่หัวแถว 1 (key) + แถว 2 (ป้ายไทย) ครบทุก tab
- [ ] Import `tracker_seed_milestones.csv` เข้า tab `milestones_template`
- [ ] เพิ่ม test users 2 คน
- [ ] tab `plot_construction` / `construction_updates` / `construction_photos` / `notifications_log` — มีแค่หัว (ข้อมูลจะถูกเพิ่มตอนใช้งานจริง)

> ยังไม่ต้องแตะ Apps Script ใน STEP นี้ — actions API จะทำใน Round ถัดไป
