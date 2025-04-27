import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { AuthService } from '../auth/auth.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { Member, Members } from '../../libs/dto/member/member';
import { LoginInput, MemberInput, MembersInquiry, OrganizersInquiry } from '../../libs/dto/member/member.input';
import { MemberUpdateInput, PasswordUpdateInput } from '../../libs/dto/member/member.update';
import { Follower, Following, MeFollowed } from '../../libs/dto/follow/follow';
import { LikeGroup } from '../../libs/enums/like.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { LikeInput } from '../../libs/dto/like/like.input';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		private authService: AuthService,
	) {}

	public async signup(input: MemberInput): Promise<Member> {
		try {
			// Check if username or phone already exists
			const existingMember = await this.memberModel.findOne({ username: input.username });

			if (existingMember) {
				throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
			}

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

	public async updateMember(memberId: ObjectId, input: MemberUpdateInput): Promise<Member> {
		const { _id, emailVerified, memberStatus, ...otherInput } = input;

		const result: Member | null = await this.memberModel.findByIdAndUpdate(memberId, otherInput, { new: true }).exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);

		result.accessToken = await this.authService.createToken(result);
		return result;
	}

	public async getMember(memberId: ObjectId | null, targetId: ObjectId): Promise<Member> {
		const targetMember: Member | null = await this.memberModel.findById(targetId).lean().exec();
		if (!targetMember) throw new BadRequestException(Message.NO_DATA_FOUND);

		if (memberId) {
			// TODO: Implement views, likes, follows tracking
			// await this.trackMemberInteraction(memberId, targetId);
		}

		return targetMember;
	}

	public async getOrganizers(memberId: ObjectId | null, input: OrganizersInquiry): Promise<Members> {
		const { text } = input.search;
		const match: T = {
			memberType: MemberType.ORGANIZER,
			memberStatus: MemberStatus.ACTIVE,
		};
		if (text) match.username = { $regex: new RegExp(text, 'i') };

		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		// TODO: add views, likes, follows if memberId is provided
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

	public async likeTargetMember(memberId: ObjectId, likeRefId: ObjectId): Promise<Member> {
		const target: Member | null = await this.memberModel
			.findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE })
			.exec();

		if (!target) throw new BadRequestException(Message.NO_DATA_FOUND);

		// TODO: Implement like functionality
		// const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.MEMBER };
		// const modifier = await this.likeService.toggleLike(input);
		// const result = await this.memberStatsEditor({ _id: likeRefId, targetKey: 'memberLikes', modifier });
		// if (!result) throw new BadRequestException(Message.SOMETHING_WENT_WRONG);
		// return result;

		return target;
	}

	public async deleteAccount(memberId: ObjectId): Promise<Member> {
		const result: Member | null = await this.memberModel.findByIdAndDelete(memberId).exec();
		if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result;
	}

	// ADMIN ONLY
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

	public async deleteMemberByAdmin(memberId: ObjectId): Promise<Member> {
		const result: Member | null = await this.memberModel.findByIdAndDelete(memberId).exec();
		if (!result) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result;
	}

	// Other
	public async memberStatsEditor(input: StatisticModifier): Promise<Member> {
		const { _id, targetKey, modifier } = input;

		const result = await this.memberModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}
}
