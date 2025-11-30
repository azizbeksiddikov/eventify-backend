import { Controller, Get, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';
import { Timeout } from '@nestjs/schedule';

@Controller()
export class BatchController {
	private logger: Logger = new Logger('BatchController');

	constructor(private readonly batchService: BatchService) {}

	@Timeout(1000)
	hadnleTimeOut() {
		this.logger.debug('BATCH SERVER READY!');
	}

	@Get()
	getHello(): string {
		return this.batchService.getHello();
	}
}
