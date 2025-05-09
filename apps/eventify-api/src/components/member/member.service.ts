import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Query } from 'mongoose';

// ===== Enums =====
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';

// ===== Types & DTOs =====
import { Member, Members } from '../../libs/dto/member/member';
import { StatisticModifier, T } from '../../libs/types/common';
import { LoginInput, MemberInput, MembersInquiry, OrganizersInquiry } from '../../libs/dto/member/member.input';
import { MemberUpdateInput, PasswordUpdateInput } from '../../libs/dto/member/member.update';
import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';
import { LikeInput } from '../../libs/dto/like/like.input';
import { ViewInput } from '../../libs/dto/view/view.input';

// ===== Config =====
import { lookupAuthMemberFollowed, lookupAuthMemberLiked } from '../../libs/config';

// ===== Services =====
import { AuthService } from '../auth/auth.service';
import { LikeService } from '../like/like.service';
import { ViewService } from '../view/view.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		private authService: AuthService,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
	) {}

	// ============== Authentication Methods ==============
	public async signup(input: MemberInput): Promise<Member> {
		try {
			if (input.memberType === MemberType.ADMIN) {
				const adminCount = await this.memberModel.countDocuments({ memberType: MemberType.ADMIN });
				if (adminCount >= 3) throw new BadRequestException(Message.ADMIN_COUNT_MAX);
			}

			const existingMember = await this.memberModel.findOne({ username: input.username });
			if (existingMember) throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);

			input.memberPassword = await this.authService.hashPassword(input.memberPassword);

			const newMember: Member = await this.memberModel.create(input);

			newMember.accessToken = await this.authService.createToken(newMember);

			return newMember;
		} catch (err) {
			console.error('Error in signup:', err.message);
			throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
		}
	}

	public async login(input: LoginInput): Promise<Member> {
		const { username, memberPassword } = input;

		const result: Member | null = await this.memberModel
			.findOne({ username: username })
			.select('+memberPassword')
			.exec();

		if (!result) throw new BadRequestException(Message.NO_MEMBER_NICK);
		if (result.memberStatus === MemberStatus.BLOCKED) {
			throw new BadRequestException(Message.BLOCKED_USER);
		}

		const isMatch = await this.authService.comparePasswords(memberPassword, result.memberPassword);
		if (!isMatch) throw new BadRequestException(Message.WRONG_PASSWORD);

		result.accessToken = await this.authService.createToken(result);
		return result;
	}

	public async updatePassword(memberId: ObjectId, input: PasswordUpdateInput): Promise<Member> {
		const { currentPassword, newPassword } = input;

		let result: Member | null = await this.memberModel.findById(memberId).select('+memberPassword').exec();
		if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);

		const isMatch = await this.authService.comparePasswords(currentPassword, result.memberPassword);
		if (!isMatch) throw new BadRequestException(Message.WRONG_PASSWORD);

		const hashedPassword = await this.authService.hashPassword(newPassword);
		result = await this.memberModel
			.findByIdAndUpdate(memberId, { memberPassword: hashedPassword }, { new: true })
			.exec();

		result.accessToken = await this.authService.createToken(result);
		return result;
	}

	public async resetPassword(memberId: ObjectId, password: string): Promise<Member> {
		const newPassword = await this.authService.hashPassword(password);

		const result: Member | null = await this.memberModel
			.findByIdAndUpdate(memberId, { memberPassword: newPassword }, { new: true })
			.exec();

		if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result;
	}

	// ============== Profile Management Methods ==============
	public async updateMember(memberId: ObjectId, input: MemberUpdateInput): Promise<Member> {
		const { _id, emailVerified, memberStatus, ...otherInput } = input;

		const result: Member | null = await this.memberModel.findByIdAndUpdate(memberId, otherInput, { new: true }).exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

		result.accessToken = await this.authService.createToken(result);
		return result;
	}

	public async deleteAccount(memberId: ObjectId): Promise<Member> {
		const result: Member | null = await this.memberModel.findByIdAndDelete(memberId).exec();
		if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result;
	}

	// ============== Member Interaction Methods ==============
	public async getMember(memberId: ObjectId | null, targetId: ObjectId): Promise<Member> {
		const targetMember: Member | null = await this.memberModel.findById(targetId).lean().exec();
		if (!targetMember) throw new BadRequestException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput: ViewInput = {
				viewGroup: ViewGroup.MEMBER,
				viewRefId: targetId,
				memberId: memberId,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.memberModel.findByIdAndUpdate(targetId, { $inc: { memberViews: 1 } }).exec();
				targetMember.memberViews++;
			}
			const likeInput: LikeInput = { memberId: memberId, likeRefId: targetId, likeGroup: LikeGroup.MEMBER };
			targetMember.meLiked = await this.likeService.checkLikeExistence(likeInput);

			targetMember.meFollowed = await this.checkSubscription(memberId, targetId);
		}

		return targetMember;
	}

	public async getOrganizers(memberId: ObjectId | null, input: OrganizersInquiry): Promise<Members> {
		const { text } = input.search;
		const match: T = {
			memberType: MemberType.ORGANIZER,
			memberStatus: MemberStatus.ACTIVE,
		};
		if (text) {
			match.$or = [
				{ username: { $regex: new RegExp(text, 'i') } },
				{ memberFullName: { $regex: new RegExp(text, 'i') } },
			];
		}
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupAuthMemberLiked(memberId),
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$_id' }),
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new BadRequestException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getOrganizer(memberId: ObjectId | null, targetId: ObjectId): Promise<Member> {
		const result = await this.memberModel
			.aggregate([
				// Match the requested member
				{ $match: { _id: targetId } },

				// Add organizedEvents events to the result
				{
					$lookup: {
						from: 'events',
						let: { memberId: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: {
										$and: [
											{ $eq: ['$memberId', '$$memberId'] },
											{ $gte: ['$eventDate', new Date(new Date().setDate(new Date().getDate() - 7))] },
											{
												$lte: ['$eventDate', new Date(new Date().setMonth(new Date().getMonth() + 1))],
											},
										],
									},
								},
							},
							lookupAuthMemberLiked(memberId),
						],
						as: 'organizedEvents',
					},
				},

				// Add organizedGroups to the result
				{
					$lookup: {
						from: 'groups',
						let: { memberId: '$_id' },
						pipeline: [
							{
								$match: {
									$expr: {
										$eq: ['$memberId', '$$memberId'],
									},
								},
							},
							{ $sort: { groupViews: -1 } },
							{ $limit: 5 },
						],
						as: 'organizedGroups',
					},
				},
				lookupAuthMemberLiked(memberId),
				lookupAuthMemberFollowed({ followerId: memberId, followingId: '$_id' }),
			])
			.exec();

		if (!result.length) throw new NotFoundException(Message.MEMBER_NOT_FOUND);
		const member = result[0];

		if (memberId) {
			const viewInput: ViewInput = {
				viewGroup: ViewGroup.MEMBER,
				viewRefId: targetId,
				memberId: memberId,
			};
			const newView = await this.viewService.recordView(viewInput);
			if (newView) {
				await this.memberModel.findByIdAndUpdate(targetId, { $inc: { memberViews: 1 } }).exec();
				member.memberViews++;
			}
		}

		return member;
	}

	public async likeTargetMember(memberId: ObjectId, likeRefId: ObjectId): Promise<Member> {
		const member: Member | null = await this.memberModel
			.findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE })
			.lean()
			.exec();
		if (!member) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId: memberId, likeRefId: likeRefId, likeGroup: LikeGroup.MEMBER };

		const modifier = await this.likeService.toggleLike(input, member._id);
		await this.memberStatsEditor({ _id: likeRefId, targetKey: 'memberLikes', modifier: modifier });
		member.memberLikes += modifier;

		if (modifier > 0) {
			member.meLiked = [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }];
		} else {
			member.meLiked = [];
		}

		return member;
	}

	// ============== Admin Only Methods ==============
	public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
		const { memberStatus, memberType, text } = input.search;
		const match: T = {};
		if (memberStatus) match.memberStatus = memberStatus;
		if (memberType) match.memberType = memberType;
		if (text) match.username = { $regex: new RegExp(text, 'i') };

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new BadRequestException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updateMemberByAdmin(input: MemberUpdateInput): Promise<Member> {
		const { _id, ...otherInput } = input;
		if (!_id) throw new BadRequestException(Message.NO_DATA_FOUND);

		const result: Member | null = await this.memberModel.findByIdAndUpdate(input._id, input, { new: true }).exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}

	public async removeMemberByAdmin(memberId: ObjectId): Promise<Member> {
		const result: Member | null = await this.memberModel.findByIdAndDelete(memberId).exec();
		if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result;
	}

	// ============== Helper Methods ==============
	private async checkSubscription(followerId: ObjectId, followingId: ObjectId): Promise<MeFollowed[]> {
		const result = await this.followModel.findOne({ followerId: followerId, followingId: followingId }).exec();
		return result ? [{ followingId: followingId, followerId: followerId, myFollowing: true }] : [];
	}

	public async memberStatsEditor(input: StatisticModifier): Promise<Member> {
		const { _id, targetKey, modifier } = input;

		const result = await this.memberModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}
}
