import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import mongoose from 'mongoose';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execPromise = promisify(exec);

export class BackupService {
    private getDriveClient() {
        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
        const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

        if (!clientId || !clientSecret || !refreshToken || refreshToken === 'your_refresh_token') {
            return null;
        }

        try {
            const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            return google.drive({ version: 'v3', auth: oauth2Client });
        } catch (err: any) {
            logger.warn(`[Backup] Failed to initialize Google Drive client: ${err.message}`);
            return null;
        }
    }

    /**
     * Create a backup of the MongoDB database and upload to Google Drive every 24 hours
     */
    async createAndUploadBackup(): Promise<{ zipPath: string; driveFileId?: string }> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `vtstack-backup-${timestamp}`;
        const backupDir = path.join(__dirname, '../../backups');
        const dumpDir = path.join(backupDir, backupName);
        const zipPath = path.join(backupDir, `${backupName}.zip`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        try {
            logger.info(`[Backup] Starting 24-hour backup: ${backupName}`);

            // 1. Export database via mongodump or fallback to JSON collection dump
            let dumpSucceeded = false;
            try {
                const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vtpay';
                await execPromise(`mongodump --uri="${mongoUri}" --out="${dumpDir}"`);
                dumpSucceeded = true;
                logger.info(`[Backup] mongodump successful`);
            } catch (dumpErr: any) {
                logger.warn(`[Backup] mongodump failed (${dumpErr.message}). Falling back to JSON collection dump.`);
            }

            if (!dumpSucceeded) {
                if (!fs.existsSync(dumpDir)) {
                    fs.mkdirSync(dumpDir, { recursive: true });
                }
                const collections = await mongoose.connection.db?.listCollections().toArray();
                if (collections && collections.length > 0) {
                    for (const col of collections) {
                        const data = await mongoose.connection.db?.collection(col.name).find({}).toArray();
                        fs.writeFileSync(path.join(dumpDir, `${col.name}.json`), JSON.stringify(data, null, 2));
                    }
                    logger.info(`[Backup] Dumped ${collections.length} collections to JSON`);
                }
            }

            // 2. Zip the backup directory
            await this.zipDirectory(dumpDir, zipPath);
            logger.info(`[Backup] Zip created: ${zipPath}`);

            // 3. Clean up unzipped folder
            if (fs.existsSync(dumpDir)) {
                fs.rmSync(dumpDir, { recursive: true, force: true });
            }

            // 4. Upload to Google Drive if configured
            let driveFileId: string | undefined;
            const drive = this.getDriveClient();

            if (drive) {
                try {
                    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
                    const fileMetadata: any = {
                        name: `${backupName}.zip`,
                    };
                    if (folderId && folderId !== 'your_folder_id') {
                        fileMetadata.parents = [folderId];
                    }

                    const media = {
                        mimeType: 'application/zip',
                        body: fs.createReadStream(zipPath),
                    };

                    const response = await drive.files.create({
                        requestBody: fileMetadata,
                        media: media,
                        fields: 'id, name',
                    });

                    driveFileId = response.data.id || undefined;
                    logger.info(`[Backup] ✅ Backup successfully uploaded to Google Drive. File ID: ${driveFileId}`);
                } catch (driveErr: any) {
                    logger.error(`[Backup] ⚠️ Failed to upload backup to Google Drive: ${driveErr.message}. Local backup retained.`);
                }
            } else {
                logger.warn(`[Backup] ℹ️ Google Drive credentials not fully configured. Backup saved locally at ${zipPath}`);
            }

            // 5. Clean up local backups older than 7 days
            this.cleanOldBackups(backupDir, 7);

            return { zipPath, driveFileId };
        } catch (error: any) {
            logger.error('[Backup] Backup failed:', error);
            // Clean up temporary dump directory if it exists
            if (fs.existsSync(dumpDir)) {
                fs.rmSync(dumpDir, { recursive: true, force: true });
            }
            throw error;
        }
    }

    private zipDirectory(sourceDir: string, outPath: string): Promise<void> {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const stream = fs.createWriteStream(outPath);

        return new Promise((resolve, reject) => {
            archive
                .directory(sourceDir, false)
                .on('error', (err: Error) => reject(err))
                .pipe(stream);

            stream.on('close', () => resolve());
            archive.finalize();
        });
    }

    private cleanOldBackups(backupDir: string, maxDays: number) {
        try {
            const files = fs.readdirSync(backupDir);
            const now = Date.now();
            const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

            for (const file of files) {
                if (file.endsWith('.zip')) {
                    const filePath = path.join(backupDir, file);
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > maxAgeMs) {
                        fs.unlinkSync(filePath);
                        logger.info(`[Backup] Pruned old backup: ${file}`);
                    }
                }
            }
        } catch (cleanErr: any) {
            logger.warn(`[Backup] Error cleaning old backups: ${cleanErr.message}`);
        }
    }
}

export const backupService = new BackupService();

