# Proposal: status-list

## Why

Launchpad gets widgets for OpenProject work packages, dossiq cases and XWiki pages. Each is a short list of links
with a detail line, a due date and a status, with counts per status above it. Drawing that three times in launchpad
gives three looks.

## What changes

- `CnStatusList`: items `{ id, title, href?, external?, meta?, due?, done?, status? }` with a status pill and a due
  date that reads as overdue once passed, plus an optional row of counts per status. It fetches nothing.

## Scope

nextcloud-vue only.
