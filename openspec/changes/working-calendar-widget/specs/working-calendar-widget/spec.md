# working-calendar-widget Delta: working-calendar-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [working-calendar-widget](../../)

## Purpose

A working calendar kept as an OpenRegister object can be read and extended a month at a time.

## ADDED Requirements

### Requirement: A working calendar shows a month

The `working-calendar` widget SHALL read the calendar object named by `content.calendar` (by id, or the first match of
a token-resolved filter) and SHALL draw one month, Monday to Sunday. Weekdays not in `workingWeekdays` SHALL be drawn as
non-working. The closed dates SHALL come from OpenRegister's calendar preview for the year shown, asked once per year,
and SHALL be drawn as closed with their name in a tooltip and in the day's label. Previous and next month SHALL move the
month. The days SHALL form a keyboard grid with one tab stop: arrow keys, Home / End and Page Up / Page Down move focus,
and every day SHALL carry a label with its full date and whether it works or why it is closed. When the preview is
refused the widget SHALL show the stored exceptions and say that the holidays could not be read.

#### Scenario: Board DqInstellingenAlgemeen, December 2026

- **GIVEN** a calendar working Monday to Friday whose preview for 2026 closes 24 and 25 December
- **THEN** the month starts on Tuesday 1 December, the weekends are non-working and 24 and 25 December are closed
- **AND** 25 December is labelled with its name

### Requirement: A day can be added to the calendar

Add day SHALL append `{ date, name }` to the calendar's `exceptions` with one update of the object through the object
API, under the reader's own rights, and SHALL read the closures of that year again. It SHALL show for administrators
only, unless `editable` is false, and a refusal SHALL say that only an administrator can change the working calendar.

#### Scenario: An administrator closes 31 December

- **WHEN** an administrator adds 31 December 2026 named "Year end"
- **THEN** the calendar is updated once with that exception added to the existing ones
- **AND** 31 December shows as closed
