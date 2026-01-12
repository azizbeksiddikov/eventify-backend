import type { ObjectId } from 'mongoose';
import type { Member } from '../dto/member/member';

export interface T {
	[key: string]: any;
}

export interface StatisticModifier {
	_id: ObjectId;
	targetKey: string;
	modifier: number;
}

export interface GraphQLRequestBody {
	authMember?: (Member & { authorization?: string }) | null;
}

export interface GraphQLRequest {
	headers?: {
		authorization?: string;
	};
	body?: GraphQLRequestBody;
}

export interface HttpRequest {
	headers?: {
		authorization?: string;
	};
	body?: {
		authMember?: Member & {
			authorization?: string;
		};
	};
	method?: string;
	url?: string;
}

export interface GraphQLContext {
	req?: GraphQLRequest;
}
