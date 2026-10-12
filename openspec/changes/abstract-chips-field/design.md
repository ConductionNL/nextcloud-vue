# Design: abstract-chips-field

- Read: `objectData[field]` as strings; after a save, the list the PATCH answered (else the list sent).
- Add: trim; `lowercase` lowercases; empty, pattern (only when typing) and duplicate are refused before any request
  with `patternMessage` / "This is already in the list." / "Fill this in.". Then PATCH `{ [field]: [...items, value] }`.
- Remove: PATCH `{ [field]: items without it }`; the remove button is named after the chip.
- `options`: the add chip opens a select of the options not yet stored; chips show the option label.
- Errors: the server's message (`serverErrorMessage`), the chips stay as stored.
- Look: pill chips (999px), light primary background, 600 text, 20px round x button; a dashed "+ label" add chip.
- Security: one configured field is sent; OpenRegister authorises the PATCH.
