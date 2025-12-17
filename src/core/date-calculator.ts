import {
  parseISO,
  eachDayOfInterval,
  getDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isAfter,
  isBefore,
  isValid,
  format,
} from 'date-fns';
import { Config, CommitPlan, AutoCommitError, ErrorCode } from '../types/index.js';

/**
 * DateCalculator - Handles all date-related calculations for commit generation
 */
export class DateCalculator {
  /**
   * Parse time string (HH:MM) to hours and minutes
   */
  private parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  }

  /**
   * Generate a random time within the specified range
   */
  private generateRandomTime(startTime: string, endTime: string): { hours: number; minutes: number; seconds: number } {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);

    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;

    const randomMinutes = Math.floor(Math.random() * (endMinutes - startMinutes + 1)) + startMinutes;
    const randomSeconds = Math.floor(Math.random() * 60);

    return {
      hours: Math.floor(randomMinutes / 60),
      minutes: randomMinutes % 60,
      seconds: randomSeconds,
    };
  }

  /**
   * Validate date range
   */
  validateDateRange(startDate: string, endDate: string): void {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (!isValid(start)) {
      throw new AutoCommitError(
        `Invalid start date: "${startDate}"`,
        ErrorCode.INVALID_DATE_RANGE
      );
    }

    if (!isValid(end)) {
      throw new AutoCommitError(
        `Invalid end date: "${endDate}"`,
        ErrorCode.INVALID_DATE_RANGE
      );
    }

    if (isAfter(start, end)) {
      throw new AutoCommitError(
        `Start date (${startDate}) must be before or equal to end date (${endDate})`,
        ErrorCode.INVALID_DATE_RANGE
      );
    }
  }

  /**
   * Get all days in the date range, excluding skipped days
   */
  getDaysInRange(startDate: string, endDate: string, skipDays: number[] = []): Date[] {
    this.validateDateRange(startDate, endDate);

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const allDays = eachDayOfInterval({ start, end });

    // Filter out skipped days (by day of week)
    return allDays.filter(day => !skipDays.includes(getDay(day)));
  }

  /**
   * Generate random number of commits for a day
   */
  getRandomCommitCount(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Check if a day should be skipped based on probability
   */
  shouldSkipDay(probability: number): boolean {
    return Math.random() < probability;
  }

  /**
   * Generate a commit plan based on configuration
   */
  generateCommitPlan(config: Config): CommitPlan[] {
    const plan: CommitPlan[] = [];

    const days = this.getDaysInRange(
      config.startDate,
      config.endDate,
      config.skipDays
    );

    let commitIndex = 0;

    for (const day of days) {
      // Check if we should skip this day
      if (this.shouldSkipDay(config.skipProbability)) {
        continue;
      }

      // Generate random number of commits for this day
      const commitCount = this.getRandomCommitCount(
        config.commitsPerDay.min,
        config.commitsPerDay.max
      );

      // Generate commits for this day
      for (let i = 0; i < commitCount; i++) {
        const time = this.generateRandomTime(
          config.timeRange.start,
          config.timeRange.end
        );

        let commitDate = setHours(day, time.hours);
        commitDate = setMinutes(commitDate, time.minutes);
        commitDate = setSeconds(commitDate, time.seconds);
        commitDate = setMilliseconds(commitDate, Math.floor(Math.random() * 1000));

        const message = this.formatCommitMessage(
          config.commitMessage,
          commitDate,
          commitIndex
        );

        plan.push({
          date: commitDate,
          time: format(commitDate, 'HH:mm:ss'),
          message,
          index: commitIndex,
        });

        commitIndex++;
      }
    }

    // Sort by date to ensure chronological order
    plan.sort((a, b) => a.date.getTime() - b.date.getTime());

    return plan;
  }

  /**
   * Format commit message with placeholders
   */
  formatCommitMessage(template: string, date: Date, index: number): string {
    return template
      .replace(/\{\{date\}\}/g, format(date, 'yyyy-MM-dd'))
      .replace(/\{\{datetime\}\}/g, format(date, 'yyyy-MM-dd HH:mm:ss'))
      .replace(/\{\{time\}\}/g, format(date, 'HH:mm:ss'))
      .replace(/\{\{index\}\}/g, String(index + 1))
      .replace(/\{\{year\}\}/g, format(date, 'yyyy'))
      .replace(/\{\{month\}\}/g, format(date, 'MM'))
      .replace(/\{\{day\}\}/g, format(date, 'dd'));
  }

  /**
   * Estimate the total number of commits based on configuration
   */
  estimateCommitCount(config: Config): { min: number; max: number; expected: number } {
    const days = this.getDaysInRange(
      config.startDate,
      config.endDate,
      config.skipDays
    );

    const effectiveDays = days.length * (1 - config.skipProbability);

    return {
      min: Math.floor(effectiveDays * config.commitsPerDay.min),
      max: Math.floor(effectiveDays * config.commitsPerDay.max),
      expected: Math.floor(effectiveDays * (config.commitsPerDay.min + config.commitsPerDay.max) / 2),
    };
  }

  /**
   * Get date statistics
   */
  getDateStats(startDate: string, endDate: string, skipDays: number[] = []): {
    totalDays: number;
    weekdays: number;
    weekends: number;
    activeDays: number;
  } {
    const allDays = this.getDaysInRange(startDate, endDate, []);
    const activeDays = this.getDaysInRange(startDate, endDate, skipDays);

    const weekends = allDays.filter(day => {
      const dayOfWeek = getDay(day);
      return dayOfWeek === 0 || dayOfWeek === 6;
    }).length;

    return {
      totalDays: allDays.length,
      weekdays: allDays.length - weekends,
      weekends,
      activeDays: activeDays.length,
    };
  }
}
