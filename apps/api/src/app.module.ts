import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // for env vars
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GraphQLError } from 'graphql';

import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { GraphQLModule } from '@nestjs/graphql';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';

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
				const extensions = error.extensions as Record<string, unknown>;
				const response = extensions?.response as { message?: string | string[] } | undefined;
				const message = Array.isArray(response?.message) ? response.message[0] : response?.message || error.message;

				const graphqlFormattedError = {
					code: extensions?.code as string | undefined,
					message: message,
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
