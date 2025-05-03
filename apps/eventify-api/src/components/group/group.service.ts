import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { GroupMemberRole } from '../../libs/enums/group.enum';
import { Direction, Message } from '../../libs/enums/common.enum';

// ===== Types & DTOs =====
import { StatisticModifier, T } from '../../libs/types/common';
import { Group, Groups } from '../../libs/dto/group/group';
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
import { lookupAuthMemberLiked } from '../../libs/config';
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
		const existingGroup = await this.groupModel.findOne({ groupLink: input.groupLink });
		if (existingGroup) throw new BadRequestException(Message.GROUP_ALREADY_EXISTS);

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
		const group: Group | null = await this.groupModel.findById(groupId).lean().exec();
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		if (memberId) {
			const newView = await this.viewService.recordView({
				memberId: memberId,
				viewGroup: ViewGroup.GROUP,
				viewRefId: groupId,
			});
			if (newView) {
				group.groupViews += 1;
				await this.groupStatsEditor({ _id: groupId, targetKey: 'groupViews', modifier: 1 });
			}

			// check for meLIked
			group.meLiked = await this.likeService.checkMeLiked({
				memberId: memberId,
				likeGroup: LikeGroup.GROUP,
				likeRefId: groupId,
			});
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
							lookupMember,
							{ $unwind: '$memberData' },
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

		if (input.groupLink) {
			const existingGroup = await this.groupModel.findOne({ groupLink: input.groupLink });
			if (existingGroup) throw new BadRequestException(Message.GROUP_ALREADY_EXISTS);
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
		const target: Group | null = await this.groupModel.findOne({ _id: groupId }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId: memberId, likeRefId: groupId, likeGroup: LikeGroup.GROUP };

		const modifier = await this.likeService.toggleLike(input);
		const result = await this.groupStatsEditor({ _id: groupId, targetKey: 'groupLikes', modifier: modifier });
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

		return result;
	}

	// ============== Group Member Methods ==============
	public async joinGroup(memberId: ObjectId, groupId: ObjectId): Promise<GroupMember> {
		const groupExists = await this.groupModel.findById(groupId);
		if (!groupExists) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		const memberExists = await this.groupMemberModel.findOne({ groupId, memberId });
		if (memberExists) throw new BadRequestException(Message.ALREADY_JOINED);

		const newGroupMember: GroupMemberInput = {
			groupId,
			memberId,
			groupMemberRole: GroupMemberRole.MEMBER,
			joinDate: new Date(),
		};

		const groupMember = await this.groupMemberModel.create(newGroupMember);
		if (!groupMember) throw new BadRequestException(Message.CREATE_FAILED);

		await this.groupStatsEditor({ _id: groupId, targetKey: 'memberCount', modifier: 1 });

		return groupMember;
	}

	public async leaveGroup(memberId: ObjectId, groupId: ObjectId): Promise<GroupMember> {
		const group = await this.groupModel.findById(groupId);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		const groupMember = await this.groupMemberModel.findOne({ groupId, memberId });
		if (!groupMember) throw new BadRequestException(Message.NOT_JOINED);

		if (group.memberId.toString() === memberId.toString()) {
			throw new BadRequestException(Message.OWNER_CANNOT_LEAVE);
		}

		const removedMember = await this.groupMemberModel.findOneAndDelete({ groupId, memberId });
		if (!removedMember) throw new BadRequestException(Message.LEAVE_FAILED);

		if (groupMember.groupMemberRole !== GroupMemberRole.BANNED) {
			await this.groupStatsEditor({ _id: groupId, targetKey: 'memberCount', modifier: -1 });
		}
		return removedMember;
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
