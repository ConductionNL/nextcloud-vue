# Design: abstract-field-list

- Read: `objectData[field]`; after a save, the list the PATCH answered (else the list sent).
- Write: GET the object, apply the change to the STORED list (append / filter by key), PATCH `{ [field]: next }`. A
  duplicate (`add.unique`) is checked against the stored list, so two people adding the same entry do not both land.
  The widget never PUTs the whole object.
- Errors: `serverErrorMessage` (the server's `error` / `message`), in an error note; the list stays as stored.
- Row actions: tokens `@objectId`, `@object.<field>`, `@row.<field>`. A whole-string token keeps its value's type in a
  payload; inside a url it is URI-encoded. After the request, `rowSource` is read again.
- `rowSource`: one GET; entries merged over the stored items by key for display only.
- Look: rows separated by a hairline, 32px initials avatar, title 600, muted meta/aside/detail 13px; the add form is a
  wrapping row of fields and a secondary button. Nextcloud variables only.
- Security: the widget sends only the one field; it cannot widen what the user may change, because OpenRegister
  authorises the PATCH. No `_rbac` override.
