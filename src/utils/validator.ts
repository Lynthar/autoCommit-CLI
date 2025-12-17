import { parseISO, isValid, isFuture } from 'date-fns';
import { GitService } from '../core/git-service.js';
import { Config, AutoCommitError, ErrorCode } from '../types/index.js';

/**
 * Validator - Input validation utilities
 */
export class Validator {
  /**
   * Validate date string format (YYYY-MM-DD)
   */
  static isValidDateFormat(dateStr: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }

    const date = parseISO(dateStr);
    return isValid(date);
  }

  /**
   * Validate time string format (HH:MM)
   */
  static isValidTimeFormat(timeStr: string): boolean {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeStr);
  }

  /**
   * Validate that start date is before or equal to end date
   */
  static isValidDateRange(startDate: string, endDate: string): boolean {
    if (!this.isValidDateFormat(startDate) || !this.isValidDateFormat(endDate)) {
      return false;
    }

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    return start <= end;
  }

  /**
   * Check if date is in the future
   */
  static isDateInFuture(dateStr: string): boolean {
    if (!this.isValidDateFormat(dateStr)) {
      return false;
    }

    return isFuture(parseISO(dateStr));
  }

  /**
   * Validate commits per day range
   */
  static isValidCommitsPerDay(min: number, max: number): boolean {
    return (
      Number.isInteger(min) &&
      Number.isInteger(max) &&
      min >= 0 &&
      max >= 1 &&
      min <= max &&
      max <= 50
    );
  }

  /**
   * Validate skip probability
   */
  static isValidProbability(prob: number): boolean {
    return typeof prob === 'number' && prob >= 0 && prob <= 1;
  }

  /**
   * Validate skip days array
   */
  static isValidSkipDays(days: number[]): boolean {
    return days.every(day => Number.isInteger(day) && day >= 0 && day <= 6);
  }

  /**
   * Comprehensive config validation
   */
  static validateConfig(config: Partial<Config>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!config.startDate) {
      errors.push('Start date is required');
    } else if (!this.isValidDateFormat(config.startDate)) {
      errors.push(`Invalid start date format: "${config.startDate}". Use YYYY-MM-DD format.`);
    }

    if (!config.endDate) {
      errors.push('End date is required');
    } else if (!this.isValidDateFormat(config.endDate)) {
      errors.push(`Invalid end date format: "${config.endDate}". Use YYYY-MM-DD format.`);
    }

    // Validate date range
    if (config.startDate && config.endDate) {
      if (!this.isValidDateRange(config.startDate, config.endDate)) {
        errors.push('Start date must be before or equal to end date');
      }
    }

    // Validate commits per day
    if (config.commitsPerDay) {
      if (!this.isValidCommitsPerDay(config.commitsPerDay.min, config.commitsPerDay.max)) {
        errors.push('Commits per day must be integers between 0-50, and min must be <= max');
      }
    }

    // Validate time range
    if (config.timeRange) {
      if (!this.isValidTimeFormat(config.timeRange.start)) {
        errors.push(`Invalid start time format: "${config.timeRange.start}". Use HH:MM format.`);
      }
      if (!this.isValidTimeFormat(config.timeRange.end)) {
        errors.push(`Invalid end time format: "${config.timeRange.end}". Use HH:MM format.`);
      }
    }

    // Validate skip probability
    if (config.skipProbability !== undefined && !this.isValidProbability(config.skipProbability)) {
      errors.push('Skip probability must be a number between 0 and 1');
    }

    // Validate skip days
    if (config.skipDays && !this.isValidSkipDays(config.skipDays)) {
      errors.push('Skip days must be integers between 0 (Sunday) and 6 (Saturday)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Pre-flight checks before generating commits
   */
  static async preflightChecks(
    repoPath: string,
    config: Config
  ): Promise<{ passed: boolean; warnings: string[]; errors: string[] }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const gitService = new GitService(repoPath);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo();
    if (!isRepo) {
      errors.push(`"${repoPath}" is not a Git repository`);
      return { passed: false, warnings, errors };
    }

    // Get repo status
    const status = await gitService.getRepoStatus();

    // Check for uncommitted changes (warning)
    if (status.hasUncommittedChanges) {
      warnings.push('Repository has uncommitted changes. They will be preserved.');
    }

    // Check remote connection
    if (!status.remoteUrl) {
      warnings.push('No remote configured. Commits will only be local.');
    } else if (!status.isConnected) {
      warnings.push('Cannot connect to remote. Push may fail.');
    }

    // Check if end date is in the future (warning)
    if (this.isDateInFuture(config.endDate)) {
      warnings.push('End date is in the future. Future-dated commits may look suspicious.');
    }

    // Validate config
    const configValidation = this.validateConfig(config);
    errors.push(...configValidation.errors);

    return {
      passed: errors.length === 0,
      warnings,
      errors,
    };
  }
}
