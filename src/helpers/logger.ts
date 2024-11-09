import { OutputChannel, window } from "vscode";
import { format } from "date-fns";

/**
 * Logger class
 */
export class Logger {
  private static instance: Logger;
  public static channel: OutputChannel | null = null;

  private constructor() {
    const displayName = "TS Barrel Exports";
    Logger.channel = window.createOutputChannel(displayName);
  }

  /**
   * Get the instance of the Logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Log a message
   * @param message
   * @param type
   */
  public static info(message: string, type: "INFO" | "WARNING" | "ERROR" = "INFO"): void {
    if (!Logger.channel) {
      Logger.getInstance();
    }

    Logger.channel?.appendLine(`["${type}" - ${format(new Date(), "HH:MM:ss")}]  ${message}`);
  }

  /**
   * Log a warning message
   * @param message
   */
  public static warning(message: string): void {
    Logger.info(message, "WARNING");
  }

  /**
   * Log an error message
   * @param message
   */
  public static error(message: string): void {
    Logger.info(message, "ERROR");
  }

  /**
   * Log an error with a message and error object
   * @param message
   * @param error
   */
  public static logError(message: string, error: unknown): void {
    if (error instanceof Error) {
      Logger.error(`${message}: ${error.message}`);
    } else {
      Logger.error(`${message}: ${String(error)}`);
    }
  }
}
