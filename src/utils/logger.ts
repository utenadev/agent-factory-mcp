import chalk from 'chalk';
import { LOG_PREFIX } from '../constants.js';

// Check if colors should be disabled
const shouldDisableColors = (): boolean => {
  return (
    process.env.NO_COLOR !== undefined ||
    process.env.TERM === 'dumb' ||
    !process.stdin.isTTY
  );
};

// Disable chalk colors if needed
if (shouldDisableColors()) {
  chalk.level = 0;
}

export class Logger {
  static debug(...args: any[]) {
    if (process.env.DEBUG) {
      console.log(chalk.gray(LOG_PREFIX, ...args));
    }
  }

  static info(...args: any[]) {
    console.log(chalk.blue(LOG_PREFIX, ...args));
  }

  static warn(...args: any[]) {
    console.warn(chalk.yellow(LOG_PREFIX, ...args));
  }

  static error(...args: any[]) {
    console.error(chalk.red(LOG_PREFIX, ...args));
  }

  static success(...args: any[]) {
    console.log(chalk.green(LOG_PREFIX, ...args));
  }

  static toolInvocation(toolName: string, args: any) {
    console.log(chalk.cyan(`${LOG_PREFIX} [TOOL] ${toolName}`, JSON.stringify(args, null, 2)));
  }
}