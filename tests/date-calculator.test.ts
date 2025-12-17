import { describe, it, expect } from 'vitest';
import { DateCalculator } from '../src/core/date-calculator.js';
import { Config } from '../src/types/index.js';

describe('DateCalculator', () => {
  const calculator = new DateCalculator();

  describe('validateDateRange', () => {
    it('should accept valid date range', () => {
      expect(() => calculator.validateDateRange('2024-01-01', '2024-12-31')).not.toThrow();
    });

    it('should accept same start and end date', () => {
      expect(() => calculator.validateDateRange('2024-06-15', '2024-06-15')).not.toThrow();
    });

    it('should reject invalid start date', () => {
      expect(() => calculator.validateDateRange('invalid', '2024-12-31')).toThrow();
    });

    it('should reject invalid end date', () => {
      expect(() => calculator.validateDateRange('2024-01-01', 'invalid')).toThrow();
    });

    it('should reject when start date is after end date', () => {
      expect(() => calculator.validateDateRange('2024-12-31', '2024-01-01')).toThrow();
    });
  });

  describe('getDaysInRange', () => {
    it('should return correct number of days', () => {
      const days = calculator.getDaysInRange('2024-01-01', '2024-01-10');
      expect(days).toHaveLength(10);
    });

    it('should return single day for same date', () => {
      const days = calculator.getDaysInRange('2024-06-15', '2024-06-15');
      expect(days).toHaveLength(1);
    });

    it('should skip specified days', () => {
      // Skip Sunday (0) and Saturday (6)
      const days = calculator.getDaysInRange('2024-01-01', '2024-01-07', [0, 6]);
      // Jan 1-7 2024: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
      // Skipping Sat and Sun leaves 5 days
      expect(days.length).toBeLessThan(7);
    });
  });

  describe('getRandomCommitCount', () => {
    it('should return value within range', () => {
      for (let i = 0; i < 100; i++) {
        const count = calculator.getRandomCommitCount(1, 5);
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(5);
      }
    });

    it('should return exact value when min equals max', () => {
      const count = calculator.getRandomCommitCount(3, 3);
      expect(count).toBe(3);
    });
  });

  describe('formatCommitMessage', () => {
    const testDate = new Date('2024-06-15T14:30:45.000Z');

    it('should replace {{date}} placeholder', () => {
      const message = calculator.formatCommitMessage('commit: {{date}}', testDate, 0);
      expect(message).toContain('2024-06-15');
    });

    it('should replace {{index}} placeholder', () => {
      const message = calculator.formatCommitMessage('commit #{{index}}', testDate, 41);
      expect(message).toBe('commit #42');
    });

    it('should replace multiple placeholders', () => {
      const message = calculator.formatCommitMessage('{{date}} - commit #{{index}}', testDate, 0);
      expect(message).toContain('2024-06-15');
      expect(message).toContain('#1');
    });
  });

  describe('generateCommitPlan', () => {
    it('should generate commits within date range', () => {
      const config: Config = {
        repoPath: '.',
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        commitsPerDay: { min: 1, max: 1 },
        commitMessage: 'test',
        targetFile: '.test',
        skipDays: [],
        skipProbability: 0,
        timeRange: { start: '09:00', end: '18:00' },
        autoPush: false,
      };

      const plan = calculator.generateCommitPlan(config);

      expect(plan.length).toBe(5); // 5 days, 1 commit each
      expect(plan[0].date.getFullYear()).toBe(2024);
    });

    it('should skip weekends when configured', () => {
      const config: Config = {
        repoPath: '.',
        startDate: '2024-01-01', // Monday
        endDate: '2024-01-07', // Sunday
        commitsPerDay: { min: 1, max: 1 },
        commitMessage: 'test',
        targetFile: '.test',
        skipDays: [0, 6], // Skip Sunday and Saturday
        skipProbability: 0,
        timeRange: { start: '09:00', end: '18:00' },
        autoPush: false,
      };

      const plan = calculator.generateCommitPlan(config);

      // Should have fewer commits due to skipped days
      expect(plan.length).toBeLessThan(7);
    });
  });

  describe('estimateCommitCount', () => {
    it('should estimate correct range', () => {
      const config: Config = {
        repoPath: '.',
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        commitsPerDay: { min: 2, max: 4 },
        commitMessage: 'test',
        targetFile: '.test',
        skipDays: [],
        skipProbability: 0,
        timeRange: { start: '09:00', end: '18:00' },
        autoPush: false,
      };

      const estimate = calculator.estimateCommitCount(config);

      expect(estimate.min).toBe(20); // 10 days * 2
      expect(estimate.max).toBe(40); // 10 days * 4
      expect(estimate.expected).toBe(30); // 10 days * 3 (average)
    });
  });

  describe('getDateStats', () => {
    it('should return correct stats', () => {
      const stats = calculator.getDateStats('2024-01-01', '2024-01-31');

      expect(stats.totalDays).toBe(31);
      expect(stats.weekdays + stats.weekends).toBe(31);
    });

    it('should calculate active days correctly', () => {
      const stats = calculator.getDateStats('2024-01-01', '2024-01-07', [0, 6]);

      expect(stats.totalDays).toBe(7);
      expect(stats.activeDays).toBeLessThan(7);
    });
  });
});
