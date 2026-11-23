# Proposal: board-map-layers-button

## Why

r31 strict verdicts on DqZakenKaart: a 44px button at the map's top left was extra on live. It is Leaflet's base-map switch (dossiq configures two base maps): a grey-edged square with a bitmap icon, titled "Layers" in English and without an accessible name, unlike the board's 36px edged map buttons.

## What changes

The switch is named in the user's language ("Kaartlagen") as its title and accessible name. In the board look it is the board's 36px edged square, 12px in from the top left, around an 18px layers icon in the main ink. Probed live by injection: control 36x36 at the map's 12,12, border 1px #828a95, radius 8, as the zoom buttons. The board draws it (design-system PR). No schema change.
