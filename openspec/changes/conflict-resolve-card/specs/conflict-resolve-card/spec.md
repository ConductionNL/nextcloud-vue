# conflict-resolve-card Delta: conflict-resolve-card

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [conflict-resolve-card](../../)

## Purpose

One card that shows both versions of a conflicting record and lets a person keep one, in every app that files conflict records.

## ADDED Requirements

### Requirement: A card shows both versions of each differing field

The `conflict-resolve` widget SHALL read the records of `content.source` (filter operators sent as `key[op]`) and SHALL draw one card per record that has no `resolution` and has at least one differing field. The fields SHALL be `content.fields`, else the record's list at `fieldsPath` (default `conflictFields`), else every top-level key of the two snapshots except bookkeeping keys. For each differing field the card SHALL show the `localText` line with the value at `localPath` (default `clientVersion`) and the `officeText` line with the value at `officePath` (default `serverVersion`). A field label SHALL be shown only when more than one field differs. With no open conflict the widget SHALL draw nothing; a failed read SHALL be said, not drawn as no conflicts.

#### Scenario: The board's conflict

- **GIVEN** an open conflict record whose `conflictFields` is `["finding"]`, with "Bijgebouw 4 bij 6 meter, in de groenstrook." on the device and "Bijgebouw circa 24 m², zonder vergunning." on the server
- **WHEN** the sync frame shows the widget with the dossiq texts
- **THEN** the card reads "Conflict: welke tekst houdt u?", "Op dit toestel: "Bijgebouw 4 bij 6 meter, in de groenstrook."", "Op kantoor: "Bijgebouw circa 24 m², zonder vergunning."" and the buttons "Deze houden" and "Die van kantoor"

#### Scenario: A resolved record

- **GIVEN** a record that already has `resolution: "server_wins"`
- **THEN** no card is drawn for it

### Requirement: Choosing a version sends it and the card leaves

Pressing a button SHALL post `{ resolution }` to `resolve.url` filled from the record, with the value from `resolve.resolutions` (default `client_wins` for the device version, `server_wins` for the other). When the request lands the card SHALL leave and `resolved` SHALL fire with `{ id, resolution }`. A refusal SHALL keep the card and show the server's words on it.

#### Scenario: Keeping the office text

- **GIVEN** the board's conflict with id `c-1`
- **WHEN** the inspector presses "Die van kantoor"
- **THEN** the widget posts `{ resolution: "server_wins" }` to `/apps/dossiq/api/conflict-records/c-1/resolve` and the card leaves

#### Scenario: The server refuses

- **GIVEN** the endpoint answers 409 with `{ message: "Het dossier is intussen gesloten." }`
- **THEN** the card stays and shows that sentence as an alert

### Requirement: Choosing stays off until the server offers it

Without `resolve.url`, or while the capability at `resolve.capability` does not read true, both buttons SHALL be disabled and described by `unavailableText`, and pressing them SHALL send nothing. The card SHALL still show both versions.

#### Scenario: The endpoint has not shipped

- **GIVEN** `resolve.capability` is `dossiq.conflictResolution` and the capabilities do not carry it
- **THEN** both buttons are disabled, their description says choosing is not possible yet, and no request is sent
