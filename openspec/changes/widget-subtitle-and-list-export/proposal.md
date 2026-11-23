# Proposal: widget-subtitle-and-list-export

## Why

DqZaakAssistent draws "Wat de assistent op deze zaak deed" with a muted line under the title ("Elke suggestie wordt
vastgelegd, ook als niemand hem gebruikt") and a "Downloaden" button in its header that only the AI-toezicht role
sees. CnWidgetWrapper already draws a subtitle, but a detail page's widget card never passed one; and an `object-list`
had no export.

## What changes

- A widget card on a detail page takes `subtitle` from the widget (or its content) and draws it under the title.
- `object-list` takes `content.export: { label?, format?, group? }`: a header action that downloads the list as
  filtered here through OpenRegister's export endpoint. `group` shows the action to members of one Nextcloud group
  only. It hides the button; the export endpoint still applies its own read rights to every row.

## Scope

Additive opt-ins.
