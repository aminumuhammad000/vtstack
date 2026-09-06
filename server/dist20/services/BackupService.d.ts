export declare class BackupService {
    private getDriveClient;
    /**
     * Create a backup of the MongoDB database and upload to Google Drive every 24 hours
     */
    createAndUploadBackup(): Promise<{
        zipPath: string;
        driveFileId?: string;
    }>;
    private zipDirectory;
    private cleanOldBackups;
}
export declare const backupService: BackupService;
//# sourceMappingURL=BackupService.d.ts.map