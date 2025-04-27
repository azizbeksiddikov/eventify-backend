import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { T } from '../../libs/types/common';
import { ViewGroup } from '../../libs/enums/view.enum';
import { EventsInquiry, OrdinaryEventInquiry } from '../../libs/dto/event/event.input';
import { lookupVisit } from '../../libs/config';
import { Events } from '../../libs/dto/event/event';

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

	public async recordView(input: ViewInput): Promise<View | null> {
		const viewExist = await this.checkViewExistnce(input);
		if (!viewExist) {
			return this.viewModel.create(input);
		} else return null;
	}

	private async checkViewExistnce(input: ViewInput): Promise<View> {
		const { memberId, viewGroup, viewRefId } = input;
		const search: T = { memberId: memberId, viewGroup: viewGroup, viewRefId: viewRefId };
		return this.viewModel.findOne(search).exec() as unknown as View;
	}

	public async getVisitedEvents(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		const { page, limit } = input;
		const match: T = { viewGroup: ViewGroup.EVENT, memberId: memberId };

		const data = await this.viewModel
			.aggregate([
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

		const result: Events = { list: [], metaCounter: data[0].metaCounter };
		result.list = data[0].list.map((ele) => ele.visitedEvent);

		return result;
	}
}
