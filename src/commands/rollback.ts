import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { GitService } from '../core/git-service.js';
import { logger } from '../utils/logger.js';
import { AutoCommitError, ErrorCode } from '../types/index.js';

/**
 * Create the rollback command
 */
export function createRollbackCommand(): Command {
  const command = new Command('rollback')
    .alias('rb')
    .description('Rollback (undo) generated commits')
    .argument('[count]', 'Number of commits to rollback')
    .option('-r, --repo <path>', 'Repository path (default: current directory)')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('-v, --verbose', 'Verbose output')
    .action(async (count, options) => {
      try {
        await executeRollback(count, options);
      } catch (error) {
        if (error instanceof AutoCommitError) {
          logger.logError(error);
        } else if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(1);
      }
    });

  return command;
}

/**
 * Execute rollback command
 */
async function executeRollback(
  countArg: string | undefined,
  options: Record<string, unknown>
): Promise<void> {
  logger.setVerbose(options.verbose as boolean);

  const repoPath = (options.repo as string) || '.';
  const gitService = new GitService(repoPath);

  // Validate repository
  await gitService.validateRepo(true);

  // Get recent commits
  const recentCommits = await gitService.getRecentCommits(20);

  if (recentCommits.length === 0) {
    logger.warn('No commits found in repository.');
    return;
  }

  let rollbackCount: number;

  if (countArg) {
    rollbackCount = parseInt(countArg, 10);
    if (isNaN(rollbackCount) || rollbackCount <= 0) {
      throw new AutoCommitError(
        'Rollback count must be a positive integer',
        ErrorCode.INVALID_CONFIG
      );
    }
  } else {
    // Interactive mode - let user select commits
    logger.title('Recent Commits');

    for (let i = 0; i < recentCommits.length; i++) {
      const commit = recentCommits[i];
      console.log(
        chalk.gray(`  ${i + 1}.`),
        chalk.yellow(commit.hash),
        chalk.gray(commit.date),
        chalk.white(commit.message.substring(0, 50))
      );
    }

    logger.newLine();

    const { count } = await inquirer.prompt([
      {
        type: 'number',
        name: 'count',
        message: 'How many commits to rollback?',
        default: 1,
        validate: (value) => {
          if (value <= 0) return 'Must be at least 1';
          if (value > recentCommits.length) return `Cannot rollback more than ${recentCommits.length} commits`;
          return true;
        },
      },
    ]);

    rollbackCount = count;
  }

  // Validate count
  const totalCommits = await gitService.getCommitCount();
  if (rollbackCount > totalCommits) {
    throw new AutoCommitError(
      `Cannot rollback ${rollbackCount} commits. Repository only has ${totalCommits} commits.`,
      ErrorCode.INVALID_CONFIG
    );
  }

  // Show what will be rolled back
  logger.title('Commits to Rollback');

  const commitsToRollback = recentCommits.slice(0, rollbackCount);
  for (const commit of commitsToRollback) {
    console.log(
      chalk.red('  ✖'),
      chalk.yellow(commit.hash),
      chalk.white(commit.message.substring(0, 50))
    );
  }

  logger.newLine();

  // Confirm
  if (!options.yes) {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: chalk.red(`Permanently delete ${rollbackCount} commit(s)? This cannot be undone!`),
        default: false,
      },
    ]);

    if (!confirmed) {
      logger.info('Rollback cancelled.');
      return;
    }
  }

  // Execute rollback
  logger.startSpinner(`Rolling back ${rollbackCount} commit(s)...`);

  try {
    await gitService.rollback(rollbackCount);
    logger.stopSpinnerSuccess(`Successfully rolled back ${rollbackCount} commit(s)`);

    logger.newLine();
    logger.info('Current HEAD after rollback:');

    const newHead = await gitService.getRecentCommits(1);
    if (newHead.length > 0) {
      console.log(
        chalk.green('  →'),
        chalk.yellow(newHead[0].hash),
        chalk.white(newHead[0].message)
      );
    }
  } catch (error) {
    logger.stopSpinnerFail('Rollback failed');
    throw error;
  }
}
