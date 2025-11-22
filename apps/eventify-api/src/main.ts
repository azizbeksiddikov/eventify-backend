import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
// import { graphqlUploadExpress } from 'graphql-upload';
// import * as express from 'express';

async function bootstrap() {
	// create nest application
	const app = await NestFactory.create(AppModule);

	// auto validate incoming requests
	app.useGlobalPipes(new ValidationPipe());

	// log requests and responses
	app.useGlobalInterceptors(new LoggingInterceptor());

	// enable cors
	app.enableCors({ origin: true, credentials: true });

	// app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
	// app.use('/uploads', express.static('./uploads'));

	const port = process.env.PORT_API ?? 3010;
	console.log(`Server running on port ${process.env.DOMAIN_NAME}:${port}`);
	await app.listen(port);
}
bootstrap();
