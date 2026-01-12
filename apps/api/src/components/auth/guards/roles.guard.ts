import { BadRequestException, CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';
import { GraphQLRequest } from '../../../libs/types/common';

interface GraphQLExecutionContext {
	contextType?: string;
	getArgByIndex: (index: number) => { req?: GraphQLRequest };
}

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const handler = context.getHandler();
		const roles = this.reflector.get<string[]>('roles', handler);
		if (!roles) return true;

		console.info(`--- @guard() Authentication [RolesGuard]: ${roles.join(', ')} ---`);

		const graphqlContext = context as ExecutionContext & GraphQLExecutionContext;
		if (graphqlContext.contextType === 'graphql' && typeof graphqlContext.getArgByIndex === 'function') {
			const graphqlArgs: { req?: GraphQLRequest } = graphqlContext.getArgByIndex(2);
			const request: GraphQLRequest | undefined = graphqlArgs?.req;

			if (!request) {
				throw new BadRequestException(Message.TOKEN_NOT_EXIST);
			}

			const bearerToken: string | undefined = request.headers?.authorization;

			if (!bearerToken) {
				console.error('No bearer token provided');
				throw new BadRequestException(Message.TOKEN_NOT_EXIST);
			}

			try {
				const tokenParts: string[] = bearerToken.split(' ');
				const token: string | undefined = tokenParts[1];
				if (!token) {
					console.error('Invalid token format');
					throw new BadRequestException(Message.TOKEN_NOT_EXIST);
				}

				const authMember = await this.authService.verifyToken(token);
				if (!authMember) {
					console.error('Token verification failed');
					throw new ForbiddenException(Message.NOT_AUTHENTICATED);
				}

				const hasRole = () => roles.indexOf(authMember.memberType) > -1;
				const hasPermission: boolean = hasRole();

				if (!hasPermission) {
					console.error(`User ${authMember.username} does not have required roles: ${roles.join(', ')}`);
					throw new ForbiddenException(Message.NOT_AUTHORIZED);
				}

				console.log('username[roles] =>', authMember.username);

				// Ensure request.body exists
				if (!request.body) {
					request.body = {};
				}
				request.body.authMember = authMember;
				return true;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				console.error('Role verification error:', errorMessage);
				throw new ForbiddenException(Message.NOT_AUTHORIZED);
			}
		}

		// description => http, rpc, gprs and etc are ignored
		return false;
	}
}
