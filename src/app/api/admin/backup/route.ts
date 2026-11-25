import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import backupService from '@/lib/backup/backupService';
import fs from 'fs';

/**
 * GET /api/admin/backup
 * Lists all backups on the VPS or downloads a specific archive if ?download=<filename> is provided.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const downloadFile = searchParams.get('download');

    if (downloadFile) {
      const filePath = backupService.getBackupFilePath(downloadFile);
      if (!filePath) {
        return NextResponse.json({ success: false, message: 'Backup file not found' }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${downloadFile}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }

    const backups = backupService.listBackups();
    return NextResponse.json({
      success: true,
      data: {
        total: backups.length,
        backups,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to list backups' }, { status: 500 });
  }
}

/**
 * POST /api/admin/backup
 * Triggers an immediate full database backup and saves the archive to the VPS backups directory.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const metadata = await backupService.createBackup();

    return NextResponse.json({
      success: true,
      message: 'System database backup generated successfully',
      data: metadata,
    });
  } catch (error: any) {
    console.error('[API Admin Backup Error]:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to generate backup' }, { status: 500 });
  }
}
