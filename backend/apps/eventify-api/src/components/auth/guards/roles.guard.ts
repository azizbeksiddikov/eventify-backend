import { BadRequestException, CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		private authService: AuthService,
	) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		const roles = this.reflector.get<string[]>('roles', context.getHandler());
		if (!roles) return true;

		console.info(`--- @guard() Authentication [RolesGuard]: ${roles} ---`);

		if (context.contextType === 'graphql') {
			const request = context.getArgByIndex(2).req;
			const bearerToken = request.headers.authorization;

			if (!bearerToken) {
				console.error('No bearer token provided');
				throw new BadRequestException(Message.TOKEN_NOT_EXIST);
			}

			try {
				const token = bearerToken.split(' ')[1];
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
					throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);
				}

				console.log('memberNick[roles] =>', authMember.username);
				request.body.authMember = authMember;
				return true;
			} catch (error) {
				console.error('Role verification error:', error.message);
				throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);
			}
		}

		// description => http, rpc, gprs and etc are ignored
		return false;
	}
}
