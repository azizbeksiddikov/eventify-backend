import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberType, MemberStatus } from '../../libs/enums/member.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { Group, Groups } from '../../libs/dto/group/group';
import { GroupInput, GroupsInquiry } from '../../libs/dto/group/group.input';
import { GroupMember } from '../../libs/dto/groupMembers/groupMember';
import { GroupCategory, GroupMemberRole } from '../../libs/enums/group.enum';
import { Member } from '../../libs/dto/member/member';
import { UpdateGroupMemberInput } from '../../libs/dto/groupMembers/groupMember.update';
import { GroupMemberInput } from '../../libs/dto/groupMembers/groupMember.input';
import { StatisticModifier } from '../../libs/types/common';

@Injectable()
export class GroupService {
	constructor(
		@InjectModel('Group') private readonly groupModel: Model<Group>,
		@InjectModel('GroupMember') private readonly groupMemberModel: Model<GroupMember>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}

	public async createGroup(input: GroupInput, memberId: ObjectId): Promise<Group> {
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
