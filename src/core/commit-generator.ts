import { format } from 'date-fns';
import { GitService } from './git-service.js';
import { DateCalculator } from './date-calculator.js';
import {
  Config,
  CommitPlan,
  GenerateResult,
  ProgressCallback,
  AutoCommitError,
  ErrorCode,
} from '../types/index.js';

/**
 * CommitGenerator - Orchestrates the commit generation process
 */
export class CommitGenerator {
  private gitService: GitService;
  private dateCalculator: DateCalculator;
  private cancelled = false;
  private generatedCommits = 0;

  constructor(repoPath: string = '.') {
    this.gitService = new GitService(repoPath);
    this.dateCalculator = new DateCalculator();
  }

  /**
   * Generate a commit plan (dry-run mode)
   */
  generatePlan(config: Config): CommitPlan[] {
    return this.dateCalculator.generateCommitPlan(config);
  }

  /**
   * Get commit estimate
   */
  getEstimate(config: Config): { min: number; max: number; expected: number } {
    return this.dateCalculator.estimateCommitCount(config);
  }

  /**
   * Get date statistics
   */
  getDateStats(config: Config) {
    return this.dateCalculator.getDateStats(
      config.startDate,
      config.endDate,
      config.skipDays
    );
  }

  /**
   * Cancel the current operation
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Check if operation was cancelled
   */
  isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Get number of commits generated so far
   */
  getGeneratedCommitsCount(): number {
    return this.generatedCommits;
  }

  /**
   * Rollback generated commits
   */
  async rollback(count?: number): Promise<void> {
    const rollbackCount = count ?? this.generatedCommits;
    if (rollbackCount > 0) {
      await this.gitService.rollback(rollbackCount);
      this.generatedCommits = 0;
    }
  }

  /**
   * Generate commits based on configuration
   */
  async generate(
    config: Config,
    onProgress?: ProgressCallback
  ): Promise<GenerateResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Reset state
    this.cancelled = false;
    this.generatedCommits = 0;

    // Validate repository
    await this.gitService.validateRepo(true);

    // Generate commit plan
    const plan = this.generatePlan(config);

    if (plan.length === 0) {
      return {
        success: true,
        totalCommits: 0,
        startDate: config.startDate,
        endDate: config.endDate,
        duration: Date.now() - startTime,
        errors: ['No commits to generate based on the configuration'],
      };
    }

    // Execute commits
    for (let i = 0; i < plan.length; i++) {
      // Check for cancellation
      if (this.cancelled) {
        throw new AutoCommitError(
          `Operation cancelled after ${this.generatedCommits} commits`,
          ErrorCode.USER_CANCELLED
        );
      }

      const commit = plan[i];

      try {
        // Generate file content for this commit
        const content = this.generateFileContent(commit);

        // Create the commit
        await this.gitService.createCommit(
          commit.message,
          commit.date,
          config.targetFile,
          content
        );

        this.generatedCommits++;

        // Report progress
        if (onProgress) {
          onProgress(
            i + 1,
            plan.length,
            `Committed: ${commit.message} (${format(commit.date, 'yyyy-MM-dd HH:mm:ss')})`
          );
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to create commit ${i + 1}: ${errorMsg}`);

        // Continue with next commit instead of failing completely
        if (onProgress) {
          onProgress(i + 1, plan.length, `Error: ${errorMsg}`);
        }
      }
    }

    // Push if configured
    if (config.autoPush && this.generatedCommits > 0) {
      try {
        await this.gitService.push(config.branch);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to push: ${errorMsg}`);
      }
    }

    return {
      success: errors.length === 0,
      totalCommits: this.generatedCommits,
      startDate: config.startDate,
      endDate: config.endDate,
      duration: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Generate file content for a commit
   */
  private generateFileContent(commit: CommitPlan): string {
    return `[${format(commit.date, 'yyyy-MM-dd HH:mm:ss')}] Commit #${commit.index + 1}: ${commit.message}`;
  }

  /**
   * Get Git service for advanced operations
   */
  getGitService(): GitService {
    return this.gitService;
  }
}
