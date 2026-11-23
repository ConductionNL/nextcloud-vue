# A collapsible card can put its chevron before the title

## Why
PqProspects draws the "Ideaal klantprofiel" card with its collapse chevron left of the title, the title 23px in. The
collapsible CnDetailCard only drew the chevron at the far right, after the header actions, so the card read as a
different control and its title sat at a different inset. The collapse button's name was also English in every
language ("Expand", "Collapse").

## What changes
- CnDetailCard gets a `chevronStart` prop: a collapsible card draws its collapse button before the icon and title
  instead of after the actions.
- The collapse button is named through translation ("Expand", "Collapse") and reports `aria-expanded`.
No schema change.
