import { Module } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection, STATES } from 'mongoose';
import { logger } from '../libs/logger';

@Module({
	imports: [
		MongooseModule.forRootAsync({
			useFactory: () => ({
				uri: process.env.MONGODB_URI,
			}),
		}),
	],
	exports: [MongooseModule],
})
export class DatabaseModule {
	constructor(@InjectConnection() private readonly connection: Connection) {
		if (connection.readyState === STATES.connected) {
			logger.info(
				'DatabaseModule',
				`MongoDB is connected into ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} database`,
			);
		} else {
			logger.warn('DatabaseModule', `MongoDB is not connected`);
		}
	}
}
