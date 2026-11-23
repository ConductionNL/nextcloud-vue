# Proposal: board-map-controls

## Why

COMPDIFF r24 measured the map view of the cases index (DqZakenKaart) with the zoom buttons flagged four times: 44px
high instead of 36, square instead of rounded, no edge and no icon. The board draws the map's buttons as one column in
the top right corner, 12px in: zoom in, zoom out, all pins in view, my location, full screen. Each is a 36px white
square with the control edge, an 8px radius and an 18px icon, 6px apart. Live draws Leaflet's zoom pair in the top left,
the fit, locate and full screen buttons as a 30px Leaflet bar under it, and names the last three in English on a Dutch
instance.

## What changes

- In the board look, CnMapWidget draws its zoom buttons in its own control bar instead of Leaflet's zoom control, and
  puts that bar in the top right corner. The fit button uses the board's crosshairs icon. A base map switcher, when
  there is one, moves to the top left so it does not sit in the column.
- The board stylesheet draws the bar as the board does: a column with 6px between the buttons, 12px from the corner,
  each button 36px with the control edge, the control radius, the main background and the main text colour.
- "Fit all markers", "Show my location" and "Toggle fullscreen" get their Dutch ("Alle pins in beeld", "Naar mijn
  locatie", "Volledig scherm").

The Nextcloud look keeps Leaflet's zoom control and the bar in the top left, unchanged. `zoomControl: false` still
leaves the zoom buttons out in both looks.
