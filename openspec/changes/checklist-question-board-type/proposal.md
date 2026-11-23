# A checklist question reads as the board draws it

## Why

COMPDIFF r25e DqInspectie (25 Oct): the question cards' legend sat on a 22.5px line (board 18), the options read bold (a theme makes labels bold; the board draws them 15px regular), and help text and the section heading had no size of their own.

## What changes

- Legend 15px/600 on a 1.2 line; options 15px at weight 400; help 14px; section heading 14px/600.

## Impact

CnChecklistRunWidget styles only. The board draws the help text, the section heading and the required mark live shows (design-system amend).
