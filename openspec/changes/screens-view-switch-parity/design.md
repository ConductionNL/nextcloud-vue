# Design: screens-view-switch-parity

## Disabled, not hidden, and only on request

The library hides a segment the page cannot open on purpose: clicking a
segment to learn it does nothing is worse than not seeing it. The boards draw
all four anyway, and the boards are the canon. Both hold with an opt-in key:
`viewSwitch` names what the switch draws, and the segments the page cannot
open are drawn but disabled (`disabled`, faded to half opacity,
`cursor: not-allowed`, a tooltip saying why). A page without the key keeps
today's switch.

The disabled list is computed by the page (`viewSwitchDisabledModes`: listed
minus what `effectiveToggleModes` and the map segment offer) and handed to
`CnActionsBar` as `disabledViewModes`, so the bar never decides what a page
can do. The bar merges the disabled modes into its fixed board order (table,
cards, board, map) and never doubles a mode that is offered.

## Icons and name

The boards draw 18px icons; the table segment is the plain bulleted list, not
the boxed one used outside the board look. The group's accessible name was
"View", which the Dutch catalogue renders "Bekijken" (a verb). The boards say
"Weergave"; the catalogue maps "View mode" to that.
