import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
import { Member } from '../../../libs/dto/member/member';
import { GraphQLRequest, HttpRequest, GraphQLContext } from '../../../libs/types/common';

export const AuthMember = createParamDecorator(
	(data: string | undefined, context: ExecutionContext): Member | Member[keyof Member] | null => {
		let request: GraphQLRequest | HttpRequest;

		if (context.getType<GqlContextType>() === 'graphql') {
			const gqlContext = GqlExecutionContext.create(context);
			const gqlCtx = gqlContext.getContext<GraphQLContext>();
			const graphqlRequest = gqlCtx?.req;
			if (!graphqlRequest) {
				return null;
			}
			request = graphqlRequest;
			if (request.body?.authMember && request.headers?.authorization) {
				request.body.authMember.authorization = request.headers.authorization;
			}
		} else {
			request = context.switchToHttp().getRequest<HttpRequest>();
		}

		const member = request?.body?.authMember;

		if (member) {
			if (data) {
				return member[data as keyof Member];
			}
			return member as Member;
		}
		return null;
	},
);
