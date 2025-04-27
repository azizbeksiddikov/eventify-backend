import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		console.info('--- @guard() Authentication [AuthGuard] ---');

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
					throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
				}

				console.log('memberNick[auth] =>', authMember.username);
				request.body.authMember = authMember;
				return true;
			} catch (error) {
				console.error('Authentication error:', error.message);
				throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
			}
		}

		return false;
	}
}
