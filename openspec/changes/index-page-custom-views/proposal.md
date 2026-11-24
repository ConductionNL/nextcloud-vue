---
kind: code
---

## Why

An app sometimes needs a view of the whole filtered list that is its own: stackiq's
connections list wants a diagram of exactly the rows the table shows
(stackiq change `connections-diagram-and-graph-export`, task 2). `CnIndexPage` takes a
custom component per row (`listComponent`) or per card (`cardComponent`), but its view
modes are fixed (`table`, `cards`, `list`, `map`, `board`, `dateAxis`, `calendar`), so
such a view had to become a page of its own with a second fetch path and without the
list's filters.

## What Changes

- A new opt-in `customViews` prop on `CnIndexPage` (manifest `pages[].config.customViews`):
  `[{ id, label, icon?, component }]`. Each view is a segment of the view switch after the
  built-in ones and opens with `?_view=<id>`.
- The component the app names (registry or customComponents) gets the filtered `rows` the
  other views draw, `schema`, `loading` and `rowKey`, and emits `rowClick` to open a row, as
  a table row click does.
- `CnActionsBar` takes `customViewSegments` to draw those segments; its mode validators
  accept the ids.
- A view whose id is a built-in mode, or whose component does not resolve, is left out. A
  page without `customViews` is unchanged.
- No manifest schema change: `pages[].config` is free-form, and the page renderer hands its keys to `CnIndexPage` as props.
