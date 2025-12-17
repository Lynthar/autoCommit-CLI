import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { format, subMonths } from 'date-fns';
import { configManager } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { GitService } from '../core/git-service.js';
import { Config, AutoCommitError } from '../types/index.js';
import path from 'path';

/**
 * Create the init command
 */
export function createInitCommand(): Command {
  const command = new Command('init')
    .description('Initialize configuration with interactive prompts')
    .option('-r, --repo <path>', 'Repository path (default: current directory)')
    .option('-o, --output <path>', 'Output config file path')
    .option('--force', 'Overwrite existing config file')
    .action(async (options) => {
      try {
        await executeInit(options);
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
 * Execute init command
 */
async function executeInit(options: Record<string, unknown>): Promise<void> {
  logger.banner();

  const repoPath = (options.repo as string) || '.';

  // Check if config already exists
  if (!options.force) {
    const existingConfig = await configManager.getConfigPath();
    if (existingConfig) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Config file already exists at ${existingConfig}. Overwrite?`,
          default: false,
        },
      ]);

      if (!overwrite) {
        logger.info('Init cancelled. Use existing config or add --force flag.');
        return;
      }
    }
  }

  // Check if repo exists and is a git repo
  const gitService = new GitService(repoPath);
  const isRepo = await gitService.isGitRepo();

  if (!isRepo) {
    logger.warn(`"${path.resolve(repoPath)}" is not a Git repository.`);

    const { initRepo } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'initRepo',
        message: 'Would you like to continue anyway?',
        default: true,
      },
    ]);

    if (!initRepo) {
      logger.info('Run "git init" first to create a repository.');
      return;
    }
  }

  logger.title('Configuration Wizard');
  logger.info('Answer the following questions to create your config file.\n');

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'startDate',
      message: 'Start date (YYYY-MM-DD):',
      default: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
      validate: (input) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please use YYYY-MM-DD format';
      },
    },
    {
      type: 'input',
      name: 'endDate',
      message: 'End date (YYYY-MM-DD):',
      default: format(new Date(), 'yyyy-MM-dd'),
      validate: (input) => {
        return /^\d{4}-\d{2}-\d{2}$/.test(input) || 'Please use YYYY-MM-DD format';
      },
    },
    {
      type: 'number',
      name: 'minCommits',
      message: 'Minimum commits per day:',
      default: 1,
      validate: (input) => {
        return (input >= 0 && input <= 50) || 'Must be between 0 and 50';
      },
    },
    {
      type: 'number',
      name: 'maxCommits',
      message: 'Maximum commits per day:',
      default: 5,
      validate: (input) => {
        return (input >= 1 && input <= 50) || 'Must be between 1 and 50';
      },
    },
    {
      type: 'input',
      name: 'commitMessage',
      message: 'Commit message template:',
      default: 'feat: auto commit {{date}} #{{index}}',
    },
    {
      type: 'checkbox',
      name: 'skipDays',
      message: 'Skip which days?',
      choices: [
        { name: 'Sunday', value: 0 },
        { name: 'Monday', value: 1 },
        { name: 'Tuesday', value: 2 },
        { name: 'Wednesday', value: 3 },
        { name: 'Thursday', value: 4 },
        { name: 'Friday', value: 5 },
        { name: 'Saturday', value: 6 },
      ],
      default: [0, 6], // Default skip weekends
    },
    {
      type: 'number',
      name: 'skipProbability',
      message: 'Random skip probability (0-100%):',
      default: 10,
      validate: (input) => {
        return (input >= 0 && input <= 100) || 'Must be between 0 and 100';
      },
    },
    {
      type: 'input',
      name: 'timeStart',
      message: 'Commit time range start (HH:MM):',
      default: '09:00',
      validate: (input) => {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(input) || 'Please use HH:MM format';
      },
    },
    {
      type: 'input',
      name: 'timeEnd',
      message: 'Commit time range end (HH:MM):',
      default: '18:00',
      validate: (input) => {
        return /^([01]\d|2[0-3]):([0-5]\d)$/.test(input) || 'Please use HH:MM format';
      },
    },
    {
      type: 'input',
      name: 'targetFile',
      message: 'Target file for commits:',
      default: '.auto-commit-log',
    },
    {
      type: 'confirm',
      name: 'autoPush',
      message: 'Automatically push after generating commits?',
      default: false,
    },
  ]);

  // Build config object
  const config: Config = {
    repoPath: '.',
    startDate: answers.startDate,
    endDate: answers.endDate,
    commitsPerDay: {
      min: answers.minCommits,
      max: answers.maxCommits,
    },
    commitMessage: answers.commitMessage,
    targetFile: answers.targetFile,
    skipDays: answers.skipDays,
    skipProbability: answers.skipProbability / 100,
    timeRange: {
      start: answers.timeStart,
      end: answers.timeEnd,
    },
    autoPush: answers.autoPush,
    branch: undefined,
  };

  // Show preview
  logger.title('Configuration Preview');
  logger.summary({
    'Start Date': config.startDate,
    'End Date': config.endDate,
    'Commits/Day': `${config.commitsPerDay.min}-${config.commitsPerDay.max}`,
    'Message Template': config.commitMessage,
    'Skip Days': config.skipDays.length > 0
      ? config.skipDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
      : 'None',
    'Skip Probability': `${(config.skipProbability * 100).toFixed(0)}%`,
    'Time Range': `${config.timeRange.start} - ${config.timeRange.end}`,
    'Target File': config.targetFile,
    'Auto Push': config.autoPush ? 'Yes' : 'No',
  });

  // Confirm save
  const { save } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'save',
      message: 'Save this configuration?',
      default: true,
    },
  ]);

  if (!save) {
    logger.info('Configuration not saved.');
    return;
  }

  // Save config
  const outputPath = (options.output as string) || '.autocommitrc.json';
  const savedPath = await configManager.saveConfig(config, outputPath);

  logger.newLine();
  logger.success(`Configuration saved to ${savedPath}`);
  logger.newLine();

  // Show next steps
  logger.box('Next Steps', [
    '1. Review the config file if needed',
    '2. Run: auto-commit generate --dry-run',
    '3. If satisfied: auto-commit generate',
    '',
    chalk.gray('Tip: Use --help for more options'),
  ]);
}
