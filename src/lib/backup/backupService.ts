import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { supabaseAdmin } from '../supabase/server';
import db from '../db';

const execPromise = promisify(exec);

export interface BackupTableSummary {
  tableName: string;
  rowCount: number;
  byteSize: number;
  status: 'SUCCESS' | 'EMPTY' | 'SKIPPED' | 'FAILED';
  error?: string;
}

export interface BackupMetadata {
  id: string;
  filename: string;
  filePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  createdAt: string;
  date: string;
  durationMs: number;
  totalTables: number;
  totalRecords: number;
  checksumSha256: string;
  destination: string;
  remoteUploadStatus: 'PENDING_CONFIGURATION' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  remoteStorageNote: string;
  tables: Record<string, BackupTableSummary>;
}

export interface BackupListItem {
  filename: string;
  filePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  createdAt: string;
  metadata?: Partial<BackupMetadata>;
}

export class BackupService {
  private backupDir: string;
  private retentionDays: number;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
  }

  /**
   * Helper to format bytes into readable KB/MB/GB
   */
  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Fetch all records from a Supabase table with automatic pagination
   */
  private async fetchAllSupabaseRows(tableName: string): Promise<any[]> {
    const allRows: any[] = [];
    const pageSize = 1000;
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .range(from, to);

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.length > 0) {
        allRows.push(...data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    return allRows;
  }

  /**
   * Generate a complete backup of all database tables and local state.
   * Compresses the dump into a timestamped .tar.gz archive in the VPS backups directory.
   */
  public async createBackup(): Promise<BackupMetadata> {
    const startTime = Date.now();
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const dateStr = now.toISOString().split('T')[0];
    const backupId = `vtstack-backup-${timestamp}`;
    const archiveName = `${backupId}.tar.gz`;

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const tempDumpDir = path.join(this.backupDir, `temp-${backupId}`);
    if (!fs.existsSync(tempDumpDir)) {
      fs.mkdirSync(tempDumpDir, { recursive: true });
    }

    const tablesToDump = [
      'users',
      'wallets',
      'virtual_accounts',
      'transactions',
      'payouts',
      'notifications',
      'system_settings',
      'fee_rules',
      'risk_rules',
      'disputes',
      'help_messages',
      'admin_logs',
      'audit_logs',
      'webhook_logs',
      'ledgers',
      'parent_account_ledgers',
    ];

    const tablesSummary: Record<string, BackupTableSummary> = {};
    let totalRecordsCount = 0;

    console.log(`[BackupService] 🚀 Starting daily database backup: ${backupId}`);

    // 1. Dump Supabase tables
    for (const tableName of tablesToDump) {
      try {
        const rows = await this.fetchAllSupabaseRows(tableName);
        const jsonContent = JSON.stringify(rows, null, 2);
        const filePath = path.join(tempDumpDir, `${tableName}.json`);
        fs.writeFileSync(filePath, jsonContent, 'utf8');

        const byteSize = Buffer.byteLength(jsonContent, 'utf8');
        tablesSummary[tableName] = {
          tableName,
          rowCount: rows.length,
          byteSize,
          status: rows.length > 0 ? 'SUCCESS' : 'EMPTY',
        };
        totalRecordsCount += rows.length;
      } catch (err: any) {
        // Fallback: check if local db has in-memory / local fallback data for this table
        let fallbackRows: any[] = [];
        try {
          if (tableName === 'users') fallbackRows = Array.from((db as any).store?.users?.values?.() || []);
          if (tableName === 'wallets') fallbackRows = Array.from((db as any).store?.wallets?.values?.() || []);
          if (tableName === 'virtual_accounts') fallbackRows = Array.from((db as any).store?.virtualAccounts?.values?.() || []);
          if (tableName === 'transactions') fallbackRows = Array.from((db as any).store?.transactions?.values?.() || []);
          if (tableName === 'payouts') fallbackRows = Array.from((db as any).store?.payouts?.values?.() || []);
          if (tableName === 'notifications') fallbackRows = (db as any).store?.userNotifications || [];
        } catch {}

        if (fallbackRows.length > 0) {
          const jsonContent = JSON.stringify(fallbackRows, null, 2);
          fs.writeFileSync(path.join(tempDumpDir, `${tableName}.json`), jsonContent, 'utf8');
          tablesSummary[tableName] = {
            tableName,
            rowCount: fallbackRows.length,
            byteSize: Buffer.byteLength(jsonContent, 'utf8'),
            status: 'SUCCESS',
            error: `Supabase skipped (${err.message}), backed up from local fallback store.`,
          };
          totalRecordsCount += fallbackRows.length;
        } else {
          tablesSummary[tableName] = {
            tableName,
            rowCount: 0,
            byteSize: 0,
            status: 'SKIPPED',
            error: err.message,
          };
        }
      }
    }

    // 2. Dump local persistent directory (.data/) if it exists
    const localDataDir = path.join(process.cwd(), '.data');
    if (fs.existsSync(localDataDir)) {
      const destLocalDir = path.join(tempDumpDir, 'local_data');
      fs.mkdirSync(destLocalDir, { recursive: true });
      const dataFiles = fs.readdirSync(localDataDir);
      for (const file of dataFiles) {
        const srcFile = path.join(localDataDir, file);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, path.join(destLocalDir, file));
        }
      }
    }

    // 3. Write metadata.json
    const archivePath = path.join(this.backupDir, archiveName);
    const preMetadata = {
      id: backupId,
      filename: archiveName,
      createdAt: now.toISOString(),
      date: dateStr,
      totalTables: Object.keys(tablesSummary).length,
      totalRecords: totalRecordsCount,
      tables: tablesSummary,
    };
    fs.writeFileSync(
      path.join(tempDumpDir, 'metadata.json'),
      JSON.stringify(preMetadata, null, 2),
      'utf8'
    );

    // 4. Compress to .tar.gz using native Linux tar (with zlib gzip)
    try {
      await execPromise(
        `tar -czf "${archivePath}" -C "${this.backupDir}" "temp-${backupId}"`
      );
    } catch (tarErr: any) {
      console.error('[BackupService] tar -czf command failed:', tarErr);
      throw new Error(`Failed to compress backup archive: ${tarErr.message}`);
    } finally {
      // 5. Remove temporary dump directory
      if (fs.existsSync(tempDumpDir)) {
        fs.rmSync(tempDumpDir, { recursive: true, force: true });
      }
    }

    // 6. Calculate checksum & file size
    const fileBuffer = fs.readFileSync(archivePath);
    const checksumSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const fileSizeBytes = fileBuffer.length;
    const durationMs = Date.now() - startTime;

    const fullMetadata: BackupMetadata = {
      id: backupId,
      filename: archiveName,
      filePath: archivePath,
      fileSizeBytes,
      fileSizeFormatted: this.formatBytes(fileSizeBytes),
      createdAt: now.toISOString(),
      date: dateStr,
      durationMs,
      totalTables: Object.keys(tablesSummary).length,
      totalRecords: totalRecordsCount,
      checksumSha256,
      destination: `VPS Local Storage: ${archivePath}`,
      remoteUploadStatus: 'PENDING_CONFIGURATION',
      remoteStorageNote: 'Local VPS backup completed. Ready for future remote storage destination.',
      tables: tablesSummary,
    };

    // Save individual metadata manifest beside the archive
    fs.writeFileSync(
      path.join(this.backupDir, `${backupId}.meta.json`),
      JSON.stringify(fullMetadata, null, 2),
      'utf8'
    );

    console.log(
      `[BackupService] ✅ Backup completed successfully in ${durationMs}ms: ${archiveName} (${this.formatBytes(fileSizeBytes)}, ${totalRecordsCount} records)`
    );

    // 7. Trigger the remote upload hook (ready for when user introduces cloud/remote storage)
    await this.uploadToRemoteStorage(fullMetadata);

    // 8. Clean up backups older than retention days
    this.cleanOldBackups(this.retentionDays);

    return fullMetadata;
  }

  /**
   * Extension Hook: Plug in future remote storage (Google Drive, S3, Azure, or remote server).
   * When you are ready to introduce where to save the backup every day, implement the logic here.
   */
  public async uploadToRemoteStorage(backup: BackupMetadata): Promise<void> {
    // Check if custom remote backup webhook or script is configured in env
    const remoteWebhookUrl = process.env.REMOTE_BACKUP_WEBHOOK_URL;

    if (remoteWebhookUrl) {
      try {
        console.log(`[BackupService] Notifying remote backup endpoint: ${remoteWebhookUrl}`);
        await fetch(remoteWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'backup.completed',
            backup: {
              id: backup.id,
              filename: backup.filename,
              fileSizeFormatted: backup.fileSizeFormatted,
              totalRecords: backup.totalRecords,
              checksumSha256: backup.checksumSha256,
              createdAt: backup.createdAt,
            },
          }),
        });
      } catch (err: any) {
        console.warn(`[BackupService] Remote backup webhook notification failed: ${err.message}`);
      }
    } else {
      console.log(
        '[BackupService] ℹ️ Remote storage destination not yet configured. Backup safely stored on VPS.'
      );
    }
  }

  /**
   * List all available backups on the VPS
   */
  public listBackups(): BackupListItem[] {
    if (!fs.existsSync(this.backupDir)) return [];

    const files = fs.readdirSync(this.backupDir);
    const backupFiles = files.filter(f => f.endsWith('.tar.gz') || f.endsWith('.zip'));

    const items: BackupListItem[] = [];

    for (const filename of backupFiles) {
      const filePath = path.join(this.backupDir, filename);
      try {
        const stats = fs.statSync(filePath);
        const metaPath = path.join(this.backupDir, filename.replace(/\.(tar\.gz|zip)$/, '.meta.json'));
        let metadata: Partial<BackupMetadata> | undefined;

        if (fs.existsSync(metaPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          } catch {}
        }

        items.push({
          filename,
          filePath,
          fileSizeBytes: stats.size,
          fileSizeFormatted: this.formatBytes(stats.size),
          createdAt: stats.mtime.toISOString(),
          metadata,
        });
      } catch {}
    }

    // Sort newest first
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Safely get absolute path to a specific backup file preventing path traversal
   */
  public getBackupFilePath(filename: string): string | null {
    const sanitized = path.basename(filename);
    const resolvedPath = path.join(this.backupDir, sanitized);
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      return resolvedPath;
    }
    return null;
  }

  /**
   * Delete backups older than specified days
   */
  public cleanOldBackups(retentionDays: number = 30): void {
    if (!fs.existsSync(this.backupDir)) return;

    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith('.tar.gz') || file.endsWith('.zip') || file.endsWith('.meta.json')) {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            console.log(`[BackupService] Removing expired backup (> ${retentionDays}d): ${file}`);
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (e: any) {
      console.error('[BackupService] Error during old backups cleanup:', e.message);
    }
  }
}

export const backupService = new BackupService();
export default backupService;
