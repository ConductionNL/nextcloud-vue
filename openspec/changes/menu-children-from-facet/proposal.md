# Proposal: menu-children-from-facet

## Why

DqCatalogus draws the case type folders (Informatie, Bezwaar en beroep, VTH, Sociaal domein) under "Zaaktypen" in its
folder card, as muted sub-rows. A case type's folder is its `category`, a free word each organisation chooses, so the
manifest cannot list them. The menu widget only drew declared children, so the live card had none.

## What changes

- A menu item takes `childrenFrom: { register, schema, field, url }`: one child per value of that facetable field,
  read from OpenRegister's facet, linking to `url` with `{value}` filled in, after any declared children.
- The widget carries `cn-menu-widget--expanded` when `expandedByDefault` is on.
- In the board look an expanded tree draws no carets, and its second level 28px in at 14px in the muted ink.

## Scope

Additive. No schema change: a dashboard widget's `content` is free-form.
