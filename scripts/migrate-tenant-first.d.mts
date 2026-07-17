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

export type MigrationAbortReason = "reserved-name" | "invalid-name" | "conflict";

export interface MigrationSummary {
  dataDir: string;
  dryRun: boolean;
  aborted: boolean;
  reason?: MigrationAbortReason;
  reservedNames?: string[];
  invalidNames?: string[];
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

export interface PartialMigrationSummary {
  completed: MigrationMove[];
  failed: { move: MigrationMove; error: Error };
  notAttempted: MigrationMove[];
  skipped: MigrationMove[];
}

export class MigrationExecutionError extends Error {
  cause: Error;
  partialSummary: PartialMigrationSummary;
}

export function migrate(dataDir: string, options?: MigrateOptions): Promise<MigrationSummary>;
export function printSummary(summary: MigrationSummary): void;
export function printPartialSummary(partialSummary: PartialMigrationSummary): void;
