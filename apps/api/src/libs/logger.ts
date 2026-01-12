/**
 * Standardized logging utility for consistent log formatting across the application.
 * All logs include timestamps and follow a consistent format.
 */

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR',
}

class AppLogger {
	private getTimestamp(): string {
		return new Date().toISOString();
	}

	private formatArg(arg: unknown): string {
		if (arg === null || arg === undefined) {
			return String(arg);
		}

		switch (typeof arg) {
			case 'string':
				return arg;
			case 'number':
			case 'boolean':
			case 'bigint':
				return String(arg);
			case 'symbol':
				return arg.toString();
			case 'function':
				return `[Function: ${(arg as () => unknown).name || 'anonymous'}]`;
			case 'object':
				try {
					return JSON.stringify(arg);
				} catch {
					return '[Object]';
				}
			default:
				return '[Unknown]';
		}
	}

	private formatMessage(level: LogLevel, context: string, message: string, ...args: unknown[]): string {
		const timestamp = this.getTimestamp();
		const contextStr = context ? `[${context}]` : '';
		const levelStr = `[${level}]`;
		const argsStr = args.length > 0 ? ` ${args.map((arg) => this.formatArg(arg)).join(' ')}` : '';
		return `${timestamp} ${levelStr} ${contextStr} ${message}${argsStr}`;
	}

	debug(context: string, message: string, ...args: unknown[]): void {
		console.debug(this.formatMessage(LogLevel.DEBUG, context, message, ...args));
	}

	info(context: string, message: string, ...args: unknown[]): void {
		console.log(this.formatMessage(LogLevel.INFO, context, message, ...args));
	}

	warn(context: string, message: string, ...args: unknown[]): void {
		console.warn(this.formatMessage(LogLevel.WARN, context, message, ...args));
	}

	error(context: string, message: string, error?: unknown, ...args: unknown[]): void {
		let errorMsg: string;
		if (error instanceof Error) {
			errorMsg = error.message;
		} else if (error === null || error === undefined) {
			errorMsg = '';
		} else {
			errorMsg = this.formatArg(error);
		}
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error(this.formatMessage(LogLevel.ERROR, context, message, errorMsg, ...args));
		if (errorStack) {
			console.error(`[${this.getTimestamp()}] [${LogLevel.ERROR}] [${context}] Stack:`, errorStack);
		}
	}

	logMemory(context: string, label: string): void {
		const used = process.memoryUsage();
		this.info(context, `[${label}] Memory Usage:`);
		this.info(context, `   Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`);
		this.info(context, `   RSS (Total): ${(used.rss / 1024 / 1024).toFixed(2)} MB`);
	}
}

export const logger = new AppLogger();
