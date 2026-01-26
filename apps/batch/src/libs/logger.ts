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
	private readonly DEFAULT_TRUNCATE_LENGTH = 80;

	/**
	 * Truncate a string if it exceeds maxLength
	 */
	private truncate(str: string, maxLength: number = this.DEFAULT_TRUNCATE_LENGTH): string {
		if (str.length <= maxLength) return str;
		return `${str.substring(0, maxLength)}... [truncated ${str.length - maxLength} more chars, ${str.length} total]`;
	}

	private formatArg(arg: unknown, truncate: boolean = false, maxLength?: number): string {
		if (arg === null || arg === undefined) return String(arg);
		// Check for object type (but not null, which we already handled)
		if (typeof arg === 'object') {
			try {
				const jsonStr = JSON.stringify(arg);
				return truncate ? this.truncate(jsonStr, maxLength) : jsonStr;
			} catch {
				return '[object Object]';
			}
		}
		// At this point, arg is a primitive type (string, number, boolean, symbol, bigint)
		// Use explicit type narrowing to avoid no-base-to-string error
		if (typeof arg === 'string') {
			return truncate ? this.truncate(arg, maxLength) : arg;
		}
		if (typeof arg === 'number') return String(arg);
		if (typeof arg === 'boolean') return String(arg);
		// For symbol and bigint, convert explicitly
		if (typeof arg === 'symbol') return arg.toString();
		if (typeof arg === 'bigint') return arg.toString();
		// This should never be reached, but TypeScript needs exhaustive handling
		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return String(arg);
	}

	private formatMessage(level: LogLevel, context: string, message: string, ...args: unknown[]): string {
		const contextStr = context ? `[${context}]` : '';
		const levelStr = `[${level}]`;
		const argsStr = args.length > 0 ? ` ${args.map((arg) => this.formatArg(arg)).join(' ')}` : '';
		return `${levelStr} ${contextStr} ${message}${argsStr}`;
	}

	debug(context: string, message: string, ...args: unknown[]): void {
		console.debug(this.formatMessage(LogLevel.DEBUG, context, message, ...args));
	}

	info(context: string, message: string, ...args: unknown[]): void {
		console.info(this.formatMessage(LogLevel.INFO, context, message, ...args));
	}

	warn(context: string, message: string, ...args: unknown[]): void {
		console.warn(this.formatMessage(LogLevel.WARN, context, message, ...args));
	}

	error(context: string, message: string, error?: Error, ...args: unknown[]): void {
		const errorMsg = error instanceof Error ? error.message : String(error ?? '');
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error(this.formatMessage(LogLevel.ERROR, context, message, errorMsg, ...args));
		if (errorStack) {
			console.error(`[${LogLevel.ERROR}] [${context}] Stack:`, errorStack);
		}
	}

	/**
	 * Log HTTP request with automatic truncation
	 */
	logRequest(context: string, method: string, url: string, body?: unknown, maxLength?: number): void {
		this.debug(context, `→ ${method} ${this.truncate(url, maxLength)}`);
		if (body) {
			const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
			this.debug(context, `  Body: ${this.truncate(bodyStr, maxLength)}`);
		}
	}

	/**
	 * Log HTTP response with automatic truncation
	 */
	logResponse(context: string, status: number, data?: unknown, maxLength?: number): void {
		this.debug(context, `← Response ${status}`);
		if (data) {
			const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
			this.debug(context, `  Data: ${this.truncate(dataStr, maxLength)}`);
		}
	}

	/**
	 * Log any data with automatic truncation (useful for API responses, large objects, etc.)
	 */
	logTruncated(level: LogLevel, context: string, message: string, data: unknown, maxLength?: number): void {
		const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
		const truncatedData = this.truncate(dataStr, maxLength);

		switch (level) {
			case LogLevel.DEBUG:
				this.debug(context, message, truncatedData);
				break;
			case LogLevel.INFO:
				this.info(context, message, truncatedData);
				break;
			case LogLevel.WARN:
				this.warn(context, message, truncatedData);
				break;
			case LogLevel.ERROR:
				console.error(this.formatMessage(LogLevel.ERROR, context, message, truncatedData));
				break;
		}
	}
}

export const logger = new AppLogger();
