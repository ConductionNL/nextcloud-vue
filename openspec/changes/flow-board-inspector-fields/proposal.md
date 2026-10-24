# Proposal: flow-board-inspector-fields

## Why

Board DqFlow's inspector edits the selected step in place: "Welstand nodig?", the pill "Beslistabel van OpenRegister",
the fields Beslistabel and Invoer as controls, then where the step goes ("Ja  Deelzaak welstandsadvies",
"Nee  Besluit publiceren"). The flow board listed the settings as read-only text and put the step's log lines in the
middle of the card; every change needed the Edit step dialog.

## What changes

- The selected step's settings are fields: the ones the step sets plus the required ones, from the catalogue's
  `configForm`. A field with options is a select, a boolean a switch, a textarea or object value a text area (written
  back as an object when the text is JSON), the rest a text field. A text field writes when it is left; each write is
  one undoable edit. On a locked flow the fields are disabled. Every other setting stays behind Edit step.
- Under the fields, each outgoing line by its name, else "Next", with the step it leads to.
- The type pill reads "<palette label> from <app>" for a curated step ("Beslistabel van OpenRegister").
- The recent log lines move into a collapsed "Recent log lines of this step" disclosure; nothing is removed.

## Reach

Every board-look flow page. Stacked on flow-board-save-as-version. No schema change.
