# board-timeline-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-timeline-rows](../../)

## Purpose

A managed timeline entry in the board look is the board's rail row.

## ADDED Requirements

### Requirement: A board timeline entry is a rail row

In the board look, a `CnTimelineManage` entry:

- SHALL pad 6px above, 16px below and 48px at the start, with a 34px circle at its start and a 2px line from the
  circle to the next entry, and no rule under it;
- SHALL show its message first at 15px weight 600 at the normal line height, under a theme as well;
- SHALL show the kind, author and moment as one 13px muted line under the message;
- SHALL keep its actions, shown over the row's end on hover and on keyboard focus.

The Nextcloud look keeps its own timeline entry.

#### Scenario: DqZaakHistorie "Historie van de zaak"

- **GIVEN** a case's Historie tab in the board look with an entry that has a message, an author and a moment
- **THEN** the entry is at most 62px tall (58px drawn; 62px with a visibility pill on the meta line)
- **AND** its first line is the message at 15px weight 600

#### Scenario: Pinning stays reachable

- **GIVEN** the same entry and a user who can manage the timeline
- **WHEN** the entry is hovered or a control in it has keyboard focus
- **THEN** its Pin action is shown
