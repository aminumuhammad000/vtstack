#!/bin/bash
# ==============================================================================
# Install 24-Hour Midnight (12:00 AM) Database Backup Cron Job on VPS
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_LOG="$PROJECT_DIR/backups/cron.log"
CRON_SCHEDULE="0 0 * * *" # Every day at 12:00 AM (midnight)
CRON_CMD="cd $PROJECT_DIR && npm run backup >> $BACKUP_LOG 2>&1"
CRON_JOB="$CRON_SCHEDULE $CRON_CMD"

mkdir -p "$PROJECT_DIR/backups"

# Check if already installed in crontab
crontab -l 2>/dev/null | grep -F "npm run backup" >/dev/null
if [ $? -eq 0 ]; then
    echo "ℹ️  The daily 12:00 AM backup cron job is already registered in crontab."
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Successfully installed 24-hour daily backup cron job!"
    echo "⏰ Scheduled to run every day at 12:00 AM (00:00)."
fi

echo ""
echo "📋 Active Crontab Entries:"
crontab -l | grep "backup" || true
echo ""
echo "📁 Backups Directory: $PROJECT_DIR/backups"
echo "📄 Cron Execution Log: $BACKUP_LOG"
