# Recurring Events System – Technical Specification

This document describes the complete logic, database structure, and behavior for implementing recurring events in the backend system (NestJS + MongoDB).

## 1. Overview

Events can be created in two ways:

**ONE-TIME EVENT:**

- Stored directly in the Event collection
- `recurrenceId: null`
- No recurrence logic

**RECURRING EVENT:**

- Defined by a recurrence rule stored in **EventRecurrence** collection
- Automatic pre-generation of future occurrences (30 days ahead)
- Support for modifying individual occurrences or all future ones
- Recurring events must be single-day events

## 2. Database Structure

### 2.1 EventRecurrence Collection (Series Template)

**Collection Name:** `eventRecurrences`

**Purpose:** Stores the recurrence rules and template fields for the series. This is NOT a real event, just a template.

**Schema:**

```typescript
EventRecurrence {
  _id: ObjectId; // recurrenceId (used as foreign key in Event)

  // ===== Recurrence Rules =====
  recurrenceType: 'INTERVAL' | 'DAYS_OF_WEEK' | 'DAY_OF_MONTH';
  recurrenceInterval?: number; // for INTERVAL type
  recurrenceDaysOfWeek?: number[]; // for DAYS_OF_WEEK (0-6: Sunday-Saturday)
  recurrenceDayOfMonth?: number; // for DAY_OF_MONTH (1-31)
  recurrenceEndDate?: Date | null; // Optional end date for the series

  // ===== Template Fields (All Event fields) =====
  eventName: string;
  eventDesc: string;
  eventImages: string[];
  eventAddress: string;
  eventCity: string;
  eventCapacity?: number | null; // Nullable
  eventPrice: number;
  eventCategories: string[];
  eventStatus: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'DELETED';

  // ===== First Occurrence Template =====
  eventStartAt: Date; // First occurrence date/time
  eventEndAt: Date; // First occurrence end time

  // ===== Ownership =====
  groupId?: ObjectId | null; // Nullable
  memberId: ObjectId;

  // ===== Origin =====
  origin: string; // Default: "eventify.azbek.me" (for future web scraping)

  // ===== Status =====
  isActive: boolean; // true = active, false = deleted/disabled

  // ===== Timestamps =====
  createdAt: Date;
  updatedAt: Date;
}
```

**Note:** EventRecurrence does NOT include statistics fields (attendeeCount, eventLikes, eventViews) - those are per-event.

### 2.2 Event Collection (Actual Events)

**Collection Name:** `events` (existing)

**Changes:**

- Add `recurrenceId?: ObjectId | null` (foreign key to EventRecurrence.\_id)
- Keep ALL existing Event fields

**Schema:**

```typescript
Event {
  _id: ObjectId;

  // ===== Event Type =====
  eventType: 'ONCE' | 'RECURRING';
  recurrenceId?: ObjectId | null; // Foreign key to EventRecurrence._id

  // ===== All Existing Event Fields =====
  eventName: string;
  eventDesc: string;
  eventImages: string[]; // Changed from eventImage to eventImages
  eventStartAt: Date;
  eventEndAt: Date;
  eventAddress: string;
  eventCity: string;
  eventCapacity?: number | null; // Nullable
  eventPrice: number;
  eventCategories: string[];
  eventStatus: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED' | 'DELETED';
  groupId?: ObjectId | null; // Nullable
  memberId: ObjectId;

  // ===== Statistics =====
  attendeeCount: number;
  eventLikes: number;
  eventViews: number;

  // ===== Origin =====
  origin: string; // Default: "eventify.azbek.me"

  // ===== Timestamps =====
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:**

- `recurrenceId: 1, eventStartAt: 1` (for finding specific occurrence by date)

## 3. Recurrence Types

### 3.1 INTERVAL - Every N days

```typescript
{
  recurrenceType: "INTERVAL",
  recurrenceInterval: 14  // Every 14 days (strictly every N days, no day restrictions)
}
```

### 3.2 DAYS_OF_WEEK - Weekly recurrence

```typescript
{
  recurrenceType: "DAYS_OF_WEEK",
  recurrenceDaysOfWeek: [2, 4]  // Every Tuesday and Thursday
}
```

### 3.3 DAY_OF_MONTH - Monthly recurrence

```typescript
{
  recurrenceType: "DAY_OF_MONTH",
  recurrenceDayOfMonth: 31  // Every month on 31st (handles month boundaries)
}
```

**Month Boundary Handling:**

- If month has 30 days → 31 becomes 30
- If February → 31 or 30 becomes 28/29 (leap year)

## 4. Event Generation Rules

### 4.1 When Creating a Recurring Event

**Flow:**

1. Create EventRecurrence document with all template fields + recurrence rules
2. Generate first Event immediately:
   - Copy all fields from EventRecurrence
   - Set `recurrenceId = EventRecurrence._id`
   - Set `eventStartAt = EventRecurrence.eventStartAt`
   - Set `eventEndAt = EventRecurrence.eventEndAt`
   - Set `eventStatus = 'UPCOMING'` (always, no past events)
3. Generate all Events for next 30 days (or until `recurrenceEndDate` if set):
   - Calculate next occurrences based on recurrence rules
   - Create Event documents for each occurrence
   - Copy all fields from EventRecurrence template
   - Set `recurrenceId = EventRecurrence._id`
   - Set `eventStatus = 'UPCOMING'`
4. Schedule AgendaJS jobs for each generated Event

**Validation:**

- Recurring events must be single-day: `eventEndAt - eventStartAt <= 24 hours`
- Required fields based on `recurrenceType`:
  - INTERVAL → `recurrenceInterval` required
  - DAYS_OF_WEEK → `recurrenceDaysOfWeek` required
  - DAY_OF_MONTH → `recurrenceDayOfMonth` required

### 4.2 Daily Batch Job (02:00 AM)

**Cron:** `0 2 * * *` (every day at 02:00 AM)

**Tasks:**

1. Find all active EventRecurrence (`isActive: true`)
2. For each EventRecurrence:
   - Find latest generated Event: `max(eventStartAt) where recurrenceId = EventRecurrence._id`
   - Check if latest < today + 30 days
   - If yes:
     - Generate Events until (today + 30 days) or `recurrenceEndDate` (whichever comes first)
     - Check if Event already exists: `recurrenceId + eventStartAt` (avoid duplicates)
     - Create Event documents for new occurrences
     - Schedule AgendaJS jobs for new Events
3. Skip if `recurrenceEndDate` is in the past

## 5. Editing Rules

### 5.1 Edit Only This Occurrence

**When:** User edits a single occurrence (e.g., event10)

**Action:**

1. Update the Event document directly
2. Do NOT modify EventRecurrence
3. Other Events remain unchanged

**Example:**

- User changes `eventName` for event10
- Update Event document: `eventName = "New Name"`
- EventRecurrence and other Events unchanged

### 5.2 Edit This and All Future Occurrences

**When:** User edits event10 with `updateAllFuture: true`

**Action:**

1. Update EventRecurrence template with new values
2. Find all future Events:
   - `recurrenceId = event10.recurrenceId`
   - `eventStartAt >= event10.eventStartAt`
   - `eventStatus IN ['UPCOMING', 'ONGOING']` (only active future events)
3. Update those Events with new values from EventRecurrence
4. Keep past Events unchanged (historical records)
5. Cancel and reschedule AgendaJS jobs for updated Events

**Note:** Past Events are NOT overwritten - they remain as historical records.

### 5.3 Update Recurrence End Date

**When:** User sets/changes `recurrenceEndDate` in UI

**Action:**

1. Update EventRecurrence: `recurrenceEndDate = newDate`
2. Find all Events where:
   - `recurrenceId = EventRecurrence._id`
   - `eventStartAt > recurrenceEndDate`
3. Delete those Events (they are beyond the end date)
4. Cancel AgendaJS jobs for deleted Events

**Note:** Events on or before `recurrenceEndDate` remain unchanged.

### 5.4 Cancel Only This Occurrence

**Action:**

1. Update Event: `eventStatus = 'CANCELLED'`
2. Cancel AgendaJS jobs for that Event
3. EventRecurrence and other Events unchanged

### 5.5 Cancel Entire Series

**Action:**

1. Update EventRecurrence: `isActive = false` (and `recurrenceEndDate = now`)
2. Mark all future Events as `CANCELLED`
3. Cancel all AgendaJS jobs for future Events
4. Keep past Events (historical records)

## 6. Event Status

**New Events:**

- Always `eventStatus = 'UPCOMING'` (no past event creation allowed)
- Status transitions handled by AgendaJS: `UPCOMING → ONGOING → COMPLETED`

**Generated Events:**

- Default to `UPCOMING` from EventRecurrence template
- Can be updated individually

**Cancelled Events:**

- Set `eventStatus = 'CANCELLED'` on Event document

## 7. AgendaJS Integration

**For Pre-Generated Events:**

- Schedule jobs for each Event document separately on event creation
- Job type: `event-start` (when eventStartAt)
- Job type: `event-end` (when eventEndAt)
- When Event is updated: cancel old jobs, reschedule new jobs

## 8. Querying Events

**ONE-TIME Events:**

- Query: `Event.find({ recurrenceId: null })`

**RECURRING Events:**

- Query: `Event.find({ recurrenceId: <id> })`
- All Events are pre-generated, no on-demand generation needed

**Get Series Info:**

- Query EventRecurrence by `_id` to get template/rules
- Query Events by `recurrenceId` to get all occurrences

## 9. Field Changes Summary

**EventRecurrence:**

- `eventImages: string[]` (array, not single string)
- `eventCapacity?: number | null` (nullable)
- `groupId?: ObjectId | null` (nullable)
- `origin: string` (default: "eventify.azbek.me")
- `isActive: boolean` (active/inactive flag)

**Event:**

- `recurrenceId?: ObjectId | null` (foreign key to EventRecurrence)
- `eventImages: string[]` (changed from eventImage)
- `eventCapacity?: number | null` (nullable)
- `groupId?: ObjectId | null` (nullable)
- `origin: string` (default: "eventify.azbek.me")

## 10. Key Logic Points

1. **Pre-generation:** All Events are pre-generated and stored in DB (30 days ahead)
2. **Update all future:** Update EventRecurrence + update future Events (UPCOMING/ONGOING only)
3. **Past events preserved:** Past Events are never overwritten (historical records)
4. **Recurrence end date:** When set, cancel Events beyond that date and do not generate any more events for that template.
5. **Foreign key:** `recurrenceId` in Event references `EventRecurrence._id`
6. **Always UPCOMING:** New Events always start as UPCOMING (no past events)
7. **AgendaJS:** Schedule jobs for all pre-generated Event documents

## 11. Database Collections

**New Collection:**

- `eventRecurrences` (EventRecurrence schema)

**Modified Collection:**

- `events` (add `recurrenceId` field, change `eventImage` to `eventImages`, make `eventCapacity` and `groupId` nullable, add `origin`)

## 12. Validation Rules

1. **Single-day constraint:** Recurring events must be single-day (`eventEndAt - eventStartAt <= 24 hours`)
2. **Required fields by recurrenceType:**
   - INTERVAL → `recurrenceInterval` required
   - DAYS_OF_WEEK → `recurrenceDaysOfWeek` required
   - DAY_OF_MONTH → `recurrenceDayOfMonth` required
3. **No past events:** `eventStartAt >= now` for new Events
4. **Recurrence end date:** If set, must be after `eventStartAt`
