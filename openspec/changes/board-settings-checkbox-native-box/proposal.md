# A board settings checkbox is the native box

## Why

In a settings section in the board look, NcCheckboxRadioSwitch draws its 20px outline glyph in the primary colour with a 600 label. The boards draw a native checkbox: an 18px square with a grey edge and a regular label. PqBeheer's Verkoop, Kassa and Producten differed for that reason (TOOL-3, pl3). Every Dq board that draws a checkbox draws the same box, and a board dialog's checkbox already is it.

## What changes

- In a board-look settings section (NcSettingsSection's `.settings-section` or CnSettingsSection) a checkbox's glyph is hidden and the 18px box is drawn in its place, the same box a board dialog draws. Its label is on weight 400.
- The Nextcloud look keeps the glyph. Radios and switches are unchanged.
