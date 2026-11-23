# Design: screens-view-switch-links

- `viewSwitchLinks` = `{ <mode>: { route, params?, query? } | { href } }`, mode one of table, cards, board, map.
- A linked mode joins the fixed order (table, cards, board, map). It is an anchor with the segment's icon and
  accessible name, never pressed. A plain click pushes the route; a modified click opens the anchor's href.
- A mode the page opens in place stays a button: the link is ignored for it.
- A linked mode is not drawn disabled, even when `viewSwitch` lists it and the page cannot open it.
- A route the router cannot resolve is left out, so no dead segment is drawn.
