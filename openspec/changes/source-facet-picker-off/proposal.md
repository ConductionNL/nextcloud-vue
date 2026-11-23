# Proposal: source-facet-picker-off

## Why

DqPostvak filters the mailbox on its channel through the Filter button and the side panel, with "Kanaal: alle" on the
Active line. Live also draws a "Kanaal [alle]" picker after the search, because the endpoint source turns every declared
facet into a toolbar picker. The board draws none, and the panel already offers the same filter.

## What changes

An endpoint source facet (`sourceConfig.facets[]`) may declare `picker: false`: the page draws no toolbar picker for
it. The source still reads its counts off the answer. Facets without the key keep their picker.

## Scope

nextcloud-vue, CnIndexPage. No schema change (sourceConfig is open). dossiq sets it on the Postvak channel facet.
