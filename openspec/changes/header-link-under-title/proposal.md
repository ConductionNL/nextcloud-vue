# Proposal: header-link-under-title

## Why

DqDashboard draws "Alles bekijken" under the titles of Vastgelopen zaken, Zaken die u volgt and Recent geopend, not at the
end of the title row. A header link could only sit among the header actions, so the cards measured one header action
the board does not draw and a title row taller than the board's.

## What changes

`headerLink.placement: "title"` draws the link under the title, at the title's edge, in the title block. The header
then has no actions group for it. Without the key the link stays among the actions. Manifest schema 2.145.0 accepts the
key.

## Scope

nextcloud-vue CnWidgetWrapper and the manifest schema; dossiq's Dashboard tiles use it (R22-DASH).
