import chalk from 'chalk';
import ora, { Ora } from 'ora';
import cliProgress from 'cli-progress';
import { AutoCommitError, ErrorSuggestions } from '../types/index.js';

/**
 * Logger - Provides consistent, beautiful console output
 */
export class Logger {
  private verbose: boolean;
  private spinner: Ora | null = null;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Set verbose mode
   */
  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  /**
   * Log info message
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log success message
   */
  success(message: string): void {
    console.log(chalk.green('✔'), message);
  }

  /**
   * Log warning message
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Log error message with optional suggestion
   */
  error(message: string, suggestion?: string): void {
    console.log(chalk.red('✖'), message);
    if (suggestion) {
      console.log(chalk.gray('  └─'), chalk.cyan('Suggestion:'), suggestion);
    }
  }

  /**
   * Log AutoCommitError with appropriate formatting
   */
  logError(error: AutoCommitError | Error): void {
    if (error instanceof AutoCommitError) {
      this.error(error.message, error.suggestion || ErrorSuggestions[error.code]);
    } else {
      this.error(error.message);
    }
  }

  /**
   * Log debug message (only in verbose mode)
   */
  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('  [debug]'), message);
    }
  }

  /**
   * Log a blank line
   */
  newLine(): void {
    console.log();
  }

  /**
   * Log a divider
   */
  divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }

  /**
   * Log a title/header
   */
  title(text: string): void {
    this.newLine();
    console.log(chalk.bold.white(text));
    this.divider();
  }

  /**
   * Log a key-value pair
   */
  keyValue(key: string, value: string | number | boolean): void {
    console.log(chalk.gray('  •'), chalk.white(key + ':'), chalk.cyan(String(value)));
  }

  /**
   * Start a spinner
   */
  startSpinner(text: string): void {
    this.spinner = ora({
      text,
      color: 'cyan',
    }).start();
  }

  /**
   * Update spinner text
   */
  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  /**
   * Stop spinner with success
   */
  stopSpinnerSuccess(text: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with failure
   */
  stopSpinnerFail(text: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  /**
   * Stop spinner
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Create a progress bar
   */
  createProgressBar(): cliProgress.SingleBar {
    return new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} commits | {message}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: true,
    }, cliProgress.Presets.shades_classic);
  }

  /**
   * Display a summary table
   */
  summary(data: Record<string, string | number | boolean>): void {
    this.newLine();
    const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length));

    for (const [key, value] of Object.entries(data)) {
      const paddedKey = key.padEnd(maxKeyLength);
      console.log(
        chalk.gray('  '),
        chalk.white(paddedKey),
        chalk.gray(':'),
        chalk.cyan(String(value))
      );
    }
    this.newLine();
  }

  /**
   * Display a box with content
   */
  box(title: string, content: string[]): void {
    const maxLength = Math.max(title.length, ...content.map(c => c.length));
    const border = '─'.repeat(maxLength + 4);

    console.log(chalk.gray('┌' + border + '┐'));
    console.log(chalk.gray('│'), chalk.bold.white(title.padEnd(maxLength + 2)), chalk.gray('│'));
    console.log(chalk.gray('├' + border + '┤'));

    for (const line of content) {
      console.log(chalk.gray('│'), line.padEnd(maxLength + 2), chalk.gray('│'));
    }

    console.log(chalk.gray('└' + border + '┘'));
  }

  /**
   * Display banner
   */
  banner(): void {
    console.log(chalk.cyan(`
   ╔═══════════════════════════════════════════╗
   ║                                           ║
   ║   ${chalk.bold.white('Auto Commit CLI')}                        ║
   ║   ${chalk.gray('Generate commits with custom dates')}      ║
   ║                                           ║
   ╚═══════════════════════════════════════════╝
    `));
  }
}

// Global logger instance
export const logger = new Logger();
