---
kind: code
---

# Proposal: board-side-lead-gaps

## Summary

Board DqOrganisatie starts two side cards closer to or further from their titles than live does (r26a):

- "Lopende zaken": the case is 10px under the title. Live is at 17.7, because the side card subtracts the first line's leading from its 10px padding and the side list then adds a hairline and 10px row padding.
- "Hoofdcontact": the name is 15.5 under the title, with the row 12px under it and the two lines centred on the 40px tile. Live is at 9.8, because the name inherits a 22.5px line and the padding is 7.75.

## Scope

- `src/css/look-board-detail.css`: a stacked side list starts 10px down with no hairline or row padding, and a main contact starts 12px down with its lines at their normal height. The app sets `density: "stacked"` on that side list.
