import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { RepoStatus, AutoCommitError, ErrorCode } from '../types/index.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * GitService - Encapsulates all Git operations with proper error handling
 */
export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string = '.') {
    this.repoPath = path.resolve(repoPath);

    const options: Partial<SimpleGitOptions> = {
      baseDir: this.repoPath,
      binary: 'git',
      maxConcurrentProcesses: 1, // Ensure sequential operations
      trimmed: true,
    };

    this.git = simpleGit(options);
  }

  /**
   * Check if the directory is a valid Git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive repository status
   */
  async getRepoStatus(): Promise<RepoStatus> {
    const isRepo = await this.isGitRepo();

    if (!isRepo) {
      return {
        isRepo: false,
        currentBranch: null,
        hasUncommittedChanges: false,
        remoteUrl: null,
        isConnected: false,
      };
    }

    try {
      const [status, remotes, branch] = await Promise.all([
        this.git.status(),
        this.git.getRemotes(true),
        this.git.revparse(['--abbrev-ref', 'HEAD']).catch(() => null),
      ]);

      const originRemote = remotes.find(r => r.name === 'origin');
      const remoteUrl = originRemote?.refs?.fetch || null;

      // Check connection to remote
      let isConnected = false;
      if (remoteUrl) {
        try {
          await this.git.listRemote(['--heads', 'origin']);
          isConnected = true;
        } catch {
          isConnected = false;
        }
      }

      return {
        isRepo: true,
        currentBranch: branch,
        hasUncommittedChanges: !status.isClean(),
        remoteUrl,
        isConnected,
      };
    } catch (error) {
      throw new AutoCommitError(
        `Failed to get repository status: ${error}`,
        ErrorCode.GIT_OPERATION_FAILED
      );
    }
  }

  /**
   * Validate repository is ready for auto-commit operations
   */
  async validateRepo(allowUncommittedChanges = false): Promise<void> {
    const status = await this.getRepoStatus();

    if (!status.isRepo) {
      throw new AutoCommitError(
        `"${this.repoPath}" is not a Git repository`,
        ErrorCode.NOT_A_GIT_REPO
      );
    }

    if (!allowUncommittedChanges && status.hasUncommittedChanges) {
      throw new AutoCommitError(
        'Repository has uncommitted changes',
        ErrorCode.UNCOMMITTED_CHANGES
      );
    }
  }

  /**
   * Create a commit with a specific date
   */
  async createCommit(
    message: string,
    date: Date,
    filePath: string,
    content: string
  ): Promise<string> {
    try {
      // Write content to file
      const fullPath = path.join(this.repoPath, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.appendFile(fullPath, content + '\n');

      // Stage the file
      await this.git.add(filePath);

      // Format date for Git commit --date option
      // Git accepts ISO 8601 format
      const dateStr = date.toISOString();

      // Use raw git command with --date flag for reliable date setting
      // This sets the author date; we also need to set committer date via env
      const gitWithEnv = simpleGit({
        baseDir: this.repoPath,
        binary: 'git',
        maxConcurrentProcesses: 1,
        trimmed: true,
      }).env({
        ...process.env,
        GIT_COMMITTER_DATE: dateStr,
      });

      // Use commit with --date option for author date
      await gitWithEnv.raw([
        'commit',
        '-m', message,
        '--date', dateStr,
      ]);

      // Get the commit hash
      const hash = await this.git.revparse(['HEAD']);
      return hash.substring(0, 7);
    } catch (error) {
      throw new AutoCommitError(
        `Failed to create commit: ${error}`,
        ErrorCode.GIT_OPERATION_FAILED
      );
    }
  }

  /**
   * Rollback a number of commits
   */
  async rollback(count: number): Promise<void> {
    if (count <= 0) {
      throw new AutoCommitError(
        'Rollback count must be greater than 0',
        ErrorCode.INVALID_CONFIG
      );
    }

    try {
      await this.git.reset(['--hard', `HEAD~${count}`]);
    } catch (error) {
      throw new AutoCommitError(
        `Failed to rollback ${count} commits: ${error}`,
        ErrorCode.GIT_OPERATION_FAILED
      );
    }
  }

  /**
   * Get the number of commits in the repository
   */
  async getCommitCount(): Promise<number> {
    try {
      const log = await this.git.log();
      return log.total;
    } catch {
      return 0;
    }
  }

  /**
   * Get recent commits
   */
  async getRecentCommits(count: number = 10): Promise<Array<{ hash: string; date: string; message: string }>> {
    try {
      const log = await this.git.log({ maxCount: count });
      return log.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        date: commit.date,
        message: commit.message,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Push commits to remote
   */
  async push(branch?: string): Promise<void> {
    try {
      const currentBranch = branch || (await this.git.revparse(['--abbrev-ref', 'HEAD']));
      await this.git.push('origin', currentBranch, ['--set-upstream']);
    } catch (error) {
      throw new AutoCommitError(
        `Failed to push to remote: ${error}`,
        ErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Pull from remote with rebase
   */
  async pull(): Promise<void> {
    try {
      await this.git.pull('origin', undefined, { '--rebase': 'true' });
    } catch (error) {
      throw new AutoCommitError(
        `Failed to pull from remote: ${error}`,
        ErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Checkout or create a branch
   */
  async checkoutBranch(branch: string, create = false): Promise<void> {
    try {
      if (create) {
        await this.git.checkoutLocalBranch(branch);
      } else {
        await this.git.checkout(branch);
      }
    } catch (error) {
      throw new AutoCommitError(
        `Failed to checkout branch "${branch}": ${error}`,
        ErrorCode.GIT_OPERATION_FAILED
      );
    }
  }

  /**
   * Get the repository path
   */
  getRepoPath(): string {
    return this.repoPath;
  }
}
