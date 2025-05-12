import { MemberStatus, MemberType } from '@app/eventify-api/src/libs/enums/member.enum';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Member } from 'apps/eventify-api/src/libs/dto/member/member';
import { Model } from 'mongoose';

@Injectable()
export class BatchService {
	constructor(@InjectModel('Member') private readonly memberModel: Model<Member>) {}

	public async batchRollback(): Promise<void> {
		await this.memberModel
			.updateMany(
				{ memberStatus: MemberStatus.ACTIVE, memberType: MemberType.ORGANIZER }, //
				{ memberRank: 0 },
			)
			.exec();
	}

	public async batchTopOrganizers(): Promise<void> {
		const organizers: Member[] = await this.memberModel
			.find({
				memberType: MemberType.ORGANIZER,
				memberStatus: MemberStatus.ACTIVE,
				memberRank: 0,
			})
			.lean()
			.exec();

		const promisedList = organizers.map(async (ele: Member) => {
			const { _id, eventsOrganizedCount, memberGroups, memberLikes, memberViews } = ele;
			const rank = eventsOrganizedCount * 7 + memberGroups * 5 + memberLikes * 3 + memberViews;
			return await this.memberModel.findByIdAndUpdate(_id, { memberRank: rank });
		});
		await Promise.all(promisedList);
	}

	getHello(): string {
		return 'Welcome to eventify-batch server!';
	}
}
