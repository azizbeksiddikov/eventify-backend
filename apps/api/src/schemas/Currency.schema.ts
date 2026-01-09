import { Schema } from 'mongoose';
import { Currency } from '../libs/enums/common.enum';

const CurrencySchema = new Schema(
	{
		currencyCode: {
			type: String,
			enum: Currency,
			required: true,
			unique: true,
		},
		exchangeRate: {
			type: Number,
			required: true,
			default: 1,
		},
		isActive: {
			type: Boolean,
			default: true,
		},
	},
	{
		timestamps: true,
		collection: 'currencies',
	},
);

export default CurrencySchema;
