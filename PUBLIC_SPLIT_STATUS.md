# Public Split Status

อัปเดตล่าสุด: 2026-05-28

## เป้าหมาย

แยก One Vela ออกเป็น 3 public web apps:

- Portal
- Finance
- Operation

โดยยังใช้:

- Google Sheet เดิม
- Google Drive เดิม
- auth/client logic เดิม

## Public Publish Bundles

เตรียม bundle สำหรับ deploy แบบเบาไว้แล้ว:

- `/Users/imacm4/Desktop/one vela main file/dashboard-online/publish-main`
- `/Users/imacm4/Desktop/one vela main file/dashboard-online/publish-finance`
- `/Users/imacm4/Desktop/one vela main file/dashboard-online/publish-operation`

สิ่งที่ถูกตัดออกจาก bundle:

- Excel / docs / helper files ที่ไม่จำเป็นต่อ public runtime
- asset PNG ขนาดใหญ่ที่ไม่ถูกใช้งาน

## Current Site Mapping

ใช้ site ที่มีอยู่ใน Netlify account นี้:

- Portal
  - site id: `dea3d0e9-d0aa-4998-a4b6-a691ee597029`
  - current url: `https://deluxe-panda-4b66fb.netlify.app`
- Finance
  - site id: `9d808032-df40-45e2-b23d-c77baeba4028`
  - current url: `https://effortless-eclair-c20651.netlify.app`
- Operation
  - site id: `3a661559-e197-4470-99e8-0ba7e4809e86`
  - current url: `https://onevela-cost.netlify.app`

## Cross-Link Injection

ใน publish bundles ได้ inject URL สำหรับ cross-links แล้วที่:

- `publish-main/assets/onevela-workbench.js`
- `publish-finance/assets/onevela-workbench.js`
- `publish-operation/assets/onevela-workbench.js`

ค่าที่ตั้งไว้ตอนนี้:

- portal/home → `https://deluxe-panda-4b66fb.netlify.app`
- finance → `https://effortless-eclair-c20651.netlify.app`
- operation → `https://onevela-cost.netlify.app`
- erp → `https://onevela-cost.netlify.app/erp-demo.html`

## Current Blocker

ลอง deploy ผ่าน Netlify MCP CLI bridge แล้ว แต่ติด:

- `404 Not Found` ระหว่าง upload ผ่าน proxy path

สิ่งที่ลองไปแล้ว:

- deploy จาก `deploy-*`
- deploy จาก `publish-*` ที่ลดขนาดแล้ว
- ลด asset bundle จากประมาณ 30MB เหลือประมาณ 4MB

สรุป: ตอนนี้ตัว public bundle พร้อม แต่ deployment ผ่าน proxy ยังไม่ผ่าน

## Next Best Resume Brief

`Use $onevela-module-split. Focus on Deploy Sync only. Read PUBLIC_SPLIT_STATUS.md and MODULE_SPLIT_STATUS.md first. Continue from publish-main, publish-finance, and publish-operation. Do not redesign pages. Solve Netlify publish for the 3 public apps and then verify cross-links. Preserve current worktree changes.`
