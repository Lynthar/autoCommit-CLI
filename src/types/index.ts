import { z } from 'zod';

// Configuration schema with Zod for validation
export const ConfigSchema = z.object({
  // Repository path (defaults to current directory)
  repoPath: z.string().default('.'),

  // Date range for commits
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),

  // Commit settings
  commitsPerDay: z.object({
    min: z.number().int().min(0).max(50).default(1),
    max: z.number().int().min(1).max(50).default(5),
  }).default({ min: 1, max: 5 }),

  // Commit message template (supports {{date}}, {{index}} placeholders)
  commitMessage: z.string().default('auto commit: {{date}}'),

  // File to modify for commits
  targetFile: z.string().default('.auto-commit-log'),

  // Days to skip (0 = Sunday, 6 = Saturday)
  skipDays: z.array(z.number().min(0).max(6)).default([]),

  // Skip probability (0-1, chance to skip any given day)
  skipProbability: z.number().min(0).max(1).default(0),

  // Time range for commits (HH:MM format)
  timeRange: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/).default('09:00'),
    end: z.string().regex(/^\d{2}:\d{2}$/).default('18:00'),
  }).default({ start: '09:00', end: '18:00' }),

  // Whether to push after generating commits
  autoPush: z.boolean().default(false),

  // Branch to commit to
  branch: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// Partial config for CLI options (not all fields required)
export type PartialConfig = Partial<Config> & {
  startDate: string;
  endDate: string;
};

// Commit plan for dry-run mode
export interface CommitPlan {
  date: Date;
  time: string;
  message: string;
  index: number;
}

// Result of commit generation
export interface GenerateResult {
  success: boolean;
  totalCommits: number;
  startDate: string;
  endDate: string;
  duration: number;
  errors: string[];
}

// Git repository status
export interface RepoStatus {
  isRepo: boolean;
  currentBranch: string | null;
  hasUncommittedChanges: boolean;
  remoteUrl: string | null;
  isConnected: boolean;
}

// Progress callback type
export type ProgressCallback = (current: number, total: number, message: string) => void;

// Error types for better error handling
export class AutoCommitError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'AutoCommitError';
  }
}

export enum ErrorCode {
  NOT_A_GIT_REPO = 'NOT_A_GIT_REPO',
  UNCOMMITTED_CHANGES = 'UNCOMMITTED_CHANGES',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INVALID_CONFIG = 'INVALID_CONFIG',
  GIT_OPERATION_FAILED = 'GIT_OPERATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  USER_CANCELLED = 'USER_CANCELLED',
  UNKNOWN = 'UNKNOWN',
}

// Mapping error codes to user-friendly suggestions
export const ErrorSuggestions: Record<ErrorCode, string> = {
  [ErrorCode.NOT_A_GIT_REPO]: 'Run "git init" to initialize a Git repository, or navigate to an existing repo.',
  [ErrorCode.UNCOMMITTED_CHANGES]: 'Commit or stash your changes first: "git stash" or "git commit -am \'message\'"',
  [ErrorCode.INVALID_DATE_RANGE]: 'Ensure start date is before end date and dates are in YYYY-MM-DD format.',
  [ErrorCode.INVALID_CONFIG]: 'Check your configuration file or command options for errors.',
  [ErrorCode.GIT_OPERATION_FAILED]: 'Check your Git installation and repository status.',
  [ErrorCode.NETWORK_ERROR]: 'Check your internet connection and remote repository access.',
  [ErrorCode.PERMISSION_DENIED]: 'Ensure you have write permissions to the repository.',
  [ErrorCode.USER_CANCELLED]: 'Operation was cancelled by user.',
  [ErrorCode.UNKNOWN]: 'An unexpected error occurred. Please try again or report the issue.',
};
