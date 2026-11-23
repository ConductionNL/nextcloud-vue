# Proposal: board-icon-label-button

## Why

The boards draw a button with an icon and a label 14px in at both sides, with 14px text and a 16px icon 8px from its
label (DqZaakEmail "Notitie toevoegen", DqVthInstellingen "Regel toevoegen", DqUwWachtrij "Iets inplannen"). NcButton
pads its start 4px and its end 12px and puts a 20px icon in a 30px slot (COMPDIFF r19: button paddingLeft 12/14 -> 4,
80 components on 38 boards). The header, toolbar, follow pill and Meer chevron already have surface rules; an earlier
general rule collided with them.

## What changes

The board look gives every NcButton with an icon and a label the board's padding (through NcButton's
`--button-padding`), 14px text, a 16px icon and an 8px gap. The condition sits in `:where()`, so the rules weigh three
classes: more than NcButton's own two, less than any surface rule, which keeps its own value. The header and action
button icon rules drop their own 8px margin, which the gap now gives. The tab strip's Actions button takes 12px.
Plain Nextcloud (no board look) is unchanged.
