import { Controller, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MemberService } from './member.service';
import { BATCH_ROLLBACK, BATCH_TOP_ORGANIZERS } from '../../libs/constants';

@Controller()
export class MemberController {
	private logger: Logger = new Logger('MemberController');

	constructor(private readonly memberService: MemberService) {}

	@Cron('00 00 01 * * *', { name: BATCH_ROLLBACK }) // every day at 1:00 AM
	public async batchRollback() {
		try {
			this.logger['context'] = BATCH_ROLLBACK;
			this.logger.debug('EXECUTED!');
			await this.memberService.batchRollback();
		} catch (err) {
			this.logger.error(err);
		}
	}

	@Cron('20 00 01 * * *', { name: BATCH_TOP_ORGANIZERS }) // every day at 1:20 AM
	public async batchTopOrganizers() {
		try {
			this.logger['context'] = BATCH_TOP_ORGANIZERS;
			this.logger.debug('EXECUTED!');
			await this.memberService.batchTopOrganizers();
		} catch (err) {
			this.logger.error(err);
		}
	}
}
