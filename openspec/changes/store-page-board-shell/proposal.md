# Proposal: store-page-board-shell

## Why

Board PqStore draws the store page with these parts, and CnStorePage drew only the cards:
- a page header with buildiq and Publish;
- lens chips with counts (All, Installed, Updates available, Connectors);
- a side column listing what is installed from the store, when it was last checked for updates, and what ships with the app.

## What changes

Under the board look only, CnStorePage draws:
- a CnPageHeader, with `{count}` in the description filled by the registry's item count;
- the lens row, with a new `kindLenses` prop that adds one chip per item kind, and the search beside it;
- the side column: installed items with their versions and an Update pill, Updates (Last checked from `checkedAt`, the count, Check now) and "Included with {app}".

A card with an update reads "Version {installed}, {latest} is out". The Nextcloud look is unchanged.
