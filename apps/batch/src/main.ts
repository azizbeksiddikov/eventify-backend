import { NestFactory } from '@nestjs/core';
import { BatchModule } from './batch.module';

async function bootstrap() {
	const app = await NestFactory.create(BatchModule);

	const port_number = process.env.PORT_BATCH ?? 3011;
	await app.listen(port_number);
	console.log(`Batch server is running on ${process.env.DOMAIN_NAME}:${port_number}`);
}
bootstrap();
