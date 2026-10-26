---
kind: code
screens: [PqCampagne]
---

# Proposal: menu-item-count-labels

## Summary

Board PqCampagne's "In deze campagne" card lists the campaign's newsletters, social posts, article and leads as links
whose text names the count: "2 nieuwsbrieven", "1 artikel, de inhoud van de pagina", "208 leads". The menu widget's
`countFrom` already counts an item, but it draws the number as a badge at the row's end, and its filter cannot name
the record.

## What changes

- A menu item's `countLabel` (a string, or `{ one, other }` as a header pill's countLabel takes it) with `{count}`
  becomes the item's label once its count is read. It is translated first, and no badge is drawn.
- A `countFrom` filter resolves filter tokens against the detail page's object context, so `@objectId` scopes the
  count to the record. A filter whose token cannot be resolved yet is not sent; the plain label stays.
