import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../auth.service';
import { GraphQLContext } from '../../../libs/types/common';
import { logger } from '../../../libs/logger';

@Injectable()
export class WithoutGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		logger.debug('WithoutGuard', '--- @guard() Authentication [WithoutGuard] ---');

		if (context.getType<GqlContextType>() === 'graphql') {
			const gqlContext = GqlExecutionContext.create(context);
			const gqlCtx = gqlContext.getContext<GraphQLContext>();
			const request = gqlCtx?.req;

			if (!request) return true;

			const bearerToken = request.headers?.authorization;

			if (bearerToken) {
				try {
					const tokenParts = bearerToken.split(' ');
					const token = tokenParts[1];
					if (token) {
						const authMember = await this.authService.verifyToken(token);
						if (!request.body) {
							request.body = { authMember: null };
						}
						request.body.authMember = authMember;
					} else {
						if (!request.body) {
							request.body = { authMember: null };
						}
						request.body.authMember = null;
					}
				} catch {
					if (!request.body) {
						request.body = { authMember: null };
					}
					request.body.authMember = null;
				}
			} else {
				if (!request.body) {
					request.body = { authMember: null };
				}
				request.body.authMember = null;
			}

			const authMember = request.body?.authMember;
			logger.debug('WithoutGuard', `username[without] => ${authMember?.username ?? 'none'}`);
			return true;
		}

		// description => http, rpc, gprs and etc are ignored
		return false;
	}
}
