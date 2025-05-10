import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { Direction, Message } from '../../libs/enums/common.enum';

// ===== DTOs =====
import { Comment, Comments } from '../../libs/dto/comment/comment';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';

// ===== Types =====
import { T } from '../../libs/types/common';

// ===== Config =====
import { lookupMember } from '../../libs/config';

// ===== Services =====
import { NotificationInput } from '../../libs/dto/notification/notification.input';
import { NotificationType } from '../../libs/enums/notification';
import { EventService } from '../event/event.service';
import { GroupService } from '../group/group.service';
import { MemberService } from '../member/member.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		private readonly memberService: MemberService,
		private readonly eventService: EventService,
		private readonly groupService: GroupService,
		private readonly notificationService: NotificationService,
	) {}

	// ============== Comment Management Methods ==============
	public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
		input.memberId = memberId;
		let result: Comment | null = null;

		try {
			result = await this.commentModel.create(input);
		} catch (err) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		const newNotification: NotificationInput = {
			memberId: memberId,
			notificationType: NotificationType.COMMENT_MEMBER,
			receiverId: input.commentRefId,
			notificationLink: `/organizer/detail?organizerId=${input.commentRefId}`,
		};

		switch (input.commentGroup) {
			case CommentGroup.MEMBER:
				await this.memberService.memberStatsEditor({
					_id: input.commentRefId,
					targetKey: 'memberComments',
					modifier: 1,
				});
				await this.notificationService.createNotification(newNotification);
				break;

			case CommentGroup.EVENT:
				const event = await this.eventService.eventStatsEditor({
					_id: input.commentRefId,
					targetKey: 'eventComments',
					modifier: 1,
				});
				await this.notificationService.createNotification({
					...newNotification,
					receiverId: event.memberId,
					notificationLink: `/event/detail?eventId=${input.commentRefId}`,
					notificationType: NotificationType.COMMENT_EVENT,
				});
				break;

			case CommentGroup.GROUP:
				const group = await this.groupService.groupStatsEditor({
					_id: input.commentRefId,
					targetKey: 'groupComments',
					modifier: 1,
				});
				await this.notificationService.createNotification({
					...newNotification,
					receiverId: group.memberId,
					notificationLink: `/group/detail?groupId=${input.commentRefId}`,
					notificationType: NotificationType.COMMENT_GROUP,
				});
				break;
		}

		if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
		return result;
	}

	public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
		const { _id } = input;
		const result = await this.commentModel
			.findOneAndUpdate({ _id: _id, memberId: memberId, commentStatus: CommentStatus.ACTIVE }, input, { new: true })
			.exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}

	// ============== Comment Query Methods ==============
	public async getComments(memberId: ObjectId, input: CommentsInquiry): Promise<Comments> {
		const { commentRefId } = input.search;
		const match: T = { commentRefId: commentRefId, commentStatus: CommentStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.commentModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	// ============== Admin Methods ==============
	public async removeCommentByAdmin(commentId: ObjectId): Promise<Comment> {
		const result = await this.commentModel.findByIdAndDelete(commentId).exec();

		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}
}
