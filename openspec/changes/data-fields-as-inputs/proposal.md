# Proposal: data-fields-as-inputs

## Why

Board PqOfferte draws the quote's facts as a form: each value in a 40px input box under its label, and a line under it
that says what the field is for ("De offerte hoort bij deze lead", "Staat op de pdf", "Wordt gezet bij verzenden"). The
data widget already edits a field in place on a click, but draws its values as plain text and has no line under them.

## What changes

- `fieldLook: "input"` (content key, passed by the host): each value is drawn as a 40px box with the control border; a
  click edits it in place as before.
- `overrides[key].hint`: a muted 13px line under the value, translated, in either look.

Without the keys nothing changes. No schema change.
