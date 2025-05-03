import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { GroupMemberRole } from '../../libs/enums/group.enum';
import { Direction, Message } from '../../libs/enums/common.enum';

// ===== Types & DTOs =====
import { StatisticModifier, T } from '../../libs/types/common';
import { Group, Groups, MeJoined } from '../../libs/dto/group/group';
import { GroupInput, GroupsInquiry } from '../../libs/dto/group/group.input';
import { GroupUpdateInput } from '../../libs/dto/group/group.update';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { GroupMemberInput } from '../../libs/dto/groupMembers/groupMember.input';
import { GroupMemberUpdateInput } from '../../libs/dto/groupMembers/groupMember.update';
import { Member } from '../../libs/dto/member/member';
import { MemberStatus } from '../../libs/enums/member.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeService } from '../like/like.service';
import { lookupAuthMemberJoined, lookupAuthMemberLiked } from '../../libs/config';
import { lookupMember } from '../../libs/config';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
@Injectable()
export class GroupService {
	constructor(
		@InjectModel(Group.name) private readonly groupModel: Model<Group>,
		@InjectModel('GroupMember') private readonly groupMemberModel: Model<GroupMember>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
	) {}

	// ============== Group Management Methods ==============
	public async createGroup(memberId: ObjectId, input: GroupInput): Promise<Group> {
		const member = await this.memberModel.findById(memberId);
		if (!member) throw new NotFoundException(Message.MEMBER_NOT_FOUND);

		try {
			const newGroup: Group = await this.groupModel.create({
				...input,
				memberId: memberId,
			});

			// Create group member record for the owner
			const newGroupMember: GroupMemberInput = {
				groupId: newGroup._id,
				memberId: memberId,
				groupMemberRole: GroupMemberRole.OWNER,
				joinDate: new Date(),
			};
			const groupMember = await this.groupMemberModel.create(newGroupMember);

			return newGroup;
		} catch (err) {
			console.error('Error in createGroup:', err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	public async getGroup(memberId: ObjectId | null, groupId: ObjectId): Promise<Group> {
		// find a group
		const group: Group | null = await this.groupModel.findById(groupId).lean().exec();
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		// find a group owner
		group.memberData = (await this.memberModel.findById(group.memberId).lean().exec()) as unknown as Member;

		if (memberId) {
			// update group views if new view
			const newView = await this.viewService.recordView({
				memberId: memberId,
				viewGroup: ViewGroup.GROUP,
				viewRefId: groupId,
			});
			if (newView) {
				group.groupViews += 1;
				await this.groupStatsEditor({ _id: groupId, targetKey: 'groupViews', modifier: 1 });
			}

			// check for meLiked
			group.meLiked = await this.likeService.checkMeLiked({
				likeGroup: LikeGroup.GROUP,
				memberId: memberId,
				likeRefId: groupId,
			});

			// check for meJoined
			group.meJoined = await this.checkMeJoined(memberId, groupId);
		}
		return group;
	}

	public async getGroups(memberId: ObjectId | null, input: GroupsInquiry): Promise<Groups> {
		const { page, limit, search } = input;
		const skip = (page - 1) * limit;
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const match: T = {};
		if (search?.text) {
			match.$or = [
				{ groupName: { $regex: search.text, $options: 'i' } },
				{ groupDesc: { $regex: search.text, $options: 'i' } },
			];
		}
		if (search?.groupCategories?.length) {
			match.groupCategories = { $in: search.groupCategories };
		}

		const result = await this.groupModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: skip },
							{ $limit: limit },
							lookupAuthMemberLiked(memberId),
							lookupAuthMemberJoined(memberId),
							lookupMember,
							{ $unwind: '$memberData' },
							// check for meJoined
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async getMyGroups(memberId: ObjectId): Promise<Group[]> {
		const groups = await this.groupModel.find({ memberId: memberId }).sort({ createdAt: -1 }).exec();
		return groups;
	}

	public async updateGroup(memberId: ObjectId, input: GroupUpdateInput): Promise<Group> {
		const group: Group | null = await this.groupModel.findById(input._id);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);
		if (group.memberId.toString() !== memberId.toString()) {
			throw new BadRequestException(Message.NOT_GROUP_ADMIN);
		}

		if (input.groupCategories?.length > 3) input.groupCategories = input.groupCategories.slice(0, 3);
		return await this.groupModel.findByIdAndUpdate(input._id, { ...input }, { new: true });
	}

	public async deleteGroup(memberId: ObjectId, groupId: ObjectId): Promise<Group> {
		const group = await this.groupModel.findById(groupId);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);
		if (group.memberId.toString() !== memberId.toString()) {
			throw new BadRequestException(Message.NOT_GROUP_ADMIN);
		}

		return await this.groupModel.findByIdAndDelete(groupId);
	}

	public async likeTargetGroup(memberId: ObjectId, groupId: ObjectId): Promise<Group> {
		const target: Group | null = await this.groupModel.findOne({ _id: groupId }).lean().exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId: memberId, likeRefId: groupId, likeGroup: LikeGroup.GROUP };

		const modifier = await this.likeService.toggleLike(input);
		this.groupStatsEditor({ _id: groupId, targetKey: 'groupLikes', modifier: modifier });

		target.groupLikes += modifier;
		target.meLiked = await this.likeService.checkMeLiked(input);
		return target;
	}

	// ============== Group Member Methods ==============
	public async joinGroup(memberId: ObjectId, groupId: ObjectId): Promise<Group> {
		const group: Group | null = await this.groupModel.findById(groupId).lean().exec();
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		const groupMemberExists: GroupMember | null = await this.groupMemberModel.findOne({ groupId, memberId });
		if (groupMemberExists) throw new BadRequestException(Message.ALREADY_JOINED);

		const newGroupMemberInput: GroupMemberInput = {
			groupId: groupId,
			memberId: memberId,
			groupMemberRole: GroupMemberRole.MEMBER,
			joinDate: new Date(),
		};

		const groupMember = await this.groupMemberModel.create(newGroupMemberInput);
		if (!groupMember) throw new BadRequestException(Message.CREATE_FAILED);

		await this.groupStatsEditor({ _id: groupId, targetKey: 'memberCount', modifier: 1 });

		group.memberCount += 1;
		group.meJoined = [{ ...newGroupMemberInput, meJoined: true }];
		return group;
	}

	public async leaveGroup(memberId: ObjectId, groupId: ObjectId): Promise<Group> {
		const group: Group | null = await this.groupModel.findById(groupId).lean().exec();
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		const groupMember: GroupMember | null = await this.groupMemberModel.findOne({ groupId, memberId }).lean().exec();
		if (!groupMember) throw new BadRequestException(Message.NOT_JOINED);

		if (group.memberId.toString() === memberId.toString()) {
			throw new BadRequestException(Message.OWNER_CANNOT_LEAVE);
		}

		await this.groupMemberModel.findOneAndDelete({ groupId, memberId });

		if (groupMember.groupMemberRole !== GroupMemberRole.BANNED) {
			await this.groupStatsEditor({ _id: groupId, targetKey: 'memberCount', modifier: -1 });
			group.memberCount -= 1;
		}

		group.meJoined = [];
		return group;
	}

	public async updateGroupMemberRole(memberId: ObjectId, input: GroupMemberUpdateInput): Promise<GroupMember> {
		const { groupId, targetMemberId, groupMemberRole } = input;

		// Check if the requesting member is an organizer of the group
		const group = await this.groupModel.findById(groupId);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);
		if (group.memberId.toString() !== memberId.toString()) {
			throw new BadRequestException(Message.NOT_GROUP_ADMIN);
		}

		// Check if target member exists
		const targetMember = await this.memberModel.findById(targetMemberId);
		if (!targetMember) throw new NotFoundException(Message.MEMBER_NOT_FOUND);

		// Update member role
		const updatedMember = await this.groupMemberModel.findOneAndUpdate(
			{ groupId, memberId: targetMemberId },
			{ groupMemberRole },
			{ new: true },
		);

		if (groupMemberRole === GroupMemberRole.BANNED) {
			await this.groupStatsEditor({ _id: groupId, targetKey: 'memberCount', modifier: -1 });
		}

		if (!updatedMember) throw new BadRequestException(Message.UPDATE_FAILED);
		return updatedMember;
	}

	private async checkMeJoined(memberId: ObjectId, groupId: ObjectId): Promise<MeJoined[]> {
		const meJoined = await this.groupMemberModel.findOne({ groupId: groupId, memberId: memberId });
		if (!meJoined) return [];
		const meJoinedData: MeJoined = {
			memberId: meJoined.memberId,
			groupId: meJoined.groupId,
			groupMemberRole: meJoined.groupMemberRole,
			joinDate: meJoined.joinDate,
			meJoined: true,
		};

		return [meJoinedData];
	}

	// ============== Helper Methods ==============
	public async groupStatsEditor(input: StatisticModifier): Promise<Group> {
		const { _id, targetKey, modifier } = input;

		const result = await this.groupModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}
}
