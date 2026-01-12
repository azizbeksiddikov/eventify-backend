import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import CurrencySchema from '../../schemas/Currency.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';

// ===== Currency Components =====
import { CurrencyService } from './currency.service';
import { CurrencyResolver } from './currency.resolver';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Currency', schema: CurrencySchema }]), AuthModule],
	providers: [CurrencyService, CurrencyResolver],
	exports: [CurrencyService],
})
export class CurrencyModule {}
