# record-list-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-leading](../../)

## Purpose

A record list row can lead with a short text, such as a time.

## ADDED Requirements

### Requirement: A record list row can lead with a short text

A `rows` CnRecordListWidget SHALL take `content.leading`, a template over the row, and draw it before the row's
title in a 52px column. A row whose template does not fill SHALL draw no leading text, and a list without the key
SHALL draw none.

#### Scenario: PtDashboard "Recente inzendingen"

- **GIVEN** the portal dashboard's submissions list with `leading: "{submittedAt|time}"`
- **THEN** each row starts with its time of day ("09.15"), then the title and meta, then the pill
