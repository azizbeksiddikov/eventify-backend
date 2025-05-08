import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import FaqSchema from '../../schemas/Faq.schema';

// ===== Components =====
import { AuthModule } from '../auth/auth.module';

// ===== Faq Components =====
import { FaqService } from './faq.service';
import { FaqResolver } from './faq.resolver';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'Faq', schema: FaqSchema }]), AuthModule],
	providers: [FaqService, FaqResolver],
	exports: [FaqService],
})
export class FaqModule {}
