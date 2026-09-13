// Global types for sandbox file management

import type { ProjectPlan } from './plan';

export interface SandboxFile {
  content: string;
  lastModified: number;
}

export interface SandboxFileCache {
  files: Record<string, SandboxFile>;
  lastSync: number;
  sandboxId: string;
  manifest?: any; // FileManifest type from file-manifest.ts
}

export interface SandboxState {
  fileCache: SandboxFileCache | null;
  sandbox: any; // E2B sandbox instance
  sandboxData: {
    sandboxId: string;
    url: string;
  } | null;
  // The plan the user approved for this project, so later edits can reference
  // it. Must survive a sandbox rebuild - see lib/sandbox/recovery.ts.
  plan?: ProjectPlan | null;
}

// Declare global types
declare global {
  var activeSandbox: any;
  var sandboxState: SandboxState;
  var existingFiles: Set<string>;
}

export {};