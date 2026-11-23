# contact-moment-parts

Board PqContactmoment draws three things the library could not express: the request a contact moment is about as a bordered row that opens that request and ends on its status pill, a "what now" side that states something in a bold sentence above the muted line instead of offering a button, and "Uitkomst noteren" as the primary button of the notes section. Live drew the request as a plain lead with the status as a separate fact, the whole side as one muted line (which widened the side column and pushed the step hints onto their own lines), and the outcome button as secondary.

## What changes

- facts: a `lead` entry takes `card: true` (a bordered row), `route` (the whole lead opens it) and `pill: { path, map?, variantMap?, variant? }` (a status pill at its end).
- next step: a stage takes `afterTitle`, a bold sentence drawn above `after`. Schema 2.162.0.
- record-notes: `outcome.saveVariant: "primary"` makes the outcome button the primary one.

All three are opt-in; nothing changes for a manifest that does not set them.
