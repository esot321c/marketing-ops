export interface MigrationMove {
  from: string;
  to: string;
  kind: "tenant" | "global";
  tenant?: string;
}

export interface RemainingDir {
  dir: string;
  entries: string[];
}

export interface MigrationSummary {
  dataDir: string;
  dryRun: boolean;
  aborted: boolean;
  tenants: string[];
  moves: MigrationMove[];
  skipped: MigrationMove[];
  conflicts: MigrationMove[];
  removedDirs: string[];
  remainingDirs: RemainingDir[];
}

export interface MigrateOptions {
  dryRun?: boolean;
}

export function migrate(dataDir: string, options?: MigrateOptions): Promise<MigrationSummary>;
export function printSummary(summary: MigrationSummary): void;
