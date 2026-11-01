import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // for env vars
import { ServeStaticModule } from '@nestjs/serve-static';
import { GraphQLError } from 'graphql';
import { join } from 'path';
import { formatGraphQLError } from './libs/errors';
import { logger } from './libs/logger';

import { GraphQLModule } from '@nestjs/graphql';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';

import { ApolloDriver } from '@nestjs/apollo';
import { AppController } from './app.controller';
import { AppResolver } from './app.resolver';
import { AppService } from './app.service';

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
			uploads: false,
			autoSchemaFile: true,
			formatError: (error: GraphQLError) => {
				const graphqlFormattedError = formatGraphQLError(error);
				logger.error('AppModule', 'GraphQL global Error', graphqlFormattedError);
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
