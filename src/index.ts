#!/usr/bin/env node

import { Command } from 'commander';
import { createGenerateCommand } from './commands/generate.js';
import { createRollbackCommand } from './commands/rollback.js';
import { createInitCommand } from './commands/init.js';
import { createStatusCommand } from './commands/status.js';
import { logger } from './utils/logger.js';

// Package info (will be replaced during build)
const VERSION = '1.0.0';
const DESCRIPTION = 'A powerful CLI tool for generating Git commits with custom dates';

/**
 * Main CLI program
 */
const program = new Command()
  .name('auto-commit')
  .description(DESCRIPTION)
  .version(VERSION, '-V, --version', 'Output the version number')
  .helpOption('-h, --help', 'Display help for command')
  .addHelpText('after', `
Examples:
  $ auto-commit init                     Create configuration interactively
  $ auto-commit status                   Show repository and config status
  $ auto-commit generate --dry-run       Preview commits without executing
  $ auto-commit generate -f 2024-01-01 -t 2024-12-31
  $ auto-commit rollback 10              Undo last 10 commits

Documentation:
  https://github.com/Lynthar/autoCommit-cli
`);

// Register commands
program.addCommand(createInitCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createRollbackCommand());
program.addCommand(createStatusCommand());

// Handle unknown commands
program.on('command:*', () => {
  logger.error(`Unknown command: ${program.args.join(' ')}`);
  logger.info('Run "auto-commit --help" to see available commands.');
  process.exit(1);
});

// Parse arguments and execute
async function main() {
  try {
    await program.parseAsync(process.argv);

    // If no command specified, show help
    if (process.argv.length === 2) {
      program.help();
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message);
    }
    process.exit(1);
  }
}

main();
