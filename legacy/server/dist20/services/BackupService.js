"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = exports.BackupService = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const mongoose_1 = __importDefault(require("mongoose"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("../utils/logger");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
class BackupService {
    getDriveClient() {
        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
        if (!clientId || !clientSecret || !refreshToken || refreshToken === 'your_refresh_token') {
            return null;
        }
        try {
            const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            return googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
        }
        catch (err) {
            logger_1.logger.warn(`[Backup] Failed to initialize Google Drive client: ${err.message}`);
            return null;
        }
    }
    /**
     * Create a backup of the MongoDB database and upload to Google Drive every 24 hours
     */
    async createAndUploadBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `vtstack-backup-${timestamp}`;
        const backupDir = path_1.default.join(__dirname, '../../backups');
        const dumpDir = path_1.default.join(backupDir, backupName);
        const zipPath = path_1.default.join(backupDir, `${backupName}.zip`);
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        try {
            logger_1.logger.info(`[Backup] Starting 24-hour backup: ${backupName}`);
            // 1. Export database via mongodump or fallback to JSON collection dump
            let dumpSucceeded = false;
            try {
                const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtpay';
                await execPromise(`mongodump --uri="${mongoUri}" --out="${dumpDir}"`);
                dumpSucceeded = true;
                logger_1.logger.info(`[Backup] mongodump successful`);
            }
            catch (dumpErr) {
                logger_1.logger.warn(`[Backup] mongodump failed (${dumpErr.message}). Falling back to JSON collection dump.`);
            }
            if (!dumpSucceeded) {
                if (!fs_1.default.existsSync(dumpDir)) {
                    fs_1.default.mkdirSync(dumpDir, { recursive: true });
                }
                const collections = await mongoose_1.default.connection.db?.listCollections().toArray();
                if (collections && collections.length > 0) {
                    for (const col of collections) {
                        const data = await mongoose_1.default.connection.db?.collection(col.name).find({}).toArray();
                        fs_1.default.writeFileSync(path_1.default.join(dumpDir, `${col.name}.json`), JSON.stringify(data, null, 2));
                    }
                    logger_1.logger.info(`[Backup] Dumped ${collections.length} collections to JSON`);
                }
            }
            // 2. Zip the backup directory
            await this.zipDirectory(dumpDir, zipPath);
            logger_1.logger.info(`[Backup] Zip created: ${zipPath}`);
            // 3. Clean up unzipped folder
            if (fs_1.default.existsSync(dumpDir)) {
                fs_1.default.rmSync(dumpDir, { recursive: true, force: true });
            }
            // 4. Upload to Google Drive if configured
            let driveFileId;
            const drive = this.getDriveClient();
            if (drive) {
                try {
                    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
                    const fileMetadata = {
                        name: `${backupName}.zip`,
                    };
                    if (folderId && folderId !== 'your_folder_id') {
                        fileMetadata.parents = [folderId];
                    }
                    const media = {
                        mimeType: 'application/zip',
                        body: fs_1.default.createReadStream(zipPath),
                    };
                    const response = await drive.files.create({
                        requestBody: fileMetadata,
                        media: media,
                        fields: 'id, name',
                    });
                    driveFileId = response.data.id || undefined;
                    logger_1.logger.info(`[Backup] ✅ Backup successfully uploaded to Google Drive. File ID: ${driveFileId}`);
                }
                catch (driveErr) {
                    logger_1.logger.error(`[Backup] ⚠️ Failed to upload backup to Google Drive: ${driveErr.message}. Local backup retained.`);
                }
            }
            else {
                logger_1.logger.warn(`[Backup] ℹ️ Google Drive credentials not fully configured. Backup saved locally at ${zipPath}`);
            }
            // 5. Clean up local backups older than 7 days
            this.cleanOldBackups(backupDir, 7);
            return { zipPath, driveFileId };
        }
        catch (error) {
            logger_1.logger.error('[Backup] Backup failed:', error);
            // Clean up temporary dump directory if it exists
            if (fs_1.default.existsSync(dumpDir)) {
                fs_1.default.rmSync(dumpDir, { recursive: true, force: true });
            }
            throw error;
        }
    }
    zipDirectory(sourceDir, outPath) {
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const stream = fs_1.default.createWriteStream(outPath);
        return new Promise((resolve, reject) => {
            archive
                .directory(sourceDir, false)
                .on('error', (err) => reject(err))
                .pipe(stream);
            stream.on('close', () => resolve());
            archive.finalize();
        });
    }
    cleanOldBackups(backupDir, maxDays) {
        try {
            const files = fs_1.default.readdirSync(backupDir);
            const now = Date.now();
            const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;
            for (const file of files) {
                if (file.endsWith('.zip')) {
                    const filePath = path_1.default.join(backupDir, file);
                    const stats = fs_1.default.statSync(filePath);
                    if (now - stats.mtimeMs > maxAgeMs) {
                        fs_1.default.unlinkSync(filePath);
                        logger_1.logger.info(`[Backup] Pruned old backup: ${file}`);
                    }
                }
            }
        }
        catch (cleanErr) {
            logger_1.logger.warn(`[Backup] Error cleaning old backups: ${cleanErr.message}`);
        }
    }
}
exports.BackupService = BackupService;
exports.backupService = new BackupService();
//# sourceMappingURL=BackupService.js.map