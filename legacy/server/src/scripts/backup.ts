import { connectDatabase } from '../config/database';
import { backupService } from '../services/BackupService';

const runBackup = async () => {
    try {
        await connectDatabase();
        console.log('🚀 Starting 24-Hour Database Backup...');
        const result = await backupService.createAndUploadBackup();
        console.log('✅ Backup finished successfully!');
        console.log(`📁 Local zip path: ${result.zipPath}`);
        if (result.driveFileId) {
            console.log(`☁️ Uploaded to Google Drive with File ID: ${result.driveFileId}`);
        } else {
            console.log('ℹ️ Local backup saved (Google Drive credentials not configured or upload pending).');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Backup script error:', err);
        process.exit(1);
    }
};

runBackup();
