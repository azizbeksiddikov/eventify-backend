import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const configService = app.get(ConfigService);

	// Enable CORS
	app.enableCors({
		origin: configService.get('CORS_ORIGIN'),
		credentials: true,
	});

	// Enable validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	// Start the application
	const port = configService.get('PORT') || 3000;
	await app.listen(port);
	console.log(`Application is running on: http://localhost:${port}/graphql`);
}
bootstrap();
