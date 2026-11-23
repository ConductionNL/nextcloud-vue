# Proposal: widget-header-action-link

## Why

A widget's `headerActions` drew every entry as a button. The board draws some of them as a text link in the card's
title row: DqTermijnen's "Kwartaalrapport downloaden" is an underlined link at the end of the Kwartaalrapport title,
where live drew an outlined button with an icon (COMPDIFF r24 `button "Kwartaalrapport downloaden": extra on live`).

## What changes

A widget header action may set `variant: "link"`. It then renders as a link-styled button: the label in the primary
ink, underlined, without an icon or a frame. It still dispatches its action on click.

## Scope

`resolveWidgetHeaderActions` keeps `link` as a variant; `CnWidgetHeaderActionButtons` draws it. Primary and secondary
are unchanged. No schema change: a widget's `headerActions` entries are not closed by the schema.
