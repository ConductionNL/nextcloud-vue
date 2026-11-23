# Design: abstract-toggle-table

- Rows: `content.rows` (static) then `content.source` (`url` with `@objectId` / `@object.<field>` tokens, `path`,
  `key`, `label`, `hint`). A row has a key, a title and a hint; extra columns read `column.path` off the row, with an
  optional `map` translated through cnTranslate.
- Switch: flag mode = `objectData[row.field] === true`; list mode = key in `objectData[bind.field]` (not in it with
  `invert`). After a save the value the PATCH answered is kept in the widget, so later toggles build on it.
- Write: flag = `{ [row.field]: bool }`; list = `{ [bind.field]: list with the key added or removed }`. The switch is
  disabled while the request runs. On failure the server's message shows and the switch is drawn again from the stored
  value (it carries a key that changes on refusal; a native checkbox would otherwise keep the flipped state).
- Look: header row in a muted hover background, rows separated by a hairline, 600 title with a 12px muted hint, the
  switch in a right-aligned narrow column.
- Security: one configured field is sent; OpenRegister authorises the PATCH.
