---
kind: code
---

# Proposal: sidebar-column-overrides

## Why

An index page's `columnOverrides` only reached the columns the page declares. A schema column the person turns on
in the sidebar's Columns tab was built from the schema alone, so an app could not say how it renders. OpenCatalogi
found this in a test of its publications list: a publication date column added from the sidebar showed relative
time ("2 weken geleden", "oktober 2025"), and the app had no way to show it as a date.

## What changes

- CnIndexPage applies `columnOverrides` to the schema columns the sidebar's Columns tab governs, so a column turned
  on there gets the same override as a declared column with that key.
- CnIndexPage passes `columnOverrides` to CnIndexSidebar, so the Columns tab lists an override's `label` like the
  table header's column menu does.
- A page without `columnOverrides` is unchanged.
