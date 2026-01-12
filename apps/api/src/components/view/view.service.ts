import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';

// ===== Enums =====
import { ViewGroup } from '../../libs/enums/view.enum';

// ===== DTOs =====
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { Event, Events } from '../../libs/dto/event/event';
import { OrdinaryEventInquiry } from '../../libs/dto/event/event.input';

// ===== Types =====
import { T } from '../../libs/types/common';

// ===== Config =====
import { lookupVisit } from '../../libs/config';

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

	// ============== View Management Methods ==============
	public async recordView(input: ViewInput): Promise<View | null> {
		const viewExist = await this.checkViewExistance(input);
		if (!viewExist) {
			return this.viewModel.create(input);
		} else return null;
	}

	private async checkViewExistance(input: ViewInput): Promise<View | null> {
		const { memberId, viewGroup, viewRefId } = input;
		const search: T = { memberId: memberId, viewGroup: viewGroup, viewRefId: viewRefId };
		return (await this.viewModel.findOne(search).exec()) as unknown as View | null;
	}

	// ============== View Query Methods ==============
	public async getVisitedEvents(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		const { page, limit } = input;
		const match: T = { viewGroup: ViewGroup.EVENT, memberId: memberId };

		const data = await this.viewModel
			.aggregate<{
				list: Array<{ visitedEvent: Event }>;
				metaCounter: Array<{ total: number }>;
			}>([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'events',
						localField: 'viewRefId',
						foreignField: '_id',
						as: 'visitedEvent',
					},
				},
				{ $unwind: '$visitedEvent' },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupVisit,
							{ $unwind: '$visitedEvent.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const result: Events = { list: [], metaCounter: data[0]?.metaCounter ?? [] };
		result.list = data[0]?.list.map((ele) => ele.visitedEvent) ?? [];

		return result;
	}
}
