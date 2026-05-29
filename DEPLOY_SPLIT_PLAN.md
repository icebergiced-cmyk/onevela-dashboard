# One Vela Split Web Apps

เป้าหมาย: ลดการโหลดข้อมูลรวมทั้งระบบ โดยแยกเป็น 3 static web apps และให้แต่ละ app ค่อยเรียกข้อมูลเฉพาะโมดูลของตัวเอง

## 1. Main Portal

โฟลเดอร์เตรียม deploy: `deploy-main/`

หน้าหลัก:
- `index.html` คือ portal เบาแบบ dark mode
- มีเฉพาะทางเข้า `จัดการสิทธิ์ผู้ใช้งาน`, `Finance`, `Operation`
- ไม่มี gallery, dashboard หนัก, cost data หรือ sales data

หลัง deploy แล้ว ให้นำ URL ของ Finance/Operation มาใส่ใน `APP_URLS` ของ `home.html`

## 2. Finance App

โฟลเดอร์เตรียม deploy: `deploy-finance/`

ขอบเขต:
- finance/accounting dashboard
- sales dashboard และเอกสารขาย
- quotation / booking / contract / receipt
- payment form / down payment
- fee / invoice
- income calculator

เป้าหมายรอบถัดไป:
- แยก API ให้ Finance โหลดเฉพาะข้อมูลขาย/การเงิน
- เพิ่ม endpoint เช่น `getFinanceData`, `getSalesPlotsLite`, `getPaymentsLite`

## 3. Operation App

โฟลเดอร์เตรียม deploy: `deploy-operation/`

ขอบเขต:
- cost dashboard
- construction admin / foreman update
- plot detail
- transfer checklist / transfer documents
- cost upload

เป้าหมายรอบถัดไป:
- แยก API ให้ Operation โหลดเฉพาะ cost/construction/transfer
- ย้าย user/password setting ออกจาก cost dashboard ให้เหลือ role permission จาก Main Portal

## Workflow แนะนำ

1. Deploy `deploy-main/` ก่อน
2. Deploy `deploy-finance/`
3. Deploy `deploy-operation/`
4. กลับมาแก้ `APP_URLS` ใน `home.html` ให้ชี้ URL จริง
5. ค่อย optimize API ทีละโมดูล ไม่แก้ทั้งระบบพร้อมกัน

