#!/usr/bin/env python3
"""
CI helper — ใช้โดย GitHub Actions (.github/workflows/cost-sync.yml)

ขั้นตอน:
  1. เรียก Apps Script `listCostInbox` ดูว่ามีไฟล์ Excel ต้นทุนใหม่ใน Drive ไหม
  2. ถ้ามี — ดาวน์โหลดไฟล์ใหม่สุด (`getCostInboxFile`) มาเก็บที่ _tools/inbox/
  3. รัน excel_to_dashboard.py → อัปเดต index.html
  4. ถ้า index.html เปลี่ยนจริง — mark ไฟล์ทุกไฟล์ใน inbox เป็น done (ย้ายเข้า _done)
     (แต่ละไฟล์เป็น snapshot เต็ม ไฟล์ใหม่สุด supersede ไฟล์เก่า — กันประมวลผลย้อน)

exit 0 = สำเร็จ หรือไม่มีงาน · exit 1 = ผิดพลาด (Action จะไม่ commit, retry รอบหน้า)
"""
import json, base64, sys, subprocess, urllib.request, urllib.parse
from pathlib import Path

API_URL  = 'https://script.google.com/macros/s/AKfycbzR-qHtv0GgHRVmon14YEPM_2XFACo2ZzdPTYc0UBLgAjPHYrr9FTt7L4B2xZVLAi1F/exec'
CI_TOKEN = 'onevela-ci-7f3a9k2x'   # ต้องตรงกับ CI_TOKEN ใน sales_api.gs

TOOLS     = Path(__file__).resolve().parent
DASHBOARD = TOOLS.parent
INBOX     = TOOLS / 'inbox'
INDEX     = DASHBOARD / 'index.html'


def api(action, **params):
    """เรียก Apps Script Web App (GET) — ตาม redirect อัตโนมัติ"""
    params['action'] = action
    params['token']  = CI_TOKEN
    url = API_URL + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'onevela-ci'})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode('utf-8'))


def main():
    print('🔍 ตรวจ inbox บน Drive...')
    lst = api('listCostInbox')
    if not lst.get('ok'):
        print('❌ listCostInbox ล้มเหลว:', lst.get('error'))
        sys.exit(1)

    files = lst.get('files', [])
    if not files:
        print('✅ ไม่มีไฟล์ใหม่ — ไม่ต้องทำอะไร')
        return

    newest = files[0]   # listCostInbox เรียงใหม่สุดก่อนแล้ว
    print(f"📄 ไฟล์ใหม่สุด: {newest['name']}  ({newest['size']:,} bytes)")
    if len(files) > 1:
        print(f"   (มีอีก {len(files)-1} ไฟล์เก่ากว่า — จะ mark done ทั้งหมดหลังประมวลผล)")

    got = api('getCostInboxFile', fileId=newest['id'])
    if not got.get('ok'):
        print('❌ getCostInboxFile ล้มเหลว:', got.get('error'))
        sys.exit(1)

    INBOX.mkdir(exist_ok=True)
    local = INBOX / newest['name']
    local.write_bytes(base64.b64decode(got['base64']))
    print(f"⬇️  ดาวน์โหลดแล้ว: {local.name}")

    # snapshot index.html ก่อน เพื่อเช็คว่าประมวลผลสำเร็จจริง
    before = INDEX.read_bytes() if INDEX.exists() else b''

    print('🚀 รัน excel_to_dashboard.py ...')
    subprocess.run([sys.executable, str(TOOLS / 'excel_to_dashboard.py'), str(local)])

    after = INDEX.read_bytes() if INDEX.exists() else b''
    if after == before:
        print('❌ index.html ไม่เปลี่ยนแปลง — การประมวลผลอาจล้มเหลว (ไม่ mark done, retry รอบหน้า)')
        sys.exit(1)

    print('✅ index.html อัปเดตแล้ว')

    # mark ทุกไฟล์ใน inbox เป็น done (ไฟล์ใหม่สุด supersede ของเก่า)
    for f in files:
        res = api('markCostInboxDone', fileId=f['id'])
        print(f"   📦 mark done: {f['name']} → {'ok' if res.get('ok') else res.get('error')}")

    print('🎉 เสร็จสมบูรณ์')


if __name__ == '__main__':
    main()
