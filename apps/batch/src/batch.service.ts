import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import { EventRecurrenceService } from './components/eventRecurrence/eventRecurrence.service';
import { WebCrawlingService } from './components/webCrawling/webCrawling.service';
import { MemberService } from './components/member/member.service';
import { EventStatusCleanupService } from './components/eventStatusCleanup/eventStatusCleanup.service';
import {
	BATCH_ROLLBACK,
	BATCH_TOP_ORGANIZERS,
	BATCH_RECURRING_EVENTS,
	BATCH_WEB_CRAWLING,
	BATCH_EVENT_STATUS_CLEANUP,
	CRON_RECURRING_EVENTS,
	CRON_WEB_CRAWLING,
	CRON_MEMBER_ROLLBACK,
	CRON_TOP_ORGANIZERS,
	CRON_EVENT_STATUS_CLEANUP,
} from './libs/constants';
import { SCRAPER_DEFAULTS } from './libs/config';

@Injectable()
export class BatchService {
	private readonly logger: Logger = new Logger(BatchService.name);

	constructor(
		private readonly eventRecurrenceService: EventRecurrenceService,
		private readonly webCrawlingService: WebCrawlingService,
		private readonly memberService: MemberService,
		private readonly eventStatusCleanupService: EventStatusCleanupService,
	) {}

	@Timeout(1000)
	handleOnReady() {
		this.logger.debug('BATCH SERVER READY!');
	}

	@Cron(CRON_RECURRING_EVENTS, { name: BATCH_RECURRING_EVENTS, timeZone: SCRAPER_DEFAULTS.DEFAULT_TIMEZONE })
	async handleRecurringEventsGeneration() {
		this.logger.log('Started: handleRecurringEventsGeneration');
		try {
			await this.eventRecurrenceService.generateRecurringEvents();
			this.logger.log('Finished: handleRecurringEventsGeneration');
		} catch (error) {
			this.logger.error('Error in handleRecurringEventsGeneration:', error);
		}
	}

	@Cron(CRON_WEB_CRAWLING, { name: BATCH_WEB_CRAWLING, timeZone: SCRAPER_DEFAULTS.DEFAULT_TIMEZONE })
	async handleWebCrawling() {
		this.logger.log('Started: handleWebCrawling');
		try {
			const isTest = false;
			await this.webCrawlingService.getEventCrawling(undefined, isTest);
			this.logger.log('Finished: handleWebCrawling');
		} catch (error) {
			this.logger.error('Error in handleWebCrawling:', error);
		}
	}

	@Cron(CRON_MEMBER_ROLLBACK, { name: BATCH_ROLLBACK, timeZone: SCRAPER_DEFAULTS.DEFAULT_TIMEZONE })
	public async batchRollback() {
		this.logger.log('Started: batchRollback');
		try {
			await this.memberService.batchRollback();
			this.logger.log('Finished: batchRollback');
		} catch (err) {
			this.logger.error('Error in batchRollback:', err);
		}
	}

	@Cron(CRON_TOP_ORGANIZERS, { name: BATCH_TOP_ORGANIZERS, timeZone: SCRAPER_DEFAULTS.DEFAULT_TIMEZONE })
	public async batchTopOrganizers() {
		this.logger.log('Started: batchTopOrganizers');
		try {
			await this.memberService.batchTopOrganizers();
			this.logger.log('Finished: batchTopOrganizers');
		} catch (err) {
			this.logger.error('Error in batchTopOrganizers:', err);
		}
	}

	@Cron(CRON_EVENT_STATUS_CLEANUP, { name: BATCH_EVENT_STATUS_CLEANUP, timeZone: SCRAPER_DEFAULTS.DEFAULT_TIMEZONE })
	async handleEventStatusCleanup() {
		this.logger.log('Started: handleEventStatusCleanup');
		try {
			await this.eventStatusCleanupService.cleanupEventStatuses();
			this.logger.log('Finished: handleEventStatusCleanup');
		} catch (error) {
			this.logger.error('Error in handleEventStatusCleanup:', error);
		}
	}

	getHello(): string {
		return 'Welcome to Eventify batch server!';
	}
}
