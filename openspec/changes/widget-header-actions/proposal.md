# Proposal: widget-header-actions

## Why

COMPDIFF r20 flagged 29 cards on 18 boards whose title row holds buttons on the board and none live: "Flow uitvoeren"
(DqZaak and DqZaakMeer "Flows"), "Notitie toevoegen" (DqTaak "Notities", DqZaakHistorie), "Bewerken" (DqZaaktype
"Termijnen", DqZaaktypeOverzicht "Statussen", "Regels" and "Rechten"), and more. A widget could put actions in its header only
through its own code, so each would need its own feature.

## What changes

A widget definition takes `headerActions: [{ label, icon?, variant?, visibleWhen?, action }]`. CnDetailWidgetHost
resolves them (translated label, `visibleWhen` on the record, `@objectId` / `@object.<field>` tokens) and provides
them; the outermost CnWidgetWrapper or CnDetailCard of the widget draws them in its title row, and CnTabsWidget draws
them in a bare panel's heading. A click goes through the page's action dispatcher. Nothing changes for a widget
without the key.
