import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';

// ===== Guards & Decorators =====
import { AuthGuard } from '../auth/guards/auth.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

// ===== Enums =====
import { MemberType } from '../../libs/enums/member.enum';

// ===== DTOs =====
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { Comment, Comments } from '../../libs/dto/comment/comment';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';

// ===== Services =====
import { CommentService } from './comment.service';

// ===== Config =====
import { shapeIntoMongoObjectId } from '../../libs/config';
import { logger } from '../../libs/logger';

@Resolver()
export class CommentResolver {
	constructor(private readonly commentService: CommentService) {}

	// ============== Comment Management Methods ==============
	@UseGuards(AuthGuard)
	@Mutation(() => Comment)
	public async createComment(
		@Args('input') input: CommentInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Comment> {
		logger.debug('CommentResolver', 'Mutation: createComment');
		return await this.commentService.createComment(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Comment)
	public async updateComment(
		@Args('input') input: CommentUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Comment> {
		logger.debug('CommentResolver', 'Mutation: updateComment');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.commentService.updateComment(memberId, input);
	}

	// ============== Comment Query Methods ==============
	@UseGuards(WithoutGuard)
	@Query(() => Comments)
	public async getComments(
		@Args('input') input: CommentsInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Comments> {
		logger.debug('CommentResolver', 'Query: getComments');
		input.search.commentRefId = shapeIntoMongoObjectId(input.search.commentRefId);
		return await this.commentService.getComments(memberId, input);
	}

	// ============== Admin Methods ==============
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Comment)
	public async removeCommentByAdmin(@Args('commentId') input: string): Promise<Comment> {
		logger.debug('CommentResolver', 'Mutation: removeCommentByAdmin');
		const commentId = shapeIntoMongoObjectId(input);
		return await this.commentService.removeCommentByAdmin(commentId);
	}
}
