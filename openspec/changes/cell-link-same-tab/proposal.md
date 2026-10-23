# Proposal: cell-link-same-tab

## Why

A connection row on DqInstellingen opens its settings card on the same page (`#<card id>`, nextcloud-vue
settings-section-opened-from-row). A `widget: "link"` cell with `widgetProps.href` always opened a new tab.

## What changes

- `widgetProps.target: "_self"` opens the link in the same tab; an href that is an anchor on the page (`#…`) does so
  without it. Every other href still opens a new tab with `rel="noopener"`.

## Scope

CnCellRenderer. No schema change.
