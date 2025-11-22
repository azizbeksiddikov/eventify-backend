import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext | any): Promise<boolean> {
		console.info('--- @guard() Authentication [AuthGuard] ---');

		let request: any;
		if (context.contextType === 'graphql') {
			request = context.getArgByIndex(2).req;
		} else if (context.contextType === 'http') {
			request = context.switchToHttp().getRequest();
		} else return false;

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

			console.log('username[auth] =>', authMember.username);

			// Ensure request.body exists (may be undefined for multipart/form-data)
			if (!request.body) {
				request.body = {};
			}
			request.body.authMember = authMember;
			return true;
		} catch (error) {
			console.error('Authentication error:', error.message);
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}
	}
}
