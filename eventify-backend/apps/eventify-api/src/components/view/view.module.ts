import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// ===== Schemas =====
import ViewSchema from '../../schemas/View.schema';

// ===== View Components =====
import { ViewService } from './view.service';

@Module({
	imports: [MongooseModule.forFeature([{ name: 'View', schema: ViewSchema }])],
	providers: [ViewService],
	exports: [ViewService],
})
export class ViewModule {}
