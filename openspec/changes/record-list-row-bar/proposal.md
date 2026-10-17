# Proposal: record-list-row-bar

## Why

Board DqTeamwachtrij ("Team vandaag") draws a thin track under each colleague, filled to their share of the busiest
colleague. Board PqWachtrij ("Team vandaag") draws the same track against each agent's own capacity (open tickets
against `maxConcurrent`), in the error colour once an agent is over it. The record list had no such track.

## What changes

- CnRecordListWidget takes `content.bar`: `{ valueField, maxField?, overVariant? }`.
- Without `maxField` the track is the row's share of the largest row; with it, the row's value against its own maximum,
  in the error colour past it with `overVariant: "error"`.
- Only the `rows` presentation draws it. Without `bar` nothing changes.
