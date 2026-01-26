import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { HttpRequest, GraphQLContext } from '../types/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger: Logger = new Logger();

	// Implements the required intercept method that runs before and after request handling.
	public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const recordTime = Date.now(); // Records the start time to calculate request duration later.
		const requestType = context.getType<GqlContextType>(); // Determines if the request is HTTP or GraphQL.

		if (requestType === 'http') {
			const request = context.switchToHttp().getRequest<HttpRequest>();
			this.logger.verbose(`HTTP Request: ${request.method ?? 'UNKNOWN'} ${request.url ?? 'UNKNOWN'}`, 'REQUEST');

			return next.handle().pipe(
				tap((response) => {
					const responseTime = Date.now() - recordTime;
					const responseStr = this.truncateResponse(response);
					this.logger.verbose(`HTTP Response: ${responseStr} - ${responseTime}ms\n\n`, 'RESPONSE');
				}),
				catchError((error: Error) => {
					const responseTime = Date.now() - recordTime;
					this.logger.error(`HTTP Error: ${error.message} - ${responseTime}ms\n\n`, error.stack ?? '', 'ERROR');
					return throwError(() => error);
				}),
			);
		} else if (requestType === 'graphql') {
			// (1) Print request
			const gqlContext = GqlExecutionContext.create(context);
			const gqlCtx = gqlContext.getContext<GraphQLContext>();
			if (gqlCtx?.req?.body) {
				this.logger.verbose(`${this.stringify(gqlCtx.req.body)}`, 'REQUEST');
			}

			// (2) Errors handling via graphql
			// (3) error-free response
			return next.handle().pipe(
				tap((response) => {
					const responseTime = Date.now() - recordTime;
					this.logger.verbose(`${this.stringify(response)} - ${responseTime}ms \n\n`, 'RESPONSE');
				}),
				catchError((error: Error) => {
					const responseTime = Date.now() - recordTime;
					this.logger.error(`GraphQL Error: ${error.message} - ${responseTime}ms\n\n`, error.stack ?? '', 'ERROR');
					return throwError(() => error);
				}),
			);
		}
		return next.handle();
	}

	private stringify(data: unknown): string {
		try {
			return JSON.stringify(data).slice(0, 75);
		} catch {
			return String(data).slice(0, 75);
		}
	}

	private truncateResponse(response: unknown): string {
		try {
			const responseStr = JSON.stringify(response);
			return responseStr.length > 70 ? responseStr.slice(0, 70) + '...' : responseStr;
		} catch {
			const responseStr = String(response);
			return responseStr.length > 70 ? responseStr.slice(0, 70) + '...' : responseStr;
		}
	}
}
