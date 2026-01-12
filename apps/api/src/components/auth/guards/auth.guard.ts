import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from '../auth.service';
import { Message } from '../../../libs/enums/common.enum';
import { GraphQLRequest, HttpRequest, GraphQLContext } from '../../../libs/types/common';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(private authService: AuthService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		console.info('--- @guard() Authentication [AuthGuard] ---');

		let request: GraphQLRequest | HttpRequest;
		if (context.getType<GqlContextType>() === 'graphql') {
			const gqlContext = GqlExecutionContext.create(context);
			const gqlCtx = gqlContext.getContext<GraphQLContext>();
			const graphqlRequest = gqlCtx?.req;

			if (!graphqlRequest) {
				throw new BadRequestException(Message.TOKEN_NOT_EXIST);
			}

			request = graphqlRequest;
		} else if (context.getType() === 'http') {
			request = context.switchToHttp().getRequest<HttpRequest>();
		} else return false;

		const bearerToken = request.headers?.authorization;
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
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('Authentication error:', errorMessage);
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}
	}
}
