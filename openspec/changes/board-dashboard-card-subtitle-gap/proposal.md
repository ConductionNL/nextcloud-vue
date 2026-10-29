# Proposal: board-dashboard-card-subtitle-gap

## Why

A board dashboard card's header is padded 12px below, less the first line's leading (0.15em), so a title-only head
sits its content 12px under the title's text. A card with a subtitle ends its head on the subtitle, whose box carries no
such leading, and its content came 2.25px too high: r34 DqCatalogus "Objecttypen" gapBelowTitle 41.2 against 43.5, and
DqProcesanalyse "Knelpuntenranglijst" / "Doorlooptijd per behandelaar" 38.6 against 41.

## What changes

- Board look: a dashboard card whose header holds a subtitle is padded 12px below its header. A ruled list keeps its 6px.
