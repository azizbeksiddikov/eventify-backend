import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	private readonly logger: Logger = new Logger();

	// Implements the required intercept method that runs before and after request handling.
	public intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const recordTime = Date.now(); // Records the start time to calculate request duration later.
		const requestType = context.getType<GqlContextType>(); // Determines if the request is HTTP or GraphQL.

		if (requestType === 'http') {
			const request = context.switchToHttp().getRequest();
			this.logger.verbose(`HTTP Request: ${request.method} ${request.url}`, 'REQUEST');

			return next.handle().pipe(
				tap((response) => {
					const responseTime = Date.now() - recordTime;
					this.logger.verbose(`HTTP Response: ${JSON.stringify(response)} - ${responseTime}ms\n\n`, 'RESPONSE');
				}),
			);
		} else if (requestType === 'graphql') {
			// (1) Print request
			const gqlContext = GqlExecutionContext.create(context);
			this.logger.verbose(`${this.stringify(gqlContext.getContext().req.body)}`, 'REQUEST');

			// (2) Errors handling  via graphql

			// (3) error-free response
			return next.handle().pipe(
				tap((context) => {
					const responseTime = Date.now() - recordTime;
					this.logger.verbose(`${this.stringify(context)} - ${responseTime}ms \n\n`, 'RESPONSE');
				}),
			);
		}
		return next.handle();
	}

	private stringify(context: ExecutionContext): string {
		return JSON.stringify(context).slice(0, 75);
	}
}
