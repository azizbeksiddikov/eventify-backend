import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { logger } from './libs/logger';

async function bootstrap() {
	// create nest application
	const app = await NestFactory.create(AppModule, {
		logger: ['log', 'error', 'warn', 'debug', 'verbose'],
	});

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
	logger.info('Bootstrap', `API server is running on ${process.env.DOMAIN_NAME}:${port}`);
}
void bootstrap().catch((error) => {
	logger.error('Bootstrap', 'Failed to start application', error);
	process.exit(1);
});
