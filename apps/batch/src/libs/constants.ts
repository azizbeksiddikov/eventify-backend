/***********************
 * BATCH CONSTANTS   *
 ***********************/

// Job Names
export const BATCH_ROLLBACK = 'BATCH_ROLLBACK';
export const BATCH_TOP_ORGANIZERS = 'BATCH_TOP_ORGANIZERS';
export const BATCH_RECURRING_EVENTS = 'BATCH_RECURRING_EVENTS';
export const BATCH_WEB_CRAWLING = 'BATCH_WEB_CRAWLING';
export const BATCH_EVENT_STATUS_CLEANUP = 'BATCH_EVENT_STATUS_CLEANUP';

// Cron Expressions
export const CRON_RECURRING_EVENTS = '0 0 * * *'; // Every day at midnight (00:00)
export const CRON_WEB_CRAWLING = '0 2 * * *'; // Every day at 2:00 AM
export const CRON_MEMBER_ROLLBACK = '0 1 * * *'; // Every day at 1:00 AM
export const CRON_TOP_ORGANIZERS = '20 1 * * *'; // Every day at 1:20 AM
export const CRON_EVENT_STATUS_CLEANUP = '0 */3 * * *'; // Every 3 hours (at :00)
