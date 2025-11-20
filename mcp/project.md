This is backend of Eventify, an event-management platform.

We have 2 servers:

- api
- batch

Main idea: event management

Features:

- user authentification thorugh
- create/read/update/delete groups
  - daily batch job for event generation
- like/comment events, groups, organizers
- notifications
- languages 4: english default, korean, russian, uzbek
- dark/light mode
- event status auto change with AgendaJS (scheduled status transitions: UPCOMING → ONGOING → COMPLETED)

<!-- EVENTS -->

- create/read/update/delete events (one-time and recurring)
- recurring events: automated event series with 3 recurrence patterns (interval, weekly, monthly)
  - pre-generation of events 30 days ahead
  - edit single occurrence or all future occurrences
  - cancel individual events or entire series
