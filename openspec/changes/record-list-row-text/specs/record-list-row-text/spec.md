# record-list-row-text Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-row-text](../../)

## Purpose

A record-list row can carry the third line and the chevron-less look DqDashboard draws.

## ADDED Requirements

### Requirement: A row draws its text under the meta line

In `presentation: "rows"` CnRecordListWidget SHALL draw `content.text`, filled from the row, as a muted line under the
meta line. A row whose text fills empty SHALL draw no such line.

#### Scenario: Vastgelopen zaken

- **GIVEN** `meta: "{identifier}"` and `text: "{idleDays} dagen stil"`
- **THEN** the row reads "Subsidies sportverenigingen", "2026-0066", "12 dagen stil"

### Requirement: A linked row can leave its chevron off

With `content.chevron: false` a linked row SHALL draw no chevron and SHALL stay a link. Without the key a linked row
SHALL keep its chevron.

#### Scenario: DqDashboard tiles

- **GIVEN** a rows list with `rowRoute` and `chevron: false`
- **THEN** each row is a link and no row draws a chevron
