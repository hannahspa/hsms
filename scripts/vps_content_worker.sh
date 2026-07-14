#!/usr/bin/env bash
# Worker máy đăng bài fanpage — bản gốc VPS: /root/hsms/bin/content-worker.sh
# Jobs: plan (AI lên ý tưởng) · draft (AI soạn caption → chờ duyệt) · publish (đăng bài đã duyệt đến giờ)
set -euo pipefail

JOB="${1:-draft}"
ENV_FILE="/root/supabase/docker/.env"
API="https://api.hannahspa.vn/functions/v1"
LOCK_FILE="/tmp/hsms-content-${JOB}.lock"

ts() { date '+%Y-%m-%d %H:%M:%S%z'; }

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(ts) job=${JOB} skipped=locked"
  exit 0
fi

KEY="$(sed -n 's/^SERVICE_ROLE_KEY=//p' "$ENV_FILE" | tail -1)"
if [ -z "$KEY" ]; then
  echo "$(ts) job=${JOB} error=missing_service_key"
  exit 1
fi

case "$JOB" in
  plan)    FN="marketing-ai";             BODY='{"mode":"content_plan","source":"vps_cron"}' ;;
  draft)   FN="marketing-ai";             BODY='{"mode":"draft_content","source":"vps_cron"}' ;;
  publish) FN="marketing-meta-page-sync"; BODY='{"mode":"publish_due","source":"vps_cron"}' ;;
  *) echo "$(ts) job=${JOB} error=unknown_job"; exit 2 ;;
esac

echo "$(ts) job=${JOB} start"
curl -fsS -m 150 \
  -X POST "${API}/${FN}" \
  -H "Authorization: Bearer ${KEY}" \
  -H "apikey: ${KEY}" \
  -H 'Content-Type: application/json' \
  -d "$BODY"
echo
echo "$(ts) job=${JOB} done"
