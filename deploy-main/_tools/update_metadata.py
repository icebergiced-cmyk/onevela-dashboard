"""
update_metadata.py — แก้ไขข้อมูลแปลง (สถานะขาย, ราคา, บ้านเลขที่, ฯลฯ)

ใช้สำหรับเรื่องที่ "ไม่ได้มาจาก Excel ของ Ecount" เช่น:
  - สถานะการขาย (ว่าง / จอง / สัญญา / ขายดาวน์ / โอนแล้ว)
  - ราคาขายสุทธิ (ถ้ามีการเจรจาส่วนลด)
  - บ้านเลขที่ใหม่ที่ได้รับจากกรมที่ดิน
  - หมายเหตุ

วิธีใช้ — 2 รูปแบบ:

A) Command line (ทีละแปลง):
   python3 update_metadata.py 5 status=สัญญา
   python3 update_metadata.py 12 status=โอนแล้ว priceNet=4100000
   python3 update_metadata.py 7 note="ลูกค้าขอแก้ floorplan"

B) Batch จาก Excel (หลายแปลงพร้อมกัน):
   python3 update_metadata.py --batch updates.xlsx
   (Excel ที่มี column: plot, status, priceNet, houseNo, note, ...)

หลังแก้แล้ว ต้องรัน excel_to_dashboard.py อีกครั้งเพื่อ rebuild HTML.
"""
import json
import sys
from pathlib import Path

TOOLS_DIR = Path(__file__).parent
METADATA_JSON = TOOLS_DIR / 'plots_metadata.json'

# Fields ที่อนุญาตให้แก้ไข + type validator
ALLOWED_FIELDS = {
    'status': (str, ['ว่าง', 'จอง', 'สัญญา', 'ขายดาวน์', 'โอนแล้ว']),
    'houseNo': (str, None),
    'deed': (str, None),
    'priceStart': (float, None),
    'priceDiff': (float, None),
    'priceNet': (float, None),
    'apprSCB': (float, None),
    'area': (float, None),
    'areaAdd': (float, None),
    'note': (str, None),
}


def update_one(meta, plot_num, updates):
    plot_index = None
    for i, p in enumerate(meta['houses_metadata']):
        if p['plot'] == plot_num:
            plot_index = i
            break
    if plot_index is None:
        print(f"  ❌ Plot {plot_num} not found")
        return False

    plot = meta['houses_metadata'][plot_index]
    changes = []
    for k, v in updates.items():
        if k not in ALLOWED_FIELDS:
            print(f"  ⚠ Field '{k}' not allowed (skip)")
            continue
        type_fn, valid_values = ALLOWED_FIELDS[k]
        try:
            v_typed = type_fn(v) if v not in ('', None) else None
        except ValueError:
            print(f"  ❌ Field '{k}' invalid type: {v!r}")
            continue
        if valid_values and v_typed not in valid_values:
            print(f"  ❌ Field '{k}' invalid value: {v_typed!r}. Must be one of {valid_values}")
            continue
        old = plot.get(k)
        plot[k] = v_typed
        changes.append(f"{k}: {old!r} → {v_typed!r}")
    if changes:
        print(f"  ✓ Plot {plot_num}: " + "; ".join(changes))
        return True
    return False


def parse_kv(args):
    """['status=สัญญา', 'priceNet=4100000'] → {'status': 'สัญญา', 'priceNet': '4100000'}"""
    out = {}
    for a in args:
        if '=' not in a:
            print(f"  ⚠ Argument '{a}' missing '=' (skip)")
            continue
        k, v = a.split('=', 1)
        # Strip quotes
        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
            v = v[1:-1]
        out[k] = v
    return out


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)

    meta = json.loads(METADATA_JSON.read_text(encoding='utf-8'))
    changed = 0

    if args[0] == '--batch':
        if len(args) < 2:
            print("Usage: --batch <excel-file>")
            sys.exit(1)
        import openpyxl
        wb = openpyxl.load_workbook(args[1], data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            print("Empty Excel")
            sys.exit(1)
        headers = [str(h).strip() if h else '' for h in rows[0]]
        plot_col = headers.index('plot') if 'plot' in headers else None
        if plot_col is None:
            print("❌ Excel ต้องมี column 'plot'")
            sys.exit(1)
        for row in rows[1:]:
            if not row[plot_col]:
                continue
            try:
                plot_num = int(row[plot_col])
            except (TypeError, ValueError):
                continue
            updates = {}
            for i, h in enumerate(headers):
                if h and h != 'plot' and row[i] not in (None, ''):
                    updates[h] = row[i]
            if updates and update_one(meta, plot_num, updates):
                changed += 1
    else:
        # CLI form: plot_num field1=val1 field2=val2 ...
        try:
            plot_num = int(args[0])
        except ValueError:
            print(f"❌ First arg must be plot number, got: {args[0]}")
            sys.exit(1)
        updates = parse_kv(args[1:])
        if update_one(meta, plot_num, updates):
            changed += 1

    if changed:
        METADATA_JSON.write_text(
            json.dumps(meta, ensure_ascii=False, indent=2),
            encoding='utf-8'
        )
        print(f"\n✅ Saved {changed} plot(s) to plots_metadata.json")
        print("   ⚠ ต้องรัน excel_to_dashboard.py อีกครั้งเพื่อ rebuild HTML")
    else:
        print("\n(ไม่มีการเปลี่ยนแปลง)")


if __name__ == '__main__':
    main()
