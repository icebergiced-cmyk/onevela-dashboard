# One Vela Module Split Status

ใช้ไฟล์นี้เป็น briefing กลางสำหรับงานรอบถัดไป เพื่อลด context และให้แต่ละ session โฟกัสเฉพาะโมดูล

## Rules For Every Session

- ทำงานต่อจาก workspace ปัจจุบัน ห้ามเริ่มใหม่
- preserve current worktree changes
- ถ้าจะแก้เฉพาะโมดูลใด ให้แตะเฉพาะไฟล์ของโมดูลนั้น + shared assets ที่จำเป็นจริง
- ถ้ามีการเปลี่ยน shared UI ให้ตรวจผลกับทั้ง `portal`, `finance`, `operation`
- source of truth หลักคือไฟล์ใน root นี้ ไม่ใช่ `deploy-*`

## App Split

### 1. Main Portal

หน้าที่:
- เป็นประตูหลักของระบบ
- รวมทางเข้าไป `finance` และ `operation`
- ไม่โหลดข้อมูลหนักของแต่ละโมดูล

ไฟล์หลัก:
- `home.html`
- `index.html`
- `login.html`
- `assets/onevela-workbench.css`
- `assets/onevela-workbench.js`

สถานะปัจจุบัน:
- `home.html` redesign แล้วเป็น lightweight portal
- `index.html` เอา prompt login เดิมออกแล้ว ใช้ `Auth.require('view.cost')`
- shared workbench ใช้งานได้แล้ว

งานที่ยังค้าง:
- polish portal links ให้ตรงกับ split deploy จริง
- ตรวจ wording / CTA ให้เป็นมาตรฐานเดียวกับ finance และ operation
- หลัง deploy จริง ค่อย update app URLs ถ้าต้องใช้ external URLs

### 2. Finance

หน้าที่:
- sales dashboard และเอกสารขาย
- payments / receipts / fee / invoice
- finance-accounting dashboard

ไฟล์หลัก:
- `finance-accounting.html`
- `sales-dashboard.html`
- `sales-quotation.html`
- `sales-booking.html`
- `sales-contract.html`
- `sales-receipt.html`
- `payment.html`
- `payment-form.html`
- `fee.html`
- `fee-invoice.html`
- `income-calculator.html`

สถานะปัจจุบัน:
- `finance-accounting.html` partially reskinned แล้ว
- `sales-dashboard.html` partially reskinned แล้ว
- `fee.html` reskinned เพิ่ม shell + module links แล้ว
- shared workbench ถูกผูกเข้าหลายหน้าหลักแล้ว

งานที่ยังค้าง:
- ทำ visual consistency ให้ครบทุกหน้าเอกสารขาย
- เปลี่ยนหน้าที่ยังเป็น style เก่าให้เข้า theme เดียวกัน
- ตรวจ cross-links ระหว่าง sales, payment, fee, finance hub

### 3. Operation

หน้าที่:
- cost dashboard
- construction admin
- foreman update
- plot detail / construction detail
- transfer flow
- ERP demo

ไฟล์หลัก:
- `operation.html`
- `admin-construction.html`
- `admin-upload.html`
- `index.html`
- `plot-detail.html`
- `construction-detail.html`
- `foreman-update.html`
- `transfer.html`
- `transfer-checklist.html`
- `transfer-money.html`
- `transfer-cheque.html`
- `erp-demo.html`

สถานะปัจจุบัน:
- `operation.html` partially reskinned แล้ว
- `erp-demo.html` สร้างแล้วเป็น Demo 1
- `transfer.html` reskinned แล้ว
- `foreman-update.html` ผูก shared workbench + desktop shell แล้ว

งานที่ยังค้าง:
- ทำ transfer family ให้ครบชุดเดียวกัน
- ทำ foreman / construction / plot detail ให้ visual language ตรงกัน
- ลดหน้าเก่าที่ยังพึ่ง `home-fab` แบบเดี่ยวให้เป็น navigation มาตรฐาน

## Shared Layer

ไฟล์หลัก:
- `assets/onevela-workbench.css`
- `assets/onevela-workbench.js`

หน้าที่:
- floating linked navigation
- module identity
- consistent quick jump ระหว่าง portal / finance / operation

ข้อกำหนด:
- ถ้าเพิ่มหน้าหลักของโมดูล ต้อง update `assets/onevela-workbench.js`
- ถ้าเปลี่ยน visual token สำคัญ ให้เช็กผลกับหน้าที่ผูก workbench แล้ว

## Deploy Folders

มีแล้ว:
- `deploy-main/`
- `deploy-finance/`
- `deploy-operation/`

ข้อปฏิบัติ:
- อย่าใช้ deploy folders เป็นจุดเริ่มอ่านโค้ด
- ให้แก้ source pages ก่อน
- ค่อย sync ไป deploy folders ตอนรอบ deploy/publish โดยเฉพาะ

## Recommended Session Pattern

### Session Type A: Operation Only

ส่ง brief แบบนี้:
- เป้าหมาย: reskin / wire / polish เฉพาะ operation
- ไฟล์เป้าหมาย: ระบุ 2-5 ไฟล์
- ห้ามแตะ: finance, portal, deploy folders

### Session Type B: Finance Only

ส่ง brief แบบนี้:
- เป้าหมาย: reskin / table UX / document flow เฉพาะ finance
- ไฟล์เป้าหมาย: ระบุ 2-5 ไฟล์
- ห้ามแตะ: operation, portal, deploy folders

### Session Type C: Portal + Cross-Link Pass

ส่ง brief แบบนี้:
- เป้าหมาย: ทำ navigation, wording, consistency ข้ามระบบ
- แตะได้เฉพาะ `home.html`, `index.html`, shared assets, และหน้า entry points

### Session Type D: Deploy Sync

ส่ง brief แบบนี้:
- เป้าหมาย: sync source -> deploy folders
- ห้าม redesign เพิ่มระหว่าง sync

## Current Priority

ลำดับที่แนะนำตอนนี้:
1. operation transfer family
2. operation foreman / construction related pages
3. finance document pages
4. portal consistency pass
5. deploy sync

## Next Target Suggestion

ถ้าจะทำงานต่อทันทีโดยประหยัด context มากสุด ให้เปิดรอบใหม่ด้วย brief นี้:

`Continue One Vela split. Focus only on Operation module. Target files: transfer-checklist.html, transfer-money.html, transfer-cheque.html, admin-construction.html, plot-detail.html. Match the visual/workbench system already used in operation.html, transfer.html, foreman-update.html. Do not touch finance, portal, or deploy folders. Preserve current worktree changes.`
