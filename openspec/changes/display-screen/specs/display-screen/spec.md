# display-screen Delta: display-screen

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [display-screen](../../)

## Purpose

People read a page from a distance, without a menu, and can tell when it is out of date.

## ADDED Requirements

### Requirement: A screen shows a title, the time and the rows

`CnDisplayScreen` SHALL draw a `main` landmark with one `h1`, the default slot, and only when given a clock, an update line and a bottom line. The clock
SHALL keep time and stop on unmount. An `updatedAt` that is no date SHALL draw no update line. With `stale` it SHALL say in the `status` role that the
server is out of reach, with the time of `updatedAt` when it has one. With `dark` it SHALL use the dark theme through `NcThemeProvider`.

#### Scenario: Board LqInfoscherm

- **GIVEN** `clock`, and `updatedAt` at 10:05 with `updatedTemplate` "bijgewerkt om {time}"
- **THEN** the screen shows the clock and "bijgewerkt om 10:05"
- **WHEN** a minute passes
- **THEN** the clock shows the new minute

#### Scenario: A refresh failed

- **GIVEN** `stale` and `updatedAt` at 10:05
- **THEN** a status line names 10:05

### Requirement: A screen covers the app as an overlay

With `overlay` the screen SHALL teleport to the body as a modal dialog named by `title` and take focus. Every other child of the body SHALL go inert. Escape
SHALL emit `close`. On unmount it SHALL lift only the inert it set itself and return focus to where it was.

#### Scenario: Board LqLes "Zelf inchecken, op het bord"

- **GIVEN** a button that opens the screen with `overlay`
- **THEN** focus is on the screen, and the page behind it is inert
- **WHEN** the screen goes away
- **THEN** the page is usable, and focus is on the button
