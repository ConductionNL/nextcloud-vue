# realtime-toast Delta: realtime-toast

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [realtime-toast](../../)

## Purpose

A person looking at a board or list sees that someone else just changed it, and the page follows without a reload.

## ADDED Requirements

### Requirement: A change by someone else shows a toast

CnRealtimeToast SHALL poll `source.url` every `interval` ms (default 15000, at least 2000), sending `since=<now>` from the previous answer; the first answer SHALL only set `now`. A change in `changes`, or a payload on `channel`, SHALL show one toast with `role="status"`: the title `titleTemplate` (default "Just updated by {actor}") with `{actor}` filled, the change's text, and a close button named "Close". A newer change SHALL replace it. A change whose `actorId` is the current user SHALL show nothing. Each shown change SHALL emit `change` and, unless `refreshOnChange` is false, the `cn:page:refresh` signal.

#### Scenario: Anouk moves a case

- **GIVEN** the board polls `/apps/dossiq/api/board/changes`
- **WHEN** the answer holds `{ actor: "Anouk Bakker", actorId: "anouk", text: "Openbare verlichting fietspad Lindelaan staat nu op Besluit." }`
- **THEN** the toast reads "Zojuist bijgewerkt door Anouk Bakker" and the text, and the board reads again

### Requirement: An index page follows changes live

CnIndexPage SHALL take `realtime` (`{ url, interval?, views?, titleTemplate? }`) and SHALL show the toast while its view mode is one of `views` (every view when unset); a change SHALL read the list again.
