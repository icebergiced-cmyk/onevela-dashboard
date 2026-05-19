# คู่มือ Deploy แดชบอร์ดต้นทุนบ้านขึ้น Netlify

> ใช้เวลาประมาณ **5-10 นาที** ทำครั้งเดียวจบ ฟรี 100% ได้ลิงก์ HTTPS ใช้บนมือถือได้ทันที

---

## สิ่งที่ต้องเตรียมก่อนเริ่ม

- คอมพิวเตอร์ที่มี internet
- โฟลเดอร์ `dashboard-online` (ที่ Claude เตรียมไว้แล้ว)
- email สำหรับสมัคร Netlify

---

## ขั้นตอนที่ 1: สมัครบัญชี Netlify

1. เปิดเว็บ https://app.netlify.com/signup
2. คลิก **"Sign up with Google"** (เร็วสุด) หรือใช้ email ก็ได้
3. ยืนยัน email ที่ Netlify ส่งมา
4. เข้าหน้า Dashboard ของ Netlify

---

## ขั้นตอนที่ 2: Deploy ไฟล์ (วิธีลาก-วาง ง่ายสุด)

1. ที่หน้า Netlify Dashboard เลื่อนลงไปจะเห็นกล่องใหญ่เขียนว่า:

   > **"Want to deploy a new site without connecting to Git? Drag and drop your site output folder here"**

2. **เปิด Finder** (Mac) ไปที่ `Desktop > one vela main file > dashboard-online`

3. **ลากทั้งโฟลเดอร์ `dashboard-online`** ไปวางในกล่องของ Netlify

4. รอประมาณ 30 วินาที — Netlify จะ upload และ deploy อัตโนมัติ

5. เสร็จแล้ว! จะได้ลิงก์แบบสุ่ม เช่น `https://random-name-12345.netlify.app`

---

## ขั้นตอนที่ 3: เปลี่ยนชื่อ URL ให้จำง่าย

1. ในหน้า site ที่เพิ่ม deploy คลิก **"Site configuration"** ที่เมนูซ้าย
2. คลิก **"Change site name"**
3. ตั้งชื่อใหม่ เช่น:
   - `onevela-cost`
   - `wanwela-dashboard`
   - `twobuild-onevela`
4. กด **"Save"**
5. ลิงก์ใหม่จะเป็น `https://onevela-cost.netlify.app` (เปลี่ยนตามชื่อที่ตั้ง)

---

## ขั้นตอนที่ 4: ทดสอบบนมือถือ

1. เปิด Safari (iPhone) หรือ Chrome (Android)
2. พิมพ์ URL ที่ได้
3. ควรเห็น Dashboard แสดงผลถูกต้อง สวยบนมือถือ
4. ลองกด Add to Home Screen (วิธีในคู่มือไฟล์ที่ 2)

---

## วิธีอัพเดทข้อมูล Dashboard ในอนาคต

เมื่อข้อมูลเปลี่ยน คุณต้อง:

**วิธีที่ 1: ลาก-วางทับ (ง่ายสุด)**

1. แก้ไขไฟล์ `index.html` ในโฟลเดอร์ `dashboard-online` ให้มีข้อมูลใหม่
2. เข้าไปที่ site ใน Netlify Dashboard
3. คลิกเมนู **"Deploys"** ด้านบน
4. เลื่อนลงไปดูกล่อง **"Need to update your site? Drag and drop your site output folder here"**
5. ลากโฟลเดอร์ `dashboard-online` ใหม่ลงไปทับ
6. รอ 30 วินาที — Dashboard อัพเดทพร้อมใช้บนมือถือทันที

> **หมายเหตุ:** ผู้ใช้อาจต้อง refresh เบราว์เซอร์ 1-2 ครั้ง เพื่อเห็นข้อมูลใหม่ (เพราะระบบมี cache เพื่อให้เร็วบนมือถือสัญญาณอ่อน)

---

## ปัญหาที่อาจเจอ และวิธีแก้

**ปัญหา: Drag-drop ไม่ work**

→ ตรวจสอบว่าลาก **โฟลเดอร์ทั้งโฟลเดอร์** ไม่ใช่ลากไฟล์ index.html ไฟล์เดียว

**ปัญหา: Dashboard เปิดแล้วเป็นหน้าว่าง**

→ เปิด browser console (F12) ดู error ถ้ามีปัญหา service worker ให้ลบ cache แล้วเปิดใหม่

**ปัญหา: ไอคอนไม่ขึ้น**

→ ตรวจสอบว่ามีไฟล์ icon-192.png, icon-512.png, manifest.json อยู่ในโฟลเดอร์เดียวกับ index.html

**ปัญหา: ชื่อ URL ที่อยากใช้ถูกคนอื่นจองแล้ว**

→ ลองใส่ -2026, -2 ต่อท้าย หรือเปลี่ยนชื่อใหม่

---

## ค่าใช้จ่าย

ฟรี 100% สำหรับการใช้งานขนาดทีม 5-15 คน

Netlify Free Plan รวม:
- Bandwidth 100 GB/เดือน (เพียงพอเกินมาก)
- Builds 300 นาที/เดือน (เราใช้ drag-drop ไม่ใช้ builds)
- HTTPS อัตโนมัติ
- URL `.netlify.app` ฟรีถาวร

ถ้าอยากใช้ domain ของตัวเอง (เช่น `cost.twobuild.co.th`) เพิ่มได้ฟรี ต้องมี domain เป็นของตัวเองก่อน

---

## สรุปไฟล์ในโฟลเดอร์ dashboard-online

| ไฟล์ | หน้าที่ |
|-----|--------|
| `index.html` | หน้า Dashboard หลัก (ที่ทีมจะเปิดดู) |
| `manifest.json` | บอกมือถือว่า Dashboard นี้เป็น "แอป" |
| `sw.js` | Service worker ทำให้ใช้ offline ได้ + เร็วขึ้น |
| `icon-192.png` | ไอคอนแอปขนาดเล็ก |
| `icon-512.png` | ไอคอนแอปขนาดใหญ่ |
| `icon-192-maskable.png` | ไอคอนสำหรับ Android (adaptive) |
| `icon-512-maskable.png` | ไอคอนสำหรับ Android (adaptive) |
| `favicon.png` | ไอคอนเล็กที่แสดงใน browser tab |
| `1_คู่มือ_Deploy_Netlify.md` | คู่มือนี้ (อ่านครั้งเดียวก็พอ) |
| `2_คู่มือทีม_ติดตั้งบนมือถือ.md` | ส่งให้ทีม |
