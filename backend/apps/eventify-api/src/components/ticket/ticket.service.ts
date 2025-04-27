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
import { Event } from '../../libs/dto/event/event';
import { Ticket } from '../../libs/dto/ticket/ticket';

@Injectable()
export class TicketService {
	constructor(@InjectModel('Ticket') private readonly ticketModel: Model<Ticket>) {}
}
