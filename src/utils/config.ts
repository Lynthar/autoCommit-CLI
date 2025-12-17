import { cosmiconfig } from 'cosmiconfig';
import { Config, ConfigSchema, PartialConfig, AutoCommitError, ErrorCode } from '../types/index.js';
import fs from 'fs/promises';
import path from 'path';

const MODULE_NAME = 'autocommit';

/**
 * ConfigManager - Handles configuration loading and saving
 */
export class ConfigManager {
  private explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: [
      'package.json',
      `.${MODULE_NAME}rc`,
      `.${MODULE_NAME}rc.json`,
      `.${MODULE_NAME}rc.yaml`,
      `.${MODULE_NAME}rc.yml`,
      `.${MODULE_NAME}.config.js`,
      `.${MODULE_NAME}.config.cjs`,
      `${MODULE_NAME}.config.js`,
      `${MODULE_NAME}.config.cjs`,
    ],
  });

  /**
   * Load configuration from file or use defaults
   */
  async loadConfig(configPath?: string): Promise<Config | null> {
    try {
      let result;

      if (configPath) {
        result = await this.explorer.load(configPath);
      } else {
        result = await this.explorer.search();
      }

      if (result && result.config) {
        return this.validateAndMergeConfig(result.config);
      }

      return null;
    } catch (error) {
      throw new AutoCommitError(
        `Failed to load configuration: ${error}`,
        ErrorCode.INVALID_CONFIG
      );
    }
  }

  /**
   * Validate and merge config with defaults
   */
  validateAndMergeConfig(config: unknown): Config {
    try {
      return ConfigSchema.parse(config);
    } catch (error) {
      throw new AutoCommitError(
        `Invalid configuration: ${error}`,
        ErrorCode.INVALID_CONFIG
      );
    }
  }

  /**
   * Create config from CLI options and merge with file config
   */
  mergeWithCliOptions(fileConfig: Config | null, cliOptions: PartialConfig): Config {
    const merged = {
      ...this.getDefaultConfig(),
      ...(fileConfig || {}),
      ...cliOptions,
    };

    // Handle nested objects properly
    if (cliOptions.commitsPerDay || fileConfig?.commitsPerDay) {
      merged.commitsPerDay = {
        ...this.getDefaultConfig().commitsPerDay,
        ...(fileConfig?.commitsPerDay || {}),
        ...(cliOptions.commitsPerDay || {}),
      };
    }

    if (cliOptions.timeRange || fileConfig?.timeRange) {
      merged.timeRange = {
        ...this.getDefaultConfig().timeRange,
        ...(fileConfig?.timeRange || {}),
        ...(cliOptions.timeRange || {}),
      };
    }

    return this.validateAndMergeConfig(merged);
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): Config {
    return {
      repoPath: '.',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      commitsPerDay: { min: 1, max: 5 },
      commitMessage: 'auto commit: {{date}}',
      targetFile: '.auto-commit-log',
      skipDays: [],
      skipProbability: 0,
      timeRange: { start: '09:00', end: '18:00' },
      autoPush: false,
      branch: undefined,
    };
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: Config, filePath?: string): Promise<string> {
    const targetPath = filePath || `.${MODULE_NAME}rc.json`;
    const fullPath = path.resolve(targetPath);

    // Remove undefined values
    const cleanConfig = JSON.parse(JSON.stringify(config));

    await fs.writeFile(
      fullPath,
      JSON.stringify(cleanConfig, null, 2) + '\n',
      'utf-8'
    );

    return fullPath;
  }

  /**
   * Generate sample config
   */
  getSampleConfig(): Config {
    return {
      repoPath: '.',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      commitsPerDay: { min: 1, max: 5 },
      commitMessage: 'feat: auto commit {{date}} #{{index}}',
      targetFile: '.auto-commit-log',
      skipDays: [0, 6], // Skip weekends
      skipProbability: 0.1, // 10% chance to skip any day
      timeRange: { start: '09:00', end: '18:00' },
      autoPush: false,
      branch: undefined,
    };
  }

  /**
   * Check if config file exists
   */
  async configExists(): Promise<boolean> {
    const result = await this.explorer.search();
    return result !== null;
  }

  /**
   * Get config file path if exists
   */
  async getConfigPath(): Promise<string | null> {
    const result = await this.explorer.search();
    return result?.filepath || null;
  }
}

// Global config manager instance
export const configManager = new ConfigManager();
