import { Module } from '@nestjs/common';
import { InjectConnection, MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

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
		if (connection.readyState === 1) {
			console.log(
				`MongoDB is connected into ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} database`,
			);
		} else {
			console.log(`MongoDB is not connected`);
		}
	}
}
