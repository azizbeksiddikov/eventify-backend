import { NestFactory } from '@nestjs/core';
import { BatchModule } from './batch.module';
import { logger } from './libs/logger';

async function bootstrap() {
	const app = await NestFactory.create(BatchModule, {
		logger: ['log', 'error', 'warn', 'debug', 'verbose'],
	});

	const port_number = process.env.PORT_BATCH;
	if (!port_number) {
		throw new Error('PORT_BATCH is not defined in .env file. Please set PORT_BATCH in your environment variables.');
	}

	await app.listen(port_number);
	logger.info('Bootstrap', `Batch server is running on ${process.env.DOMAIN_NAME}:${port_number}`);
}
void bootstrap();
