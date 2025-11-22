# Event Status Auto-Update Implementation Plan

## Overview

Implement automatic event status transitions using AgendaJS. Events will automatically change status from UPCOMING → ONGOING → COMPLETED based on their `eventStartAt` and `eventEndAt` timestamps.

## Architecture

### Recommended Approach: Hybrid (Schedule in API, Process in Batch)

**Why Hybrid?**

- ✅ Better separation of concerns (API handles requests, Batch handles background work)
- ✅ Scalability (can scale API and Batch servers independently)
- ✅ Both servers share same MongoDB, so AgendaJS jobs are accessible from both
- ✅ Matches existing pattern (batch server already runs scheduled cron jobs)
- ✅ API server stays lightweight and focused on request handling

### API Server Responsibilities (api)

- On POST /events (createEvent): Save event to MongoDB and **schedule** jobs via AgendaJS
- On update/delete: **Cancel** existing jobs and **reschedule** if needed
- Only schedules jobs, does NOT process them
- Uses AgendaJS to create jobs in MongoDB collection (`agendaJobs`)

### Batch Server Responsibilities (batch)

- **Process** scheduled jobs from AgendaJS MongoDB collection
- Handle status transitions: UPCOMING → ONGOING → COMPLETED
- Run AgendaJS job processors continuously
- Update event statuses in MongoDB when jobs execute

### Alternative: Full Implementation in API Server

If you prefer simplicity over separation:

- Implement everything in `api`
- Schedule AND process jobs in the same server
- Simpler but mixes API handling with background processing

## Implementation Steps

### 1. AgendaJS Setup & Configuration

#### 1.1 Create Agenda Module (API Server - for scheduling)

- **File**: `apps/api/src/components/agenda/agenda.module.ts`
- Import AgendaJS and configure MongoDB connection
- Export AgendaService for dependency injection
- **Purpose**: Only schedules jobs, does NOT process them

#### 1.2 Create Agenda Service (API Server - for scheduling)

- **File**: `apps/api/src/components/agenda/agenda.service.ts`
- Initialize Agenda instance with MongoDB connection
- **DO NOT** define job processors here (only scheduling)
- Methods:
  - `scheduleEventStart(eventId: ObjectId, startAt: Date)`: Schedule job for event start
  - `scheduleEventEnd(eventId: ObjectId, endAt: Date)`: Schedule job for event end
  - `cancelEventJobs(eventId: ObjectId)`: Cancel all jobs for an event
  - `rescheduleEventJobs(eventId: ObjectId, startAt: Date, endAt: Date)`: Reschedule jobs when event is updated

#### 1.3 Register Agenda Module (API Server)

- Add AgendaModule to `apps/api/src/components/components.module.ts`
- Ensure AgendaService is available in EventService

#### 1.4 Create Agenda Module (Batch Server - for processing)

- **File**: `apps/batch/src/agenda/agenda.module.ts`
- Import AgendaJS and configure MongoDB connection (same DB as API)
- Export AgendaService for job processing

#### 1.5 Create Agenda Service (Batch Server - for processing)

- **File**: `apps/batch/src/agenda/agenda.service.ts`
- Initialize Agenda instance with MongoDB connection
- **Define job processors** (this is where jobs are executed):
  - `event-start`: Change status from UPCOMING → ONGOING
  - `event-end`: Change status from ONGOING → COMPLETED
- Start AgendaJS to process jobs: `agenda.start()`
- Methods:
  - `initializeProcessors()`: Define and register job processors
  - `startProcessing()`: Start AgendaJS job processing

#### 1.6 Register Agenda Module (Batch Server)

- Add AgendaModule to `apps/batch/src/batch.module.ts`
- Initialize job processors on batch server startup

### 2. Event Service Integration

#### 2.1 Update `createEvent()` method

**Location**: `apps/api/src/components/event/event.service.ts` (lines 50-97)

**Changes**:

- After successfully creating event, schedule jobs:
  - Schedule `event-start` job at `eventStartAt`
  - Schedule `event-end` job at `eventEndAt`
- Only schedule if event status is UPCOMING
- Handle errors gracefully (log but don't fail event creation)

**Implementation**:

```typescript
// After event creation (line 66)
await this.agendaService.scheduleEventStart(event._id, event.eventStartAt);
await this.agendaService.scheduleEventEnd(event._id, event.eventEndAt);
```

#### 2.2 Update `updateEventByOrganizer()` method

**Location**: `apps/api/src/components/event/event.service.ts` (lines 206-227)

**Changes**:

- Before updating, cancel existing jobs for the event
- After updating:
  - If `eventStartAt` or `eventEndAt` changed, reschedule jobs
  - If status changed to DELETED/CANCELLED, cancel all jobs
  - If status changed back to UPCOMING, reschedule jobs
- Handle edge cases (past dates, invalid date ranges)

**Implementation**:

```typescript
// Before update (line 218)
await this.agendaService.cancelEventJobs(input._id);

// After update
if (updatedEvent.eventStatus === EventStatus.UPCOMING) {
	await this.agendaService.rescheduleEventJobs(updatedEvent._id, updatedEvent.eventStartAt, updatedEvent.eventEndAt);
} else if (updatedEvent.eventStatus === EventStatus.DELETED || updatedEvent.eventStatus === EventStatus.CANCELLED) {
	// Jobs already cancelled above
}
```

#### 2.3 Update `updateEventByAdmin()` method

**Location**: `apps/api/src/components/event/event.service.ts` (lines 304-309)

**Changes**:

- Similar to `updateEventByOrganizer()`:
  - Cancel existing jobs before update
  - Reschedule if dates changed and status is UPCOMING
  - Cancel if status is DELETED/CANCELLED

**Implementation**:

```typescript
// Before update (line 305)
await this.agendaService.cancelEventJobs(input._id);

// After update (line 308)
if (result.eventStatus === EventStatus.UPCOMING) {
	await this.agendaService.rescheduleEventJobs(result._id, result.eventStartAt, result.eventEndAt);
}
```

#### 2.4 Update `removeEventByAdmin()` method

**Location**: `apps/api/src/components/event/event.service.ts` (lines 311-319)

**Changes**:

- Cancel all jobs for the event before deletion
- Ensure jobs are cancelled even if event is already DELETED

**Implementation**:

```typescript
// Before deletion (line 312)
await this.agendaService.cancelEventJobs(eventId);

// Continue with existing deletion logic
```

### 3. Job Processing Logic (Batch Server)

#### 3.1 Event Start Job Handler

- **Job Name**: `event-start`
- **Location**: `apps/batch/src/agenda/agenda.service.ts`
- **Action**: Update event status from UPCOMING → ONGOING
- **Validation**:
  - Check if event still exists
  - Check if current status is UPCOMING
  - Verify eventStartAt matches current time (within tolerance)
- **Implementation**: Query Event model, update status, save to MongoDB

#### 3.2 Event End Job Handler

- **Job Name**: `event-end`
- **Location**: `apps/batch/src/agenda/agenda.service.ts`
- **Action**: Update event status from ONGOING → COMPLETED
- **Validation**:
  - Check if event still exists
  - Check if current status is ONGOING
  - Verify eventEndAt matches current time (within tolerance)
- **Implementation**: Query Event model, update status, save to MongoDB

### 4. Job Naming Conventions

Use consistent naming for job identification:

- Start job: `event-start-${eventId}`
- End job: `event-end-${eventId}`

This allows easy cancellation and prevents duplicate jobs.

### 5. Error Handling & Edge Cases

#### 5.1 Past Dates

- If `eventStartAt` is in the past, immediately set status to ONGOING or COMPLETED
- If `eventEndAt` is in the past, set status to COMPLETED
- Don't schedule jobs for past dates

#### 5.2 Invalid Date Ranges

- Validate `eventStartAt < eventEndAt`
- Handle timezone issues
- Log warnings for suspicious date ranges

#### 5.3 Job Failures

- Implement retry logic for failed jobs
- Log errors for monitoring
- Don't block event creation/update if scheduling fails

#### 5.4 Status Conflicts

- If event status is manually changed to CANCELLED/DELETED, cancel jobs
- If event is already COMPLETED, don't schedule end job
- Handle race conditions (status changed between scheduling and execution)

### 6. Database Considerations

#### 6.1 AgendaJS Collection

- AgendaJS will create its own MongoDB collection (`agendaJobs`)
- Ensure MongoDB connection string is properly configured
- Consider indexing for performance

#### 6.2 Event Schema

- No schema changes needed
- Status field already exists and is properly indexed

### 7. Testing Strategy

#### 7.1 Unit Tests

- Test AgendaService methods (schedule, cancel, reschedule)
- Test EventService integration points
- Mock AgendaJS for isolated testing

#### 7.2 Integration Tests

- Test full flow: create event → verify jobs scheduled
- Test update flow: update dates → verify jobs rescheduled
- Test delete flow: delete event → verify jobs cancelled

#### 7.3 Manual Testing

- Create event with future dates → verify jobs in MongoDB
- Update event dates → verify jobs updated
- Delete event → verify jobs removed
- Wait for scheduled time → verify status changes

### 8. Monitoring & Logging

#### 8.1 Logging Points

- Job scheduled: Log eventId, job type, scheduled time
- Job cancelled: Log eventId, reason
- Job executed: Log eventId, old status, new status
- Job failed: Log eventId, error details

#### 8.2 Metrics to Track

- Number of scheduled jobs
- Job execution success rate
- Average time between scheduling and execution
- Failed job count

### 9. Future Enhancements

#### 9.1 Batch Server Integration

- Move job processing to batch server
- Use message queue (Redis/RabbitMQ) for communication
- API server sends messages, batch server processes

#### 9.2 Notifications

- Send notifications when event status changes
- Notify attendees when event starts/ends
- Notify organizers of status transitions

#### 9.3 Recovery Mechanism

- Periodic job to check for missed status transitions
- Re-schedule jobs for events that should have transitioned
- Handle server downtime gracefully

## Dependencies

- `agenda`: ^5.0.0 (already installed)
- MongoDB connection (already configured)
- EventService (existing)
- EventModel (existing)

## Files to Create/Modify

### New Files (API Server):

1. `apps/api/src/components/agenda/agenda.module.ts` - Agenda module for scheduling
2. `apps/api/src/components/agenda/agenda.service.ts` - Agenda service for scheduling only

### New Files (Batch Server):

3. `apps/batch/src/agenda/agenda.module.ts` - Agenda module for processing
4. `apps/batch/src/agenda/agenda.service.ts` - Agenda service with job processors

### Modified Files:

1. `apps/api/src/components/components.module.ts` - Add AgendaModule
2. `apps/api/src/components/event/event.service.ts` - Integrate AgendaService (scheduling)
3. `apps/api/src/components/event/event.module.ts` - Import AgendaModule
4. `apps/batch/src/batch.module.ts` - Add AgendaModule and Event schema
5. `apps/batch/src/batch.service.ts` - Initialize AgendaJS processors on startup (optional)

## Implementation Order

1. ✅ Setup AgendaJS module and service
2. ✅ Integrate with createEvent()
3. ✅ Integrate with updateEventByOrganizer()
4. ✅ Integrate with updateEventByAdmin()
5. ✅ Integrate with removeEventByAdmin()
6. ✅ Test all scenarios
7. ✅ Add error handling and logging
8. ✅ Document API changes

## Notes

- AgendaJS uses MongoDB to store jobs, so no additional database setup needed
- Jobs are persistent and will survive server restarts
- Consider timezone handling for event dates
- Ensure proper cleanup of cancelled jobs to prevent MongoDB bloat

---

## TODO List - Exact Actions

### Phase 1: Setup AgendaJS in API Server (Scheduling)

- [ ] **Create agenda directory**
  - Create folder: `apps/api/src/components/agenda/`

- [ ] **Create agenda.module.ts (API)**
  - File: `apps/api/src/components/agenda/agenda.module.ts`
  - Follow established import pattern with section comments:

    ```typescript
    import { Module } from '@nestjs/common';

    // ===== Agenda Components =====
    import { AgendaService } from './agenda.service';
    ```

  - Create `AgendaModule` class
  - Note: AgendaModule does NOT need MongooseModule (AgendaJS handles its own connection)
  - Export `AgendaService` as provider
  - Structure:
    ```typescript
    @Module({
    	providers: [AgendaService],
    	exports: [AgendaService],
    })
    export class AgendaModule {}
    ```

- [ ] **Create agenda.service.ts (API - Scheduling Only)**
  - File: `apps/api/src/components/agenda/agenda.service.ts`
  - Follow established import pattern with section comments:
    ```typescript
    import { Injectable, Logger } from '@nestjs/common';
    import type { ObjectId } from 'mongoose';
    import { Agenda } from 'agenda';
    ```
  - Create `AgendaService` class with `@Injectable()`
  - Initialize Logger: `private readonly logger = new Logger(AgendaService.name);`
  - Initialize Agenda instance in constructor:

    ```typescript
    private agenda: Agenda;
    constructor() {
      const mongoUri = process.env.NODE_ENV === 'production'
        ? process.env.MONGO_PROD
        : process.env.MONGO_DEV;

      this.agenda = new Agenda({
        db: { address: mongoUri }
      });
    }
    ```

  - Use tabs for indentation (matching codebase style)
  - Implement `scheduleEventStart(eventId: ObjectId, startAt: Date)`
    - Use `this.agenda.schedule(startAt, 'event-start', { eventId: eventId.toString() })`
  - Implement `scheduleEventEnd(eventId: ObjectId, endAt: Date)`
    - Use `this.agenda.schedule(endAt, 'event-end', { eventId: eventId.toString() })`
  - Implement `cancelEventJobs(eventId: ObjectId)`
    - Use `this.agenda.cancel({ name: { $in: ['event-start', 'event-end'] }, 'data.eventId': eventId.toString() })`
  - Implement `rescheduleEventJobs(eventId: ObjectId, startAt: Date, endAt: Date)`
    - Call `cancelEventJobs` first
    - Then call `scheduleEventStart` and `scheduleEventEnd`
  - Add error handling with try-catch blocks
    - Log errors but don't throw (to not block event creation)
    - Use `this.logger.error()` for errors
    - Use `this.logger.log()` for successful operations
  - Add logging for scheduled/cancelled jobs

- [ ] **Register AgendaModule in components.module.ts**
  - File: `apps/api/src/components/components.module.ts`
  - Import `AgendaModule` from `./agenda/agenda.module`
  - Add `AgendaModule` to imports array (alphabetically, after AuthModule)
  - Follow established pattern with organized imports

- [ ] **Import AgendaModule in event.module.ts**
  - File: `apps/api/src/components/event/event.module.ts`
  - Import `AgendaModule` from `../agenda/agenda.module`
  - Add `AgendaModule` to imports array (in `// ===== Components =====` section)
  - Follow established import organization pattern

### Phase 2: Integrate Scheduling in EventService

- [ ] **Update event.service.ts - Inject AgendaService**
  - File: `apps/api/src/components/event/event.service.ts`
  - Import `AgendaService` from `../agenda/agenda.service`
  - Add import in `// ===== Services =====` section (follow established pattern)
  - Add `AgendaService` to constructor parameters (after existing services)

- [ ] **Update createEvent() method**
  - File: `apps/api/src/components/event/event.service.ts`
  - After event creation (after line 66, before return)
  - Add check: Only schedule if `event.eventStatus === EventStatus.UPCOMING`
  - Add check: Only schedule if `event.eventStartAt > new Date()` (future date)
  - Call `await this.agendaService.scheduleEventStart(event._id, event.eventStartAt)`
  - Call `await this.agendaService.scheduleEventEnd(event._id, event.eventEndAt)`
  - Wrap in try-catch to prevent blocking event creation on scheduling errors
  - Add logging for successful scheduling

- [ ] **Update updateEventByOrganizer() method**
  - File: `apps/api/src/components/event/event.service.ts`
  - Before update (before line 218): Call `await this.agendaService.cancelEventJobs(input._id)`
  - After update (after line 218): Check if status is UPCOMING and dates are in future
  - If conditions met: Call `await this.agendaService.rescheduleEventJobs(updatedEvent._id, updatedEvent.eventStartAt, updatedEvent.eventEndAt)`
  - Wrap in try-catch
  - Add logging

- [ ] **Update updateEventByAdmin() method**
  - File: `apps/api/src/components/event/event.service.ts`
  - Before update (before line 305): Call `await this.agendaService.cancelEventJobs(input._id)`
  - After update (after line 308): Check if status is UPCOMING and dates are in future
  - If conditions met: Call `await this.agendaService.rescheduleEventJobs(result._id, result.eventStartAt, result.eventEndAt)`
  - Wrap in try-catch
  - Add logging

- [ ] **Update removeEventByAdmin() method**
  - File: `apps/api/src/components/event/event.service.ts`
  - Before deletion (before line 315): Call `await this.agendaService.cancelEventJobs(eventId)`
  - Wrap in try-catch
  - Add logging

### Phase 3: Setup AgendaJS in Batch Server (Processing)

- [ ] **Create agenda directory**
  - Create folder: `apps/batch/src/agenda/`

- [ ] **Create agenda.module.ts (Batch)**
  - File: `apps/batch/src/agenda/agenda.module.ts`
  - Follow established import pattern:

    ```typescript
    import { Module } from '@nestjs/common';
    import { MongooseModule } from '@nestjs/mongoose';

    // ===== Schemas =====
    import EventSchema from '@app/api/src/schemas/Event.schema';

    // ===== Agenda Components =====
    import { AgendaService } from './agenda.service';
    ```

  - Create `AgendaModule` class
  - Import `DatabaseModule` (already in batch.module.ts)
  - Add `MongooseModule.forFeature([{ name: 'Event', schema: EventSchema }])`
  - Export `AgendaService` as provider

- [ ] **Create agenda.service.ts (Batch - Processing)**
  - File: `apps/batch/src/agenda/agenda.service.ts`
  - Follow established import pattern with section comments:

    ```typescript
    import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
    import { InjectModel } from '@nestjs/mongoose';
    import { Model, ObjectId } from 'mongoose';
    import { Agenda } from 'agenda';

    // ===== DTOs =====
    import { Event } from '@app/api/src/libs/dto/event/event';

    // ===== Enums =====
    import { EventStatus } from '@app/api/src/libs/enums/event.enum';
    ```

  - Create `AgendaService` class with `@Injectable()`
  - Implement `OnModuleInit` and `OnModuleDestroy` lifecycle hooks
  - Initialize Logger: `private readonly logger = new Logger(AgendaService.name);`
  - Inject `Event` model in constructor: `@InjectModel('Event') private readonly eventModel: Model<Event>`
  - Initialize Agenda instance in constructor:

    ```typescript
    private agenda: Agenda;
    constructor(@InjectModel('Event') private readonly eventModel: Model<Event>) {
      const mongoUri = process.env.NODE_ENV === 'production'
        ? process.env.MONGO_PROD
        : process.env.MONGO_DEV;

      this.agenda = new Agenda({
        db: { address: mongoUri }
      });
    }
    ```

  - Use tabs for indentation
  - Implement `onModuleInit()` lifecycle hook
  - In `onModuleInit()`: Call `this.initializeProcessors()` and `this.startProcessing()`
  - Implement `initializeProcessors()`:
    - Define `event-start` processor:
      ```typescript
      this.agenda.define('event-start', async (job) => {
      	const { eventId } = job.attrs.data;
      	const event = await this.eventModel.findById(eventId);
      	if (event && event.eventStatus === EventStatus.UPCOMING) {
      		await this.eventModel.findByIdAndUpdate(eventId, { eventStatus: EventStatus.ONGOING });
      		this.logger.log(`Event ${eventId} status changed to ONGOING`);
      	}
      });
      ```
    - Define `event-end` processor:
      ```typescript
      this.agenda.define('event-end', async (job) => {
      	const { eventId } = job.attrs.data;
      	const event = await this.eventModel.findById(eventId);
      	if (event && event.eventStatus === EventStatus.ONGOING) {
      		await this.eventModel.findByIdAndUpdate(eventId, { eventStatus: EventStatus.COMPLETED });
      		this.logger.log(`Event ${eventId} status changed to COMPLETED`);
      	}
      });
      ```
  - Implement `startProcessing()`:
    - Call `await this.agenda.start()`
    - Add logging: "AgendaJS job processing started"
  - Implement `onModuleDestroy()` lifecycle hook:
    - Call `await this.agenda.stop()`
  - Add error handling in processors

- [ ] **Register AgendaModule in batch.module.ts**
  - File: `apps/batch/src/batch.module.ts`
  - Import `AgendaModule`
  - Add `AgendaModule` to imports array

- [ ] **Verify Event schema import in batch server**
  - Ensure `EventSchema` can be imported from API server
  - If not, check tsconfig paths or copy schema

### Phase 4: Handle Edge Cases

- [ ] **Add past date handling in createEvent()**
  - Check if `eventStartAt < new Date()`: Set status to ONGOING or COMPLETED immediately
  - Check if `eventEndAt < new Date()`: Set status to COMPLETED immediately
  - Don't schedule jobs for past dates

- [ ] **Add date validation in update methods**
  - Validate `eventStartAt < eventEndAt`
  - Handle timezone issues
  - Log warnings for suspicious date ranges

- [ ] **Add status conflict handling**
  - In job processors, check current status before updating
  - Handle race conditions gracefully
  - Log when status doesn't match expected value

### Phase 5: Testing

- [ ] **Test createEvent() scheduling**
  - Create event with future dates
  - Verify jobs appear in MongoDB `agendaJobs` collection
  - Check job names and scheduled times

- [ ] **Test updateEventByOrganizer() rescheduling**
  - Create event, then update dates
  - Verify old jobs cancelled, new jobs scheduled
  - Check job data matches new dates

- [ ] **Test updateEventByAdmin() rescheduling**
  - Create event, then update via admin
  - Verify jobs rescheduled correctly

- [ ] **Test removeEventByAdmin() cancellation**
  - Create event, then delete
  - Verify all jobs cancelled in MongoDB

- [ ] **Test job processing (Batch Server)**
  - Start batch server
  - Verify processors are registered
  - Create event with start time in near future (1-2 minutes)
  - Wait and verify status changes automatically
  - Check logs for status transitions

- [ ] **Test edge cases**
  - Create event with past dates → verify immediate status update
  - Update event to CANCELLED → verify jobs cancelled
  - Update event dates to past → verify no jobs scheduled

### Phase 6: Error Handling & Logging

- [ ] **Add comprehensive logging**
  - Log when jobs are scheduled (eventId, job type, scheduled time)
  - Log when jobs are cancelled (eventId, reason)
  - Log when jobs execute (eventId, old status, new status)
  - Log errors with full context

- [ ] **Add error recovery**
  - Wrap all AgendaJS calls in try-catch
  - Don't block event operations if scheduling fails
  - Log errors but continue execution

- [ ] **Add monitoring points**
  - Track scheduled job count
  - Track job execution success rate
  - Track failed jobs

### Phase 7: Documentation & Cleanup

- [ ] **Update API documentation**
  - Document that event status changes automatically
  - Note the status transition flow: UPCOMING → ONGOING → COMPLETED

- [ ] **Add code comments**
  - Comment complex logic in AgendaService
  - Document job naming conventions
  - Document MongoDB collection usage

- [ ] **Verify no linting errors**
  - Run `npm run lint`
  - Fix any TypeScript/ESLint errors

- [ ] **Test in development environment**
  - Start both API and Batch servers
  - Test full flow end-to-end
  - Verify no console errors

### Phase 8: Production Readiness

- [ ] **Environment variables**
  - Verify MongoDB connection strings work for both servers
  - Ensure AgendaJS uses correct database

- [ ] **Docker configuration**
  - Verify both containers can access same MongoDB
  - Test docker-compose setup

- [ ] **Performance testing**
  - Test with multiple events scheduled
  - Verify job processing doesn't block batch server
  - Monitor MongoDB performance

---

## Quick Reference: Job Names

- `event-start`: Scheduled when event should start (UPCOMING → ONGOING)
- `event-end`: Scheduled when event should end (ONGOING → COMPLETED)

## Quick Reference: MongoDB Collection

- `agendaJobs`: Created automatically by AgendaJS, stores all scheduled jobs
