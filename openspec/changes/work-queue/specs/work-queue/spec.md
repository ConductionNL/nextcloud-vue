# work-queue Delta: work-queue

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [work-queue](../../)

## Purpose

One queue of everything waiting on the reader, whatever its sources.

## ADDED Requirements

### Requirement: One queue over every source

CnWorkQueue SHALL draw the groups its source answers, each with its label, count, `closesWhen` sentence and items, and SHALL name no source itself. It SHALL name each unreadable source at the top and SHALL NOT fold it into the empty state. It SHALL hide a group until tomorrow and show it again through the `hide` and `show` urls, using the hidden groups the server answers. An item SHALL open by its `route`, its `href` or `itemHref`, else emit `open`. An overdue item SHALL be drawn as late; a covered item SHALL say for whom; a waiting item SHALL say on whom, for how long and how often chased. A failed read SHALL show an error with a retry.

#### Scenario: A morning with the calendar down

- **GIVEN** the queue answers tasks and mentions, and the calendar source as unavailable
- **WHEN** the reader opens the queue
- **THEN** both groups show, and a note says the calendar could not be read so the list is incomplete
