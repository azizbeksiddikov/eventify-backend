import { Schema } from 'mongoose';

const CurrencySchema = new Schema(
	{
		currencyCode: {
			type: String,
			required: true,
			unique: true,
			uppercase: true,
			trim: true,
		},
		/**
		 * Exchange rate: USD per internal point
		 * Example: If exchangeRate = 0.01, then 1 internal point = 0.01 USD
		 * This means internal points are the base currency
		 */
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
