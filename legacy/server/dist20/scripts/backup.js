"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const BackupService_1 = require("../services/BackupService");
const runBackup = async () => {
    try {
        await (0, database_1.connectDatabase)();
        console.log('🚀 Starting 24-Hour Database Backup...');
        const result = await BackupService_1.backupService.createAndUploadBackup();
        console.log('✅ Backup finished successfully!');
        console.log(`📁 Local zip path: ${result.zipPath}`);
        if (result.driveFileId) {
            console.log(`☁️ Uploaded to Google Drive with File ID: ${result.driveFileId}`);
        }
        else {
            console.log('ℹ️ Local backup saved (Google Drive credentials not configured or upload pending).');
        }
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Backup script error:', err);
        process.exit(1);
    }
};
runBackup();
//# sourceMappingURL=backup.js.map