# Auto Commit CLI

A powerful, robust, and user-friendly CLI tool for generating Git commits with custom dates.

## Features

- **Cross-platform**: Works on any terminal - no VSCode required
- **Safe Git operations**: Uses `simple-git` library instead of shell exec
- **Comprehensive error handling**: Clear error messages with suggestions
- **Dry-run mode**: Preview commits before executing
- **Progress visualization**: Real-time progress bar and status updates
- **Graceful interruption**: Ctrl+C safely rolls back partial operations
- **Flexible configuration**: CLI options, config files, or interactive wizard
- **Smart date handling**: Skip weekends, random skip days, custom time ranges

## Installation

```bash
# Install globally
npm install -g auto-commit-cli

# Or run directly with npx
npx auto-commit-cli
```

## Quick Start

```bash
# Initialize configuration interactively
auto-commit init

# Preview commits (dry-run)
auto-commit generate --dry-run

# Generate commits
auto-commit generate

# Or specify dates directly
auto-commit generate --from 2024-01-01 --to 2024-12-31
```

## Commands

### `init`

Create a configuration file interactively.

```bash
auto-commit init
auto-commit init --output custom-config.json
```

### `generate`

Generate commits with custom dates.

```bash
# Basic usage
auto-commit generate --from 2024-01-01 --to 2024-06-30

# With options
auto-commit generate \
  --from 2024-01-01 \
  --to 2024-12-31 \
  --min 1 \
  --max 5 \
  --skip-weekends \
  --message "feat: auto commit {{date}}"

# Dry-run mode
auto-commit generate --from 2024-01-01 --to 2024-03-31 --dry-run

# Auto push after generation
auto-commit generate --from 2024-01-01 --to 2024-03-31 --push
```

**Options:**

| Option | Description |
|--------|-------------|
| `-f, --from <date>` | Start date (YYYY-MM-DD) |
| `-t, --to <date>` | End date (YYYY-MM-DD) |
| `-r, --repo <path>` | Repository path |
| `-m, --message <template>` | Commit message template |
| `--min <number>` | Minimum commits per day |
| `--max <number>` | Maximum commits per day |
| `--skip-weekends` | Skip Saturday and Sunday |
| `--skip-days <days>` | Days to skip (0=Sun, 6=Sat) |
| `--skip-prob <probability>` | Random skip probability (0-1) |
| `--time-start <time>` | Start time (HH:MM) |
| `--time-end <time>` | End time (HH:MM) |
| `--target-file <file>` | File to modify |
| `--push` | Push after generating |
| `--dry-run` | Preview without executing |
| `-y, --yes` | Skip confirmation |
| `-v, --verbose` | Verbose output |

### `rollback`

Undo generated commits.

```bash
# Interactive rollback
auto-commit rollback

# Rollback specific number
auto-commit rollback 10

# Skip confirmation
auto-commit rollback 5 -y
```

### `status`

Show repository and configuration status.

```bash
auto-commit status
```

## Configuration File

Create `.autocommitrc.json` in your project:

```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "commitsPerDay": {
    "min": 1,
    "max": 5
  },
  "commitMessage": "feat: auto commit {{date}} #{{index}}",
  "targetFile": ".auto-commit-log",
  "skipDays": [0, 6],
  "skipProbability": 0.1,
  "timeRange": {
    "start": "09:00",
    "end": "18:00"
  },
  "autoPush": false
}
```

### Message Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{date}}` | Date (YYYY-MM-DD) | 2024-06-15 |
| `{{datetime}}` | Date and time | 2024-06-15 14:30:00 |
| `{{time}}` | Time (HH:mm:ss) | 14:30:00 |
| `{{index}}` | Commit index | 42 |
| `{{year}}` | Year | 2024 |
| `{{month}}` | Month | 06 |
| `{{day}}` | Day | 15 |

## Comparison with Original

| Feature | Original (VSCode) | This CLI |
|---------|-------------------|----------|
| Platform | VSCode only | Any terminal |
| Git operations | Shell exec | simple-git library |
| Error handling | Basic | Comprehensive |
| Preview mode | No | Yes (dry-run) |
| Progress display | Basic | Progress bar |
| Interruption handling | Limited | Graceful rollback |
| Configuration | UI only | File + CLI + Interactive |
| Testing | Hard | Easy |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Run tests
npm test

# Link for local testing
npm link
```

## License

MIT

## Disclaimer

This tool is intended for learning and demonstration purposes only. Use responsibly and ethically.
