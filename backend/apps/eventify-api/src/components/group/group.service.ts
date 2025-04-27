import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Direction, Message } from '../../libs/enums/common.enum';
import { Group, Groups } from '../../libs/dto/group/group';
import { GroupInput, GroupsInquiry } from '../../libs/dto/group/group.input';
import { GroupUpdateInput } from '../../libs/dto/group/group.update';
import { StatisticModifier, T } from '../../libs/types/common';
import { Member } from '../../libs/dto/member/member';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { GroupMemberInput } from '../../libs/dto/groupMembers/groupMember.input';
import { GroupMemberRole } from '../../libs/enums/group.enum';
import { GroupMemberUpdateInput } from '../../libs/dto/groupMembers/groupMember.update';

@Injectable()
export class GroupService {
	constructor(
		@InjectModel(Group.name) private readonly groupModel: Model<Group>,
		@InjectModel('GroupMember') private readonly groupMemberModel: Model<GroupMember>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}

	public async createGroup(memberId: ObjectId, input: GroupInput): Promise<Group> {
		const existingGroup = await this.groupModel.findOne({ groupLink: input.groupLink });
		if (existingGroup) throw new BadRequestException(Message.GROUP_ALREADY_EXISTS);

		const member = await this.memberModel.findById(memberId);
		if (!member) throw new NotFoundException(Message.MEMBER_NOT_FOUND);

		try {
			const newGroup: Group = await this.groupModel.create({
				...input,
				groupOwnerId: memberId,
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
		const group = await this.groupModel.findById(groupId);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		if (memberId) {
			// TODO: Implement view, likes
		}
		return group;
	}

	public async getGroups(input: GroupsInquiry): Promise<Groups> {
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
		if (search?.categories?.length) {
			match.groupCategories = { $in: search.categories };
		}

		const result = await this.groupModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: skip }, { $limit: limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new BadRequestException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async getMyGroups(memberId: ObjectId): Promise<Group[]> {
		const groups = await this.groupModel.find({ groupOwnerId: memberId }).sort({ createdAt: -1 }).exec();

		return groups;
	}

	public async updateGroup(memberId: ObjectId, input: GroupUpdateInput): Promise<Group> {
		const group: Group | null = await this.groupModel.findById(input._id);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);
		if (group.groupOwnerId.toString() !== memberId.toString()) {
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
		if (group.groupOwnerId.toString() !== memberId.toString()) {
			throw new BadRequestException(Message.NOT_GROUP_ADMIN);
		}

		if (group.groupOwnerId.toString() !== memberId.toString()) throw new BadRequestException(Message.NOT_GROUP_ADMIN);

		return await this.groupModel.findByIdAndDelete(groupId);
	}

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

	public async updateGroupMemberRole(memberId: ObjectId, input: GroupMemberUpdateInput): Promise<GroupMember> {
		const { groupId, targetMemberId, groupMemberRole } = input;

		// Check if the requesting member is an organizer of the group
		const group = await this.groupModel.findById(groupId);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);
		if (group.groupOwnerId.toString() !== memberId.toString()) {
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

	public async leaveGroup(memberId: ObjectId, groupId: ObjectId): Promise<GroupMember> {
		const group = await this.groupModel.findById(groupId);
		if (!group) throw new NotFoundException(Message.GROUP_NOT_FOUND);

		const groupMember = await this.groupMemberModel.findOne({ groupId, memberId });
		if (!groupMember) throw new BadRequestException(Message.NOT_JOINED);

		if (group.groupOwnerId.toString() === memberId.toString()) {
			throw new BadRequestException(Message.OWNER_CANNOT_LEAVE);
		}

		const removedMember = await this.groupMemberModel.findOneAndDelete({ groupId, memberId });
		if (!removedMember) throw new BadRequestException(Message.DELETE_FAILED);

		if (groupMember.groupMemberRole !== GroupMemberRole.BANNED) {
			await this.groupStatsEditor({ _id: groupId, targetKey: 'memberCount', modifier: -1 });
		}
		return removedMember;
	}

	// Other
	public async groupStatsEditor(input: StatisticModifier): Promise<Group> {
		const { _id, targetKey, modifier } = input;

		const result = await this.groupModel
			.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();

		if (!result) throw new BadRequestException(Message.UPDATE_FAILED);
		return result;
	}
}
