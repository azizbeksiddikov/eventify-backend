import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import CurrencySchema from '../../schemas/Currency.schema';
import { CurrencyService } from './currency.service';
import { CurrencyResolver } from './currency.resolver';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Currency', schema: CurrencySchema }])],
	providers: [CurrencyService, CurrencyResolver],
	exports: [CurrencyService],
})
export class CurrencyModule {}
