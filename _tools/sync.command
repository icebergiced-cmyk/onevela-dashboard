#!/bin/bash
# One Vela — Sync Excel ต้นทุน → Dashboard
# Double-click this file in Finder to run sync

set -u

# โฟลเดอร์ที่ไฟล์นี้อยู่ = _tools/
TOOLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_DIR="$(dirname "$TOOLS_DIR")"
INBOX_DIR="$TOOLS_DIR/inbox"
LOG_DIR="$TOOLS_DIR/.sync_log"
STATUS_JSON="$LOG_DIR/status.json"
PY_SCRIPT="$TOOLS_DIR/excel_to_dashboard.py"

mkdir -p "$INBOX_DIR" "$LOG_DIR"

NOW="$(date '+%Y-%m-%d %H:%M:%S')"
LOG_FILE="$LOG_DIR/sync-$(date '+%Y%m%d-%H%M%S').log"

# Banner
echo
echo "════════════════════════════════════════════════════════"
echo "  One Vela — Sync Excel ต้นทุน → Dashboard"
echo "  $NOW"
echo "════════════════════════════════════════════════════════"
echo

# Pick newest .xlsx in inbox (ignore lock/temp files starting with ~$)
NEWEST="$(ls -t "$INBOX_DIR"/*.xlsx 2>/dev/null | grep -v '/~\$' | head -1)"

if [ -z "$NEWEST" ]; then
  echo "❌ ไม่พบไฟล์ .xlsx ใน inbox"
  echo "   วางไฟล์ที่: $INBOX_DIR"
  echo
  open "$INBOX_DIR" 2>/dev/null || true
  read -p "กด Enter เพื่อปิดหน้าต่างนี้..." dummy
  exit 1
fi

echo "📄 ไฟล์: $(basename "$NEWEST")"
echo "📐 ขนาด: $(du -h "$NEWEST" | cut -f1)"
echo "🕐 แก้ไขล่าสุด: $(stat -f '%Sm' "$NEWEST" 2>/dev/null || stat -c '%y' "$NEWEST")"
echo

# Find python3
PY="$(command -v python3 || true)"
if [ -z "$PY" ]; then
  echo "❌ ไม่พบ python3 ในเครื่อง"
  echo "   ติดตั้งจาก https://www.python.org/downloads/ ก่อน"
  read -p "กด Enter เพื่อปิดหน้าต่างนี้..." dummy
  exit 1
fi

# Check openpyxl
if ! "$PY" -c "import openpyxl" 2>/dev/null; then
  echo "⚠ openpyxl ยังไม่ติดตั้ง — กำลัง pip install..."
  "$PY" -m pip install --user openpyxl 2>&1 | tail -5
  echo
fi

echo "🚀 รัน sync..."
echo "──────────────────────────────────────────────"
# Run and tee to log
if "$PY" "$PY_SCRIPT" "$NEWEST" 2>&1 | tee "$LOG_FILE"; then
  RESULT="success"
  echo "──────────────────────────────────────────────"
  echo "✅ เสร็จเรียบร้อย — เปิด index.html ใหม่ดูได้เลย"
else
  RESULT="error"
  echo "──────────────────────────────────────────────"
  echo "❌ เกิดข้อผิดพลาด — ดู log: $LOG_FILE"
fi

FILE_NAME="$(basename "$NEWEST")"

# ─── อัปขึ้นออนไลน์ (GitHub → Cloudflare auto-deploy) ───
if [ "$RESULT" = "success" ]; then
  echo
  echo "🌐 อัปขึ้นออนไลน์ (Cloudflare)..."
  GH_BIN="$HOME/ghcli/gh"
  REPO_URL_BASE="github.com/icebergiced-cmyk/onevela-dashboard.git"
  if ! command -v git >/dev/null 2>&1; then
    echo "   ⚠️  ไม่พบ git ในเครื่อง — ข้ามการอัปออนไลน์ (ไฟล์ในเครื่องอัปเดตแล้ว)"
  elif [ ! -d "$DASHBOARD_DIR/.git" ]; then
    echo "   ⚠️  โฟลเดอร์นี้ไม่ใช่ git repo — ข้ามการอัปออนไลน์"
  else
    ( cd "$DASHBOARD_DIR" || exit 1
      if git diff --quiet index.html 2>/dev/null; then
        echo "   ℹ️  index.html ไม่มีการเปลี่ยนแปลง — ไม่ต้อง push"
      else
        git commit index.html -m "sync: อัปเดตข้อมูลต้นทุนจาก $FILE_NAME ($NOW)" >/dev/null 2>&1
        TOKEN=""
        [ -x "$GH_BIN" ] && TOKEN="$("$GH_BIN" auth token 2>/dev/null)"
        if [ -n "$TOKEN" ]; then
          PUSH_URL="https://x-access-token:${TOKEN}@${REPO_URL_BASE}"
        else
          PUSH_URL=""  # ลอง push ด้วย credential ที่ตั้งไว้ในเครื่อง
        fi
        if [ -n "$PUSH_URL" ]; then
          PUSH_OK=$(git push "$PUSH_URL" HEAD:main >/dev/null 2>&1 && echo yes || echo no)
        else
          PUSH_OK=$(git push origin HEAD:main >/dev/null 2>&1 && echo yes || echo no)
        fi
        if [ "$PUSH_OK" = "yes" ]; then
          echo "   ✅ อัปขึ้นออนไลน์แล้ว — Cloudflare จะ deploy ใน 1-2 นาที"
          echo "   🔗 https://onevela-dashboard.iceberg-iced.workers.dev/"
        else
          echo "   ⚠️  push ไม่สำเร็จ — commit ไว้ในเครื่องแล้ว"
          echo "      ลองสั่ง push เองภายหลังด้วย:  cd \"$DASHBOARD_DIR\" && git push"
        fi
      fi
    )
  fi
fi

# Update status.json (เพื่อให้ Cowork artifact อ่านได้)
ISO_NOW="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
# ใช้ python เขียน JSON เพื่อเลี่ยง escape headache
"$PY" - <<PYEOF
import json, os
status_path = "$STATUS_JSON"
try:
    with open(status_path) as f: s = json.load(f)
except: s = {"last_sync": None, "last_file": None, "last_result": None, "history": []}
entry = {"at": "$ISO_NOW", "file": "$FILE_NAME", "result": "$RESULT"}
s["last_sync"] = entry["at"]
s["last_file"] = entry["file"]
s["last_result"] = entry["result"]
hist = s.get("history", [])
hist.insert(0, entry)
s["history"] = hist[:20]
with open(status_path, "w") as f: json.dump(s, f, indent=2, ensure_ascii=False)
print("📝 status.json updated")
PYEOF

echo
read -p "กด Enter เพื่อปิดหน้าต่างนี้..." dummy
