import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';

async function bootstrap() {
	// create nest application
	const app = await NestFactory.create(AppModule);

	// auto validate incoming requests
	app.useGlobalPipes(new ValidationPipe());

	// log requests and responses
	app.useGlobalInterceptors(new LoggingInterceptor());

	// enable cors
	app.enableCors({ origin: true, credentials: true });

	const port = process.env.PORT_API;
	if (!port) {
		throw new Error('PORT_API is not defined in .env file. Please set PORT_API in your environment variables.');
	}

	await app.listen(port);
	console.log(`API server is running on ${process.env.DOMAIN_NAME}:${port}`);
}
bootstrap();
