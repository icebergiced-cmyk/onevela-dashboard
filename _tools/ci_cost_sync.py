#!/usr/bin/env python3
"""
CI helper — ใช้โดย GitHub Actions (.github/workflows/cost-sync.yml)

ขั้นตอน:
  1. เรียก Apps Script `listCostInbox` ดูไฟล์ Excel ต้นทุนใน Drive
  2. ประมวลผล "ทุกไฟล์" เรียงเก่า→ใหม่ (excel_to_dashboard.py ทำงานโหมด merge —
     ไฟล์รายวันจะสะสมเข้าข้อมูลเดิม ไม่ทับทิ้ง)
  3. ไฟล์ที่ประมวลผลสำเร็จ → mark done (ย้ายเข้า _done)

ทำไมต้องทุกไฟล์: excel_to_dashboard.py ทำงานแบบ merge ตาม (แปลง, วันที่)
ถ้าข้ามไฟล์เก่าไป ข้อมูลวันนั้นจะหาย — จึงต้องประมวลผลครบทุกไฟล์

exit 0 = สำเร็จ/ไม่มีงาน · exit 1 = ผิดพลาด (Action จะไม่ commit, retry รอบหน้า)
"""
import json, base64, sys, subprocess, urllib.request, urllib.parse
from pathlib import Path

API_URL  = 'https://script.google.com/macros/s/AKfycbzR-qHtv0GgHRVmon14YEPM_2XFACo2ZzdPTYc0UBLgAjPHYrr9FTt7L4B2xZVLAi1F/exec'
CI_TOKEN = 'onevela-ci-7f3a9k2x'   # ต้องตรงกับ CI_TOKEN ใน sales_api.gs

TOOLS = Path(__file__).resolve().parent
INBOX = TOOLS / 'inbox'


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

    # listCostInbox เรียงใหม่→เก่า · พลิกเป็นเก่า→ใหม่ เพื่อ merge ตามลำดับเวลา
    files = list(reversed(files))
    print(f'📋 พบ {len(files)} ไฟล์ — ประมวลผลเรียงเก่า→ใหม่ (โหมด merge)')
    INBOX.mkdir(exist_ok=True)

    done = 0
    for f in files:
        print(f"\n── {f['name']}  ({f['size']:,} bytes) ──")
        got = api('getCostInboxFile', fileId=f['id'])
        if not got.get('ok'):
            print('❌ ดาวน์โหลดไม่สำเร็จ:', got.get('error'))
            sys.exit(1)
        local = INBOX / f['name']
        local.write_bytes(base64.b64decode(got['base64']))

        r = subprocess.run([sys.executable, str(TOOLS / 'excel_to_dashboard.py'), str(local)])
        if r.returncode != 0:
            print(f"❌ ประมวลผล '{f['name']}' ไม่สำเร็จ (exit {r.returncode})")
            print('   หยุด — ไม่ mark done ไฟล์นี้ จะ retry รอบถัดไป')
            sys.exit(1)

        res = api('markCostInboxDone', fileId=f['id'])
        print(f"   📦 mark done: {'ok' if res.get('ok') else res.get('error')}")
        done += 1

    print(f"\n🎉 เสร็จสมบูรณ์ — ประมวลผล {done} ไฟล์ (merge เข้าข้อมูลสะสม)")


if __name__ == '__main__':
    main()
