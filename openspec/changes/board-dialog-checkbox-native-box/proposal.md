# A board dialog's checkbox is the native box

## Why

In a board dialog NcCheckboxRadioSwitch draws its outline glyph in the primary colour. The boards draw a native checkbox: an 18px square with a grey edge. DqZaakSamenwerken's "Alleen een deel van de zaakvelden delen" differed for that reason (r32 strict, "visually differs").

## What changes

- In a board dialog the checkbox's glyph is hidden and an 18px box is drawn in its place: grey 1px edge while open, primary fill with a white tick once checked. Only the board look changes; the Nextcloud look keeps the glyph.
