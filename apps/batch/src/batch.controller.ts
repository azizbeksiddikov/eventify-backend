import { Controller, Get, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';

@Controller()
export class BatchController {
	private logger: Logger = new Logger('BatchController');

	constructor(private readonly batchService: BatchService) {}

	@Get()
	getHello(): string {
		return this.batchService.getHello();
	}
}
