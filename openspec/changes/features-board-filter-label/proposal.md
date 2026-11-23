# Proposal: features-board-filter-label

## Why

Board DqFunctionaliteiten names the status filter group "Toon"; the library always named it "Status", so the board's
toolbar and the page's group did not pair (COMPDIFF r20: toolbar missing, badge "Status" extra).

## What changes

`CnFeaturesBoard` takes `filterLabel`, the filter group's accessible name through the app's translate; empty keeps
"Status". The features-and-roadmap page passes it on from its `board` config.
