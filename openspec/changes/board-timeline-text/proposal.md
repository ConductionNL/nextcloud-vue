# The manage timeline's text as DqZaakHistorie draws it

## Why
r26b (25 Oct, the timeline cards now framed):
- **Subtitle and event count:** both read 15px in main ink. A theme's paragraph tokens beat the component's 14px muted.
- **Count line:** no hairline above it.
- **Note form card:** started 21.9px lower than the board. Its template picker carried its label inside the field, where the board puts "Sjabloon" above it.

## What changes
- **Board look:** the subtitle and the count are 14px muted, with the paragraph tokens set to match. The footer gets a hairline and 12px above it. The note form card starts 12px under its heading, with each label 6px above its field.
- **All looks:** the template picker gets a label element above it, like the note field, and keeps its accessible name through `ariaLabelCombobox`.

No schema change.
