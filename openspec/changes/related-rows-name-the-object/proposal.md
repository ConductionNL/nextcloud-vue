# Proposal: a related-object row names the object, never a number

## Why

Seen on learniq's conference slot page (2026-10-03): the Related panel listed "120", "43" and "122". OpenRegister's `/uses` and `/used` answer `@self.schema` as the numeric schema id, and `@self.name` as the uuid when the schema configures no name field. `toObjectRow` skipped the uuid, found no title, and fell back to the schema id for the label and for the meta beside it.

## What changes

- A row reads the object's title fields as before, then a person's `givenName` and `familyName`.
- The widget reads the title of every numeric schema id it meets once per page (`GET /api/schemas/{id}`), before it builds the rows, and translates it through the host app's `cnTranslate`. The row shows that title beside the label, or as the label when the object has no name.
- A bare number is never shown: a schema that cannot be read leaves the meta empty.
- The meta is left out when it would repeat the label.

## Not changed

Props, events and slots. A schema given as a slug reads as before. Minor, not breaking.
