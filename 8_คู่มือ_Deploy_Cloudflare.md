# คู่มือ Deploy บน Cloudflare Pages (เลิกใช้ Netlify)

อัปเดต: 2026-05-30

ระบบใช้ **Cloudflare Pages อย่างเดียว** — ตัด Netlify ออกแล้ว

## 3 แอป และ URL จริง

| แอป | Cloudflare Pages project | URL |
|-----|--------------------------|-----|
| Portal | `onevela-main-20260529` | https://onevela-main-20260529.pages.dev |
| Finance | `onevela-finance-ai-20260528` | https://onevela-finance-ai-20260528.pages.dev |
| Operation | `onevela-operation-20260529` | https://onevela-operation-20260529.pages.dev |

## 🔗 หน้าฮับรวมลิงก์ (ใหม่)

เปิดที่: **https://onevela-main-20260529.pages.dev/hub.html**

รวมทุกแดชบอร์ดทั้ง 3 แอปไว้หน้าเดียว แตะเปิดได้เลย เหมาะกับมือถือ
ไฟล์: `hub.html` (root) — สำเนา deploy อยู่ที่ `publish-main/hub.html`

## วิธี Deploy ใหม่ — แก้ blocker 404 เดิม

เดิม deploy ผ่าน MCP proxy แล้วติด `404 Not Found` ตอน upload
ตอนนี้เปลี่ยนมาใช้ **GitHub Actions + wrangler** deploy ตรงเข้า Cloudflare แทน

### ตั้งครั้งเดียว: เพิ่ม 2 secrets ใน GitHub

ไปที่ repo → **Settings → Secrets and variables → Actions → New repository secret**

1. `CLOUDFLARE_API_TOKEN` — สร้างที่ Cloudflare dashboard → My Profile → API Tokens
   → ใช้ template **"Edit Cloudflare Workers"** หรือสิทธิ์ **Account → Cloudflare Pages → Edit**
2. `CLOUDFLARE_ACCOUNT_ID` — หาได้ที่หน้า Workers & Pages (มุมขวา) หรือใน URL ของ dashboard

### หลังตั้ง secret แล้ว

- **อัตโนมัติ:** ทุกครั้งที่ push แตะไฟล์ใน `publish-main/`, `publish-finance/`, `publish-operation/` บน branch `main` → deploy เฉพาะแอปนั้น
- **กดเอง:** แท็บ **Actions → Deploy Cloudflare Pages → Run workflow** → deploy ครบทั้ง 3

workflow: `.github/workflows/deploy-pages.yml`

## โครงสร้างไฟล์

- **source of truth** = ไฟล์ใน root (เช่น `home.html`, `operation.html`)
- `publish-main/`, `publish-finance/`, `publish-operation/` = bundle ที่ deploy จริง (ตัด Excel/doc/asset หนักออก)
- cross-link ระหว่างแอปฝังใน `publish-*/assets/onevela-workbench.js` → ใช้ URL `.pages.dev` ทั้งหมดแล้ว (ไม่มี netlify)

## หมายเหตุ

- ต้นทุนรายวัน (`index.html`) ยัง sync อัตโนมัติผ่าน `.github/workflows/cost-sync.yml` ทุก 30 นาที
- ถ้าเปลี่ยนหน้าใน root อย่าลืม sync เข้า `publish-*` ก่อน push เพื่อให้ตัว deploy ตรงกับ root
