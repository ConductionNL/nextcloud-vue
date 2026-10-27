# Proposal: board-map-pane-height

## Why

r32 (27 Oct), DqZakenKaart: the map was blank and read "missing on live". board-list-rhythm gave the board map a 533px min-height inside an auto-height card, but CnIndexPage sets the widget's inline height to 100%, which resolves to nothing there, so the Leaflet pane (height 100% of the widget) stood 0px tall. The same run read the base-map switch as a dark 36px square without an edge or icon: the toggle carried a masked background, so its ground was the icon colour.

## What changes

The board map is 533px tall (overriding the inline 100%), so the Leaflet pane fills it. The base-map toggle link is the edged 36px button with a white ground and an 18px layers svg; the control around it draws nothing. Probed live by injection: pane 533px with tiles, toggle 36x36 at the map's +12,+12 with a 1px #828a95 edge, white, svg 18px, as the zoom buttons. No schema change.
