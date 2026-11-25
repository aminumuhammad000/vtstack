import { backupService } from './backupService';

let schedulerTimer: NodeJS.Timeout | null = null;
let isBackupRunning = false;

/**
 * Calculates milliseconds until the next 12:00 AM (midnight)
 */
export function getMsUntilNextMidnight(targetHour: number = 0, targetMinute: number = 0): number {
  const now = new Date();
  const next = new Date(now);

  next.setHours(targetHour, targetMinute, 0, 0);

  // If target time has already passed today, advance to tomorrow
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Run the daily backup with lock and error handling
 */
export async function executeScheduledBackup() {
  if (isBackupRunning) {
    console.warn('[BackupScheduler] A backup is already in progress. Skipping concurrent run.');
    return;
  }

  isBackupRunning = true;
  try {
    console.log(`[BackupScheduler] ⏰ Midnight daily backup trigger started at ${new Date().toISOString()}`);
    const metadata = await backupService.createBackup();
    console.log(`[BackupScheduler] 🎉 Daily backup generated successfully: ${metadata.filename}`);
  } catch (error: any) {
    console.error('[BackupScheduler] ❌ Daily backup encountered an error:', error);
  } finally {
    isBackupRunning = false;
  }
}

/**
 * Initialize 24-hour midnight schedule (around 12:00 AM every day)
 */
export function startDailyBackupScheduler(targetHour: number = 0, targetMinute: number = 0) {
  if (schedulerTimer) {
    console.log('[BackupScheduler] Scheduler is already active.');
    return;
  }

  const msUntilMidnight = getMsUntilNextMidnight(targetHour, targetMinute);
  const nextRunDate = new Date(Date.now() + msUntilMidnight);

  console.log(
    `[BackupScheduler] 🛡️ Daily backup scheduler armed. Next backup will run at 12:00 AM: ${nextRunDate.toLocaleString()} (in ${Math.round(msUntilMidnight / 60000)} minutes)`
  );

  schedulerTimer = setTimeout(async () => {
    await executeScheduledBackup();
    // After the first midnight execution, repeat every 24 hours
    schedulerTimer = setInterval(async () => {
      await executeScheduledBackup();
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
}

/**
 * Stop the scheduler
 */
export function stopDailyBackupScheduler() {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    clearInterval(schedulerTimer as any);
    schedulerTimer = null;
    console.log('[BackupScheduler] Daily backup scheduler stopped.');
  }
}
