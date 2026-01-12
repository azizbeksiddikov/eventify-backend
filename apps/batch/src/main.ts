import { NestFactory } from '@nestjs/core';
import { BatchModule } from './batch.module';

async function bootstrap() {
	const app = await NestFactory.create(BatchModule, {
		logger: ['log', 'error', 'warn', 'debug', 'verbose'],
	});

	// Override console methods to include timestamps
	const originalLog = console.log;
	const originalError = console.error;
	const originalWarn = console.warn;
	const originalInfo = console.info;
	const originalDebug = console.debug;

	const timestamp = () => `[${new Date().toISOString()}]`;

	console.log = (...args: unknown[]) => originalLog(timestamp(), ...args);
	console.error = (...args: unknown[]) => originalError(timestamp(), ...args);
	console.warn = (...args: unknown[]) => originalWarn(timestamp(), ...args);
	console.info = (...args: unknown[]) => originalInfo(timestamp(), ...args);
	console.debug = (...args: unknown[]) => originalDebug(timestamp(), ...args);

	const port_number = process.env.PORT_BATCH;
	if (!port_number) {
		throw new Error('PORT_BATCH is not defined in .env file. Please set PORT_BATCH in your environment variables.');
	}

	await app.listen(port_number);
	console.log(`Batch server is running on ${process.env.DOMAIN_NAME}:${port_number}`);
}
void bootstrap();
