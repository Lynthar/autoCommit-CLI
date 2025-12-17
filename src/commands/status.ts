import { Command } from 'commander';
import chalk from 'chalk';
import { GitService } from '../core/git-service.js';
import { configManager } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { DateCalculator } from '../core/date-calculator.js';
import { AutoCommitError } from '../types/index.js';

/**
 * Create the status command
 */
export function createStatusCommand(): Command {
  const command = new Command('status')
    .alias('st')
    .description('Show repository and configuration status')
    .option('-r, --repo <path>', 'Repository path (default: current directory)')
    .option('-c, --config <path>', 'Path to config file')
    .action(async (options) => {
      try {
        await executeStatus(options);
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
 * Execute status command
 */
async function executeStatus(options: Record<string, unknown>): Promise<void> {
  const repoPath = (options.repo as string) || '.';
  const gitService = new GitService(repoPath);

  // Repository Status
  logger.title('Repository Status');

  const repoStatus = await gitService.getRepoStatus();

  if (!repoStatus.isRepo) {
    logger.keyValue('Git Repository', chalk.red('No'));
    logger.warn('This directory is not a Git repository.');
    logger.info('Run "git init" to initialize a repository.');
  } else {
    logger.keyValue('Git Repository', chalk.green('Yes'));
    logger.keyValue('Current Branch', repoStatus.currentBranch || 'N/A');
    logger.keyValue('Uncommitted Changes', repoStatus.hasUncommittedChanges ? chalk.yellow('Yes') : chalk.green('No'));
    logger.keyValue('Remote URL', repoStatus.remoteUrl || chalk.gray('Not configured'));
    logger.keyValue('Remote Connection', repoStatus.isConnected ? chalk.green('Connected') : chalk.yellow('Not connected'));

    // Show recent commits
    const recentCommits = await gitService.getRecentCommits(5);
    if (recentCommits.length > 0) {
      logger.newLine();
      logger.info('Recent commits:');
      for (const commit of recentCommits) {
        console.log(
          chalk.gray('  •'),
          chalk.yellow(commit.hash),
          chalk.white(commit.message.substring(0, 60))
        );
      }
    }
  }

  // Configuration Status
  logger.title('Configuration Status');

  const configPath = await configManager.getConfigPath();

  if (configPath) {
    logger.keyValue('Config File', chalk.green(configPath));

    try {
      const config = await configManager.loadConfig(options.config as string | undefined);

      if (config) {
        logger.keyValue('Start Date', config.startDate);
        logger.keyValue('End Date', config.endDate);
        logger.keyValue('Commits/Day', `${config.commitsPerDay.min}-${config.commitsPerDay.max}`);
        logger.keyValue('Target File', config.targetFile);
        logger.keyValue('Auto Push', config.autoPush ? 'Yes' : 'No');

        // Calculate estimate
        const dateCalculator = new DateCalculator();
        const stats = dateCalculator.getDateStats(
          config.startDate,
          config.endDate,
          config.skipDays
        );
        const estimate = dateCalculator.estimateCommitCount(config);

        logger.newLine();
        logger.info('Estimated generation:');
        logger.keyValue('Active Days', stats.activeDays);
        logger.keyValue('Expected Commits', `~${estimate.expected} (${estimate.min}-${estimate.max})`);
      }
    } catch (error) {
      logger.error(`Failed to load config: ${error}`);
    }
  } else {
    logger.keyValue('Config File', chalk.yellow('Not found'));
    logger.info('Run "auto-commit init" to create a configuration file.');
  }

  // Quick Tips
  logger.title('Quick Commands');
  console.log(chalk.gray('  auto-commit init          '), 'Create configuration file');
  console.log(chalk.gray('  auto-commit generate      '), 'Generate commits');
  console.log(chalk.gray('  auto-commit generate --dry-run'), 'Preview commits');
  console.log(chalk.gray('  auto-commit rollback      '), 'Undo commits');
}
