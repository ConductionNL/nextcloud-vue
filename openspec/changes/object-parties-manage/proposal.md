## Why

dossiq's organisation page lists an organisation's contact persons in a tab (OpenRegister person parties on the
organisation). Nobody can add or remove one there: the `parties` widget only reads. The decision (Ruben, 24 Oct) is
that a handler adds a contact person by picking somebody known or describing somebody new without a BSN, chooses a
role, may mark them the main contact, and removes one, and that the organisation's update right decides, on the
server.

## What Changes

- `CnObjectPartiesWidget` gets `content.manage`: `add` (a button and the new `CnPartyAddDialog`) and `remove` (a
  button per party and the confirm dialog).
- Add: pick through CnPartyPicker over `sources`, or describe somebody new with `create.fields` (saved first as an
  object of `create.register`/`create.schema`, with addresses and a composed display name, see `newPartyRecord`);
  choose a role from the roles the kind accepts; optionally the primary party (through `PUT .../parties/primary`,
  which records the replacement). Otherwise `POST .../parties`.
- Remove: `DELETE .../parties/{party}?role=` after a confirm naming the person and the role.
- The writes go through OpenRegister's party API, which asks the update right on the record (openregister
  REQ-PRM-005). A 403 shows "You may not change who is on this record." and nothing changes. The buttons are hidden
  when OpenRegister's scopes say the reader may not update the schema; an unknown answer shows them and the server
  decides.
- After a change the widget reads again and sends `cn:page:refresh`; it reads again on another widget's refresh.
- Helpers `newPartyRecord` and `savedUuid` in utils/objectParties.js. No schema change (widget content is open).
