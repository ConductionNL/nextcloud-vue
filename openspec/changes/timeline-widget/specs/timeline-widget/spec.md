# timeline-widget Delta: timeline-widget

**Status**: in-progress
**Scope**: nextcloud-vue

## Purpose

A detail-page widget that shows an object's dated events in time order.

## ADDED Requirements

### Requirement: A timeline widget shows an object's dated events in order

The library SHALL register a `timeline` widget type for the detail-page
surface and as a v2 built-in, rendered by `CnTimelineWidget`. It SHALL read
the object from explicit props, then the detail page's object context, then
`content`, and fetch the object itself when only its id is known.

It SHALL build events from `content.fields` (date properties, dotted paths
allowed), `content.related` (related objects whose `field` holds this
object's id, dated by `dateField`), `content.auditTrail: true` (the object's
audit trail) and `content.timeline: true` (OpenRegister's timeline). Events
SHALL be shown oldest first, or newest first with `order: "desc"`. A field
without a date SHALL produce no event. A moment after now SHALL be marked
"Upcoming" in text. A source that fails to load SHALL be named in a warning
while the other sources still render.

#### Scenario: A booking's milestones in order

- **GIVEN** a booking with `@self.created`, `confirmationSentAt`, `depositClearedAt`, `startsAt` in the future and `endsAt` in the future
- **WHEN** the timeline widget renders with those five fields
- **THEN** it SHALL list them oldest first
- **AND** Starts and Ends SHALL be marked Upcoming

#### Scenario: Related payments join the same order

- **GIVEN** `related: [{ schema: "payment", field: "booking", label: "Payment received" }]`
- **WHEN** the widget loads
- **THEN** it SHALL `GET /apps/openregister/api/objects/{register}/payment?booking=<id>`
- **AND** each payment SHALL appear at its creation moment between the other events

#### Scenario: A failed source is named

- **GIVEN** `auditTrail: true` and the audit trail request fails
- **THEN** the widget SHALL show a warning naming the changes as missing
- **AND** SHALL still list the field events
