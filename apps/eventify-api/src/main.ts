import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import { WsAdapter } from '@nestjs/platform-ws';
import * as express from 'express';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalInterceptors(new LoggingInterceptor());

	app.enableCors({ origin: true, credentials: true });
	app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
	app.use('/uploads', express.static('./uploads'));
	app.useWebSocketAdapter(new WsAdapter(app));

	const port = process.env.PORT_API ?? 3000;
	await app.listen(port ?? 3000);

	console.log(`running on port ${port ?? 3000}\n`);
}
bootstrap();
