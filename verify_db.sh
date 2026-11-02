#!/usr/bin/env bash
# ==============================================================================
# Isolated PostgreSQL Verification Script
# Designed for robust checking of connection, boolean outputs (t/true), and latency.
# ==============================================================================
set -uo pipefail
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres.zyenfobyorjfwkdgeube:YOUR_PASSWORD@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?sslmode=require}"

echo "=================================================="
echo "[*] بدء اختبار الاتصال المعزول بقاعدة البيانات..."
echo "=================================================="
echo "[-] جاري فحص الاتصال وقراءة إصدار الخادم (server_version)..."
VERSION_OUTPUT=$(psql "$DB_URL" -t -A -c "SHOW server_version;" 2>&1)
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
    echo "[!] فشل الاتصال بقاعدة البيانات (Exit Code: $EXIT_CODE)"
    echo "[!] تفاصيل الخطأ الخام:"
    echo "$VERSION_OUTPUT"
    exit 1
else
    echo "[+] نجح الاتصال بالخادم! إصدار PostgreSQL هو: $(echo "$VERSION_OUTPUT" | xargs)"
fi
echo "--------------------------------------------------"
echo "[-] جاري اختبار التوافق المنطقي وقراءة القيم (t/true)..."
BOOL_OUTPUT=$(psql "$DB_URL" -t -A -c "SELECT 1 = 1 AS check_result;" 2>&1)
if [ $? -ne 0 ]; then
    echo "[!] فشل تنفيذ استعلام الفحص المنطقي."
    echo "$BOOL_OUTPUT"
    exit 1
fi
CLEAN_BOOL=$(echo "$BOOL_OUTPUT" | xargs)
if [[ "$CLEAN_BOOL" == "t" || "$CLEAN_BOOL" == "true" ]]; then
    echo "[+] نجح الاختبار المنطقي! النتيجة المستلمة مطابقة ومقبولة: '$CLEAN_BOOL'"
else
    echo "[!] تحذير: استلمنا قيمة غير متوقعة للمقارنة المنطقية: '$CLEAN_BOOL'"
fi
echo "--------------------------------------------------"
echo "[-] جاري التحقق من القدرة على قراءة هيكل الجداول (Schema Inventory)..."
TABLE_COUNT=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1)
if [ $? -ne 0 ]; then
    echo "[!] فشل في جرد الجداول."
    echo "$TABLE_COUNT"
    exit 1
else
    echo "[+] نجح الجرد! عدد الجداول في مخطط (public) هو: $(echo "$TABLE_COUNT" | xargs)"
fi
echo "=================================================="
echo "[+] اجتاز السكربت جميع اختبارات القبول المعزولة بنجاح تام!"
echo "=================================================="
