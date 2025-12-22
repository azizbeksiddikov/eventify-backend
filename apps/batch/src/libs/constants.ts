/***********************
 * BATCH CONSTANTS   *
 ***********************/

// Job Names
export const BATCH_ROLLBACK = 'BATCH_ROLLBACK';
export const BATCH_TOP_ORGANIZERS = 'BATCH_TOP_ORGANIZERS';
export const BATCH_RECURRING_EVENTS = 'BATCH_RECURRING_EVENTS';
export const BATCH_WEB_CRAWLING = 'BATCH_WEB_CRAWLING';

// Cron Expressions
export const CRON_RECURRING_EVENTS = '0 0 * * *'; // Every day at midnight
export const CRON_WEB_CRAWLING = '0 23 * * *'; // Every day at 11:00 PM
export const CRON_MEMBER_ROLLBACK = '00 00 01 * * *'; // Every day at 1:00 AM
export const CRON_TOP_ORGANIZERS = '20 00 01 * * *'; // Every day at 1:20 AM
