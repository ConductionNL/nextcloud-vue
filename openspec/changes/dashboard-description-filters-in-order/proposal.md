# Proposal: dashboard-description-filters-in-order

## Why

DqProcesanalyse draws its description line as "Afgehandelde zaken … · [Gemiddeld | Mediaan] [Laatste 12 maanden]
[Alle zaaktypen]": the segmented measure first, then the two selects, without dots between them. CnDashboardPage drew
every select on the description line before every segmented filter, with a dot after each select, so dossiq kept the
period and case-type selects in a filter row of their own under the header.

## What changes

The description line draws its page filters in the order the page declares them, selects and segmented groups alike,
before a `dateRange` period group. A select is set off by a middle dot only when a segmented group follows it.
DqDoorlooptijd ("alle zaaktypen · Maand | Kwartaal | Jaar") declares the select first and draws as before.

## Scope

nextcloud-vue CnDashboardPage; dossiq moves its Procesanalyse filters onto the description line (R22-DASH). No schema
change.
