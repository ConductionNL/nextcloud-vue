# Design: abstract-choice-picker

- Cards: `content.items` then `content.source` (`url` with `@objectId` / `@object.<field>`, `path`, `key`, `label`).
  Per item: swatches (path to colour strings, drawn as 18px squares with a 4px radius), the state pill (`state.path`
  mapped by `map` / `variantMap`; `state.empty` when missing, so an unmeasured item reads "not checked" and never as a
  pass), `refusal` (a reason: the card is listed, disabled, with the reason), `warning.list` (lines, or objects with an
  `item` template).
- Selected: `String(objectData[field])`; choosing changes the local choice only. Save is disabled for the stored one.
- Warning: the selected card's lines show in a warning band under the cards and add a second, secondary button
  (`confirmLabel`). Both buttons send the same request; the payload token `@confirmed` is false for Save and true for
  the confirm button, so the server decides whether an unconfirmed risky choice is refused.
- Save: `content.save = { method?, url, payload }` with tokens `@value`, `@confirmed`, `@objectId`,
  `@object.<field>`; without it, PATCH `{ [field]: key }` on the object. The server's message shows on refusal.
- Look (PtPortalInstellingen): 10px radius cards, 1px hairline, selected = 2px primary border, 18px radio, pill via
  CnStatusBadge, wrapping flex row (min 220px per card).
- Security: only the chosen key and the confirm flag are sent; the server authorises.
