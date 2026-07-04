export const BACKUP_SETTINGS_STORAGE_KEY = "banguesesdraw.backupSettings";

export type BackupSettings = {
  backupFolderPath: string;
};

export const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  backupFolderPath: "",
};

function sanitizeBackupSettings(value: unknown): BackupSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_BACKUP_SETTINGS;
  }

  const candidate = value as Partial<Record<keyof BackupSettings, unknown>>;
  return {
    backupFolderPath:
      typeof candidate.backupFolderPath === "string"
        ? candidate.backupFolderPath
        : DEFAULT_BACKUP_SETTINGS.backupFolderPath,
  };
}

export function loadBackupSettings(): BackupSettings {
  try {
    const serializedSettings = localStorage.getItem(BACKUP_SETTINGS_STORAGE_KEY);
    if (!serializedSettings) {
      return DEFAULT_BACKUP_SETTINGS;
    }

    return sanitizeBackupSettings(JSON.parse(serializedSettings));
  } catch {
    return DEFAULT_BACKUP_SETTINGS;
  }
}

export function saveBackupSettings(settings: BackupSettings) {
  localStorage.setItem(
    BACKUP_SETTINGS_STORAGE_KEY,
    JSON.stringify(sanitizeBackupSettings(settings)),
  );
}
