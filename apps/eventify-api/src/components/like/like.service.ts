import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { LikeInput } from '../../libs/dto/like/like.input';
import { T } from '../../libs/types/common';
import { Message } from '../../libs/enums/common.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { OrdinaryEventInquiry } from '../../libs/dto/event/event.input';
import { Events } from '../../libs/dto/event/event';
import { lookupFavorite } from '../../libs/config';

@Injectable()
export class LikeService {
	constructor(@InjectModel('Like') private readonly likeModel: Model<Like>) {}

	public async toggleLike(input: LikeInput): Promise<number> {
		console.log('LikeService: toggleLike');
		const search: T = { memberId: input.memberId, likeRefId: input.likeRefId, likeGroup: input.likeGroup };
		const exist = await this.likeModel.findOne(search).exec();
		let modifier = 1;

		if (exist) {
			await this.likeModel.findOneAndDelete(search).exec();
			modifier = -1;
		} else {
			try {
				await this.likeModel.create(input);
			} catch (err) {
				console.log('ERROR: Service.model:', err.message);
				throw new BadRequestException(Message.CREATE_FAILED);
			}
		}

		return modifier;
	}

	public async checkMeLiked(input: LikeInput): Promise<MeLiked[]> {
		const { likeGroup, memberId, likeRefId } = input;
		const result = await this.likeModel
			.findOne({ likeGroup: likeGroup, memberId: memberId, likeRefId: likeRefId })
			.exec();

		console.log('result of checkMeLiked:', result);

		return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
	}

	public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
		const { memberId, likeRefId } = input;

		const result = await this.likeModel.findOne({ memberId: memberId, likeRefId: likeRefId }).exec();

		return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
	}

	public async getFavoriteEvents(memberId: ObjectId, input: OrdinaryEventInquiry): Promise<Events> {
		const { page, limit } = input;
		const match: T = { likeGroup: LikeGroup.EVENT, memberId: memberId };

		const data = await this.likeModel
			.aggregate([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'events',
						localField: 'likeRefId',
						foreignField: '_id',
						as: 'favoriteEvent',
					},
				},
				{ $unwind: '$favoriteEvent' },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupFavorite,
							{ $unwind: '$favoriteEvent.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		const result: Events = { list: [], metaCounter: data[0].metaCounter };
		result.list = data[0].list.map((ele) => ele.favoriteEvent);

		return result;
	}
}
