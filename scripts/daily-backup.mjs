#!/usr/bin/env node
/**
 * VTStack 24-Hour Midnight Database Backup Script
 * Dumps all Supabase tables, local state, and creates a compressed .tar.gz archive in backups/
 *
 * Can be run manually or via OS crontab:
 *   0 0 * * * cd /path/to/vtstack && npm run backup >> backups/cron.log 2>&1
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execPromise = promisify(exec);

// 1. Resolve Environment Variables
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  parseAndSetEnv(envContent);
} else if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  parseAndSetEnv(envContent);
}

function parseAndSetEnv(content) {
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env.local or .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function fetchAllRows(tableName) {
  const allRows = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to);

    if (error) throw new Error(error.message);

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

async function runBackup() {
  const startTime = Date.now();
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const dateStr = now.toISOString().split('T')[0];
  const backupId = `vtstack-backup-${timestamp}`;
  const archiveName = `${backupId}.tar.gz`;

  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const tempDumpDir = path.join(backupDir, `temp-${backupId}`);
  if (!fs.existsSync(tempDumpDir)) {
    fs.mkdirSync(tempDumpDir, { recursive: true });
  }

  console.log('================================================================');
  console.log(`  VTSTACK 24-HOUR DATABASE BACKUP (${now.toLocaleString()})`);
  console.log(`  Target Directory: ${backupDir}`);
  console.log('================================================================\n');

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

  const summary = {};
  let totalRecords = 0;

  for (const table of tablesToDump) {
    process.stdout.write(`  📦 Backing up table: ${table.padEnd(24)} `);
    try {
      const rows = await fetchAllRows(table);
      const jsonContent = JSON.stringify(rows, null, 2);
      fs.writeFileSync(path.join(tempDumpDir, `${table}.json`), jsonContent, 'utf8');

      summary[table] = {
        rowCount: rows.length,
        byteSize: Buffer.byteLength(jsonContent, 'utf8'),
        status: 'SUCCESS'
      };
      totalRecords += rows.length;
      console.log(`✅ [${rows.length.toString().padStart(4)} rows]`);
    } catch (err) {
      summary[table] = {
        rowCount: 0,
        byteSize: 0,
        status: 'SKIPPED',
        error: err.message
      };
      console.log(`⚠️ (Skipped: ${err.message})`);
    }
  }

  // Back up local persistent data (.data/) if exists
  const localDataDir = path.join(process.cwd(), '.data');
  if (fs.existsSync(localDataDir)) {
    const destLocalDir = path.join(tempDumpDir, 'local_data');
    fs.mkdirSync(destLocalDir, { recursive: true });
    const files = fs.readdirSync(localDataDir);
    for (const f of files) {
      const src = path.join(localDataDir, f);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(destLocalDir, f));
      }
    }
    console.log(`  📂 Local persistent data (.data/) included.`);
  }

  // Write manifest metadata
  const archivePath = path.join(backupDir, archiveName);
  const metadata = {
    id: backupId,
    filename: archiveName,
    createdAt: now.toISOString(),
    date: dateStr,
    totalTables: Object.keys(summary).length,
    totalRecords,
    destination: `VPS Local Storage: ${archivePath}`,
    remoteUploadStatus: 'PENDING_CONFIGURATION',
    remoteStorageNote: 'Local VPS backup completed. Ready for future remote storage destination.',
    tables: summary
  };

  fs.writeFileSync(path.join(tempDumpDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

  // Compress
  process.stdout.write('\n  🗜️  Compressing archive with tar -czf... ');
  try {
    await execPromise(`tar -czf "${archivePath}" -C "${backupDir}" "temp-${backupId}"`);
    console.log('✅ Done!');
  } finally {
    if (fs.existsSync(tempDumpDir)) {
      fs.rmSync(tempDumpDir, { recursive: true, force: true });
    }
  }

  // Hash & file size
  const fileBuffer = fs.readFileSync(archivePath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const sizeFormatted = formatBytes(fileBuffer.length);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  metadata.checksumSha256 = hash;
  metadata.fileSizeBytes = fileBuffer.length;
  metadata.fileSizeFormatted = sizeFormatted;
  metadata.durationSeconds = duration;

  fs.writeFileSync(path.join(backupDir, `${backupId}.meta.json`), JSON.stringify(metadata, null, 2), 'utf8');

  // Retention cleanup (30 days default)
  const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  const allFiles = fs.readdirSync(backupDir);
  for (const f of allFiles) {
    if (f.endsWith('.tar.gz') || f.endsWith('.meta.json')) {
      const p = path.join(backupDir, f);
      const st = fs.statSync(p);
      if (Date.now() - st.mtimeMs > maxAgeMs) {
        fs.unlinkSync(p);
        console.log(`  🧹 Removed expired backup (> ${retentionDays} days): ${f}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log(`  🎉 BACKUP GENERATED SUCCESSFULLY`);
  console.log(`  File:      ${archivePath}`);
  console.log(`  Size:      ${sizeFormatted}`);
  console.log(`  Records:   ${totalRecords} total across all tables`);
  console.log(`  SHA-256:   ${hash}`);
  console.log(`  Duration:  ${duration}s`);
  console.log('================================================================\n');

  // Check if remote upload hook is configured
  if (process.env.REMOTE_BACKUP_WEBHOOK_URL) {
    try {
      console.log(`  ☁️  Notifying remote destination: ${process.env.REMOTE_BACKUP_WEBHOOK_URL}`);
      await fetch(process.env.REMOTE_BACKUP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'backup.completed', backup: metadata })
      });
      console.log('  ✅ Remote notification dispatched successfully.');
    } catch (e) {
      console.warn(`  ⚠️ Remote notification error: ${e.message}`);
    }
  } else {
    console.log('  ℹ️  Remote destination not yet configured. Archive saved locally on VPS.');
  }

  process.exit(0);
}

runBackup().catch(err => {
  console.error('\n❌ Fatal backup error:', err);
  process.exit(1);
});
