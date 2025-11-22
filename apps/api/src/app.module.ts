import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // for env vars
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { GraphQLModule } from '@nestjs/graphql';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { T } from './libs/types/common';

@Module({
	imports: [
		// for env files
		ConfigModule.forRoot(),

		// serve static files
		ServeStaticModule.forRoot({
			rootPath: join(process.cwd(), 'uploads'),
			serveRoot: '/uploads',
		}),

		// graphql
		GraphQLModule.forRoot({
			driver: ApolloDriver,
			playground: true,
			uploads: false,
			autoSchemaFile: true,
			formatError: (error: T) => {
				const graphqlFormattedError = {
					code: error?.extensions.code,
					message: error?.extensions?.response?.message || error?.extensions?.response?.message || error?.message,
				};

				console.log('GraphQL global Error:', graphqlFormattedError);
				return graphqlFormattedError;
			},
		}),

		ComponentsModule,
		DatabaseModule,
	],
	controllers: [AppController],
	providers: [AppService, AppResolver],
})
export class AppModule {}
