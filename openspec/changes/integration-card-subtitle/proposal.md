# An integration card shows its widget's subtitle

## Why
DqZaakTaken draws "Afspraken" with "Uit de agenda, gekoppeld aan deze zaak" and "Kaarten" with "Coördinatie in Deck,
gekoppeld aan deze zaak". dossiq declares both subtitles on the widgets. r25b (24 Oct) drew neither, because an
integration card (CnDetailCard) had no subtitle and the host passed none.

## What changes
- CnDetailCard gets a `subtitle` prop, drawn as a 13px muted line under the title.
- The widget host passes the widget's translated `subtitle` to an integration card. Every integration card whose root is
  a CnDetailCard receives it through attribute fall-through (calendar, deck and the rest), so no card needed editing.
No schema change.
