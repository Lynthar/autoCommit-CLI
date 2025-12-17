import { describe, it, expect } from 'vitest';
import { Validator } from '../src/utils/validator.js';

describe('Validator', () => {
  describe('isValidDateFormat', () => {
    it('should accept valid dates', () => {
      expect(Validator.isValidDateFormat('2024-01-01')).toBe(true);
      expect(Validator.isValidDateFormat('2024-12-31')).toBe(true);
      expect(Validator.isValidDateFormat('2000-06-15')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(Validator.isValidDateFormat('01-01-2024')).toBe(false);
      expect(Validator.isValidDateFormat('2024/01/01')).toBe(false);
      expect(Validator.isValidDateFormat('2024-1-1')).toBe(false);
      expect(Validator.isValidDateFormat('invalid')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(Validator.isValidDateFormat('2024-13-01')).toBe(false);
      expect(Validator.isValidDateFormat('2024-02-30')).toBe(false);
    });
  });

  describe('isValidTimeFormat', () => {
    it('should accept valid times', () => {
      expect(Validator.isValidTimeFormat('00:00')).toBe(true);
      expect(Validator.isValidTimeFormat('09:30')).toBe(true);
      expect(Validator.isValidTimeFormat('23:59')).toBe(true);
    });

    it('should reject invalid times', () => {
      expect(Validator.isValidTimeFormat('24:00')).toBe(false);
      expect(Validator.isValidTimeFormat('12:60')).toBe(false);
      expect(Validator.isValidTimeFormat('9:30')).toBe(false);
      expect(Validator.isValidTimeFormat('09:30:00')).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('should accept valid ranges', () => {
      expect(Validator.isValidDateRange('2024-01-01', '2024-12-31')).toBe(true);
      expect(Validator.isValidDateRange('2024-06-15', '2024-06-15')).toBe(true);
    });

    it('should reject invalid ranges', () => {
      expect(Validator.isValidDateRange('2024-12-31', '2024-01-01')).toBe(false);
      expect(Validator.isValidDateRange('invalid', '2024-12-31')).toBe(false);
    });
  });

  describe('isValidCommitsPerDay', () => {
    it('should accept valid ranges', () => {
      expect(Validator.isValidCommitsPerDay(1, 5)).toBe(true);
      expect(Validator.isValidCommitsPerDay(0, 1)).toBe(true);
      expect(Validator.isValidCommitsPerDay(10, 50)).toBe(true);
    });

    it('should reject invalid ranges', () => {
      expect(Validator.isValidCommitsPerDay(-1, 5)).toBe(false);
      expect(Validator.isValidCommitsPerDay(5, 3)).toBe(false); // min > max
      expect(Validator.isValidCommitsPerDay(1, 51)).toBe(false);
      expect(Validator.isValidCommitsPerDay(1.5, 5)).toBe(false);
    });
  });

  describe('isValidProbability', () => {
    it('should accept valid probabilities', () => {
      expect(Validator.isValidProbability(0)).toBe(true);
      expect(Validator.isValidProbability(0.5)).toBe(true);
      expect(Validator.isValidProbability(1)).toBe(true);
    });

    it('should reject invalid probabilities', () => {
      expect(Validator.isValidProbability(-0.1)).toBe(false);
      expect(Validator.isValidProbability(1.1)).toBe(false);
    });
  });

  describe('isValidSkipDays', () => {
    it('should accept valid skip days', () => {
      expect(Validator.isValidSkipDays([])).toBe(true);
      expect(Validator.isValidSkipDays([0, 6])).toBe(true);
      expect(Validator.isValidSkipDays([0, 1, 2, 3, 4, 5, 6])).toBe(true);
    });

    it('should reject invalid skip days', () => {
      expect(Validator.isValidSkipDays([-1])).toBe(false);
      expect(Validator.isValidSkipDays([7])).toBe(false);
      expect(Validator.isValidSkipDays([1.5])).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate complete config', () => {
      const result = Validator.validateConfig({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        commitsPerDay: { min: 1, max: 5 },
        skipDays: [0, 6],
        skipProbability: 0.1,
        timeRange: { start: '09:00', end: '18:00' },
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing required fields', () => {
      const result = Validator.validateConfig({});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report invalid date range', () => {
      const result = Validator.validateConfig({
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('before'))).toBe(true);
    });
  });
});
