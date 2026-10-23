# The side panel's close button is "Close side panel"

## Why

The boards name the side panel's close button "Zijpaneel sluiten"
(DqZakenSorteren, DqFilterBeheren). Live used NcAppSidebar's own name,
"Close sidebar" ("Zijbalk sluiten"). The panel is called a side panel
everywhere else in the library and the apps.

## What changes

CnIndexSidebar and CnObjectSidebar name NcAppSidebar's close button "Close
side panel", in both its aria-label and its title. NcAppSidebar has no prop
for this; it keeps the name in its `closeTranslated` data, which the new
helper `labelSidePanelClose` sets once the panel is mounted. One nl/en string
is added.
