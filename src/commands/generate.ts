import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { format } from 'date-fns';
import { CommitGenerator } from '../core/commit-generator.js';
import { configManager } from '../utils/config.js';
import { Validator } from '../utils/validator.js';
import { logger } from '../utils/logger.js';
import { Config, AutoCommitError, ErrorCode } from '../types/index.js';

/**
 * Create the generate command
 */
export function createGenerateCommand(): Command {
  const command = new Command('generate')
    .alias('gen')
    .description('Generate commits with custom dates')
    .option('-f, --from <date>', 'Start date (YYYY-MM-DD)')
    .option('-t, --to <date>', 'End date (YYYY-MM-DD)')
    .option('-r, --repo <path>', 'Repository path (default: current directory)')
    .option('-m, --message <template>', 'Commit message template')
    .option('--min <number>', 'Minimum commits per day', parseInt)
    .option('--max <number>', 'Maximum commits per day', parseInt)
    .option('--skip-weekends', 'Skip Saturday and Sunday')
    .option('--skip-days <days>', 'Days to skip (0=Sun, 6=Sat), comma-separated')
    .option('--skip-prob <probability>', 'Probability to skip any day (0-1)', parseFloat)
    .option('--time-start <time>', 'Start time for commits (HH:MM)')
    .option('--time-end <time>', 'End time for commits (HH:MM)')
    .option('--target-file <file>', 'File to modify for commits')
    .option('--push', 'Push after generating commits')
    .option('--branch <name>', 'Branch to commit to')
    .option('--dry-run', 'Show what would be done without making changes')
    .option('-c, --config <path>', 'Path to config file')
    .option('-y, --yes', 'Skip confirmation prompt')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options) => {
      try {
        await executeGenerate(options);
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
 * Execute generate command
 */
async function executeGenerate(options: Record<string, unknown>): Promise<void> {
  logger.setVerbose(options.verbose as boolean);

  // Load config from file if exists
  let fileConfig = await configManager.loadConfig(options.config as string | undefined);

  // Build CLI config
  const cliConfig: Partial<Config> = {};

  if (options.from) cliConfig.startDate = options.from as string;
  if (options.to) cliConfig.endDate = options.to as string;
  if (options.repo) cliConfig.repoPath = options.repo as string;
  if (options.message) cliConfig.commitMessage = options.message as string;
  if (options.targetFile) cliConfig.targetFile = options.targetFile as string;
  if (options.push) cliConfig.autoPush = true;
  if (options.branch) cliConfig.branch = options.branch as string;

  // Handle commits per day
  if (options.min !== undefined || options.max !== undefined) {
    cliConfig.commitsPerDay = {
      min: (options.min as number) ?? fileConfig?.commitsPerDay?.min ?? 1,
      max: (options.max as number) ?? fileConfig?.commitsPerDay?.max ?? 5,
    };
  }

  // Handle skip days
  if (options.skipWeekends) {
    cliConfig.skipDays = [0, 6];
  } else if (options.skipDays) {
    cliConfig.skipDays = (options.skipDays as string).split(',').map(Number);
  }

  if (options.skipProb !== undefined) {
    cliConfig.skipProbability = options.skipProb as number;
  }

  // Handle time range
  if (options.timeStart || options.timeEnd) {
    cliConfig.timeRange = {
      start: (options.timeStart as string) ?? fileConfig?.timeRange?.start ?? '09:00',
      end: (options.timeEnd as string) ?? fileConfig?.timeRange?.end ?? '18:00',
    };
  }

  // Merge configs - require dates
  if (!cliConfig.startDate && !fileConfig?.startDate) {
    throw new AutoCommitError(
      'Start date is required. Use --from option or config file.',
      ErrorCode.INVALID_CONFIG
    );
  }
  if (!cliConfig.endDate && !fileConfig?.endDate) {
    throw new AutoCommitError(
      'End date is required. Use --to option or config file.',
      ErrorCode.INVALID_CONFIG
    );
  }

  // Create final config
  const config = configManager.mergeWithCliOptions(fileConfig, {
    startDate: cliConfig.startDate || fileConfig!.startDate,
    endDate: cliConfig.endDate || fileConfig!.endDate,
    ...cliConfig,
  });

  // Run preflight checks
  logger.startSpinner('Running preflight checks...');
  const preflight = await Validator.preflightChecks(config.repoPath, config);
  logger.stopSpinner();

  if (!preflight.passed) {
    logger.title('Preflight Check Failed');
    for (const error of preflight.errors) {
      logger.error(error);
    }
    process.exit(1);
  }

  // Show warnings
  if (preflight.warnings.length > 0) {
    logger.title('Warnings');
    for (const warning of preflight.warnings) {
      logger.warn(warning);
    }
  }

  // Create generator and get plan
  const generator = new CommitGenerator(config.repoPath);
  const plan = generator.generatePlan(config);
  const stats = generator.getDateStats(config);

  // Show plan summary
  logger.title('Commit Plan');
  logger.summary({
    'Repository': config.repoPath,
    'Date Range': `${config.startDate} → ${config.endDate}`,
    'Total Days': stats.totalDays,
    'Active Days': stats.activeDays,
    'Commits per Day': `${config.commitsPerDay.min}-${config.commitsPerDay.max}`,
    'Total Commits': plan.length,
    'Time Range': `${config.timeRange.start} - ${config.timeRange.end}`,
    'Target File': config.targetFile,
    'Auto Push': config.autoPush ? 'Yes' : 'No',
  });

  // Dry run mode
  if (options.dryRun) {
    logger.title('Dry Run - Commits to be created:');

    // Show first 10 and last 5 commits
    const showCount = Math.min(10, plan.length);
    for (let i = 0; i < showCount; i++) {
      const commit = plan[i];
      console.log(
        chalk.gray(`  ${i + 1}.`),
        chalk.cyan(format(commit.date, 'yyyy-MM-dd HH:mm:ss')),
        chalk.white(commit.message)
      );
    }

    if (plan.length > 15) {
      console.log(chalk.gray(`  ... ${plan.length - 15} more commits ...`));

      for (let i = plan.length - 5; i < plan.length; i++) {
        const commit = plan[i];
        console.log(
          chalk.gray(`  ${i + 1}.`),
          chalk.cyan(format(commit.date, 'yyyy-MM-dd HH:mm:ss')),
          chalk.white(commit.message)
        );
      }
    } else if (plan.length > showCount) {
      for (let i = showCount; i < plan.length; i++) {
        const commit = plan[i];
        console.log(
          chalk.gray(`  ${i + 1}.`),
          chalk.cyan(format(commit.date, 'yyyy-MM-dd HH:mm:ss')),
          chalk.white(commit.message)
        );
      }
    }

    logger.newLine();
    logger.info(`Dry run complete. ${plan.length} commits would be created.`);
    logger.info('Remove --dry-run flag to execute.');
    return;
  }

  // Confirm before proceeding
  if (!options.yes) {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: `Generate ${plan.length} commits? This cannot be easily undone.`,
        default: false,
      },
    ]);

    if (!confirmed) {
      logger.info('Operation cancelled.');
      return;
    }
  }

  // Execute generation with progress bar
  logger.newLine();
  const progressBar = logger.createProgressBar();
  progressBar.start(plan.length, 0, { message: 'Starting...' });

  // Handle Ctrl+C gracefully
  let interrupted = false;
  const handleInterrupt = async () => {
    if (interrupted) return;
    interrupted = true;

    progressBar.stop();
    logger.newLine();
    logger.warn('Interrupted! Rolling back generated commits...');

    generator.cancel();

    const generatedCount = generator.getGeneratedCommitsCount();
    if (generatedCount > 0) {
      try {
        await generator.rollback();
        logger.success(`Rolled back ${generatedCount} commits.`);
      } catch (error) {
        logger.error(`Failed to rollback: ${error}`);
        logger.warn(`You may need to manually run: git reset --hard HEAD~${generatedCount}`);
      }
    }

    process.exit(130);
  };

  process.on('SIGINT', handleInterrupt);
  process.on('SIGTERM', handleInterrupt);

  try {
    const result = await generator.generate(config, (current, total, message) => {
      progressBar.update(current, { message: message.substring(0, 50) });
    });

    progressBar.stop();

    // Remove interrupt handlers
    process.removeListener('SIGINT', handleInterrupt);
    process.removeListener('SIGTERM', handleInterrupt);

    // Show results
    logger.title('Generation Complete');
    logger.summary({
      'Total Commits': result.totalCommits,
      'Duration': `${(result.duration / 1000).toFixed(2)}s`,
      'Speed': `${(result.totalCommits / (result.duration / 1000)).toFixed(1)} commits/sec`,
      'Status': result.success ? chalk.green('Success') : chalk.yellow('Completed with errors'),
    });

    if (result.errors.length > 0) {
      logger.title('Errors');
      for (const error of result.errors) {
        logger.error(error);
      }
    }

    if (result.success) {
      logger.success(`Successfully generated ${result.totalCommits} commits!`);

      if (!config.autoPush) {
        logger.info('Run "git push" to push commits to remote.');
      }
    }
  } catch (error) {
    progressBar.stop();

    if (error instanceof AutoCommitError && error.code === ErrorCode.USER_CANCELLED) {
      // Already handled by interrupt handler
      return;
    }

    throw error;
  }
}
