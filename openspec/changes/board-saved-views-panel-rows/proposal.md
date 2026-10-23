# The saved-views panel as the boards draw it

## Why

DqFilterBeheren and DqFilterInMenu draw the side panel's saved views as
follows:

- "Weergave opslaan" is a filled, 40px primary button across the panel.
- Each row is padded 2px 4px 2px 10px, with 8px between its parts and a
  radius of 8.
- A row's name sits 6px from its top and bottom, at 14px/600.
- The manage menu is a 34px round button.

COMPDIFF r24 measured the save button 34px and outlined, the manage buttons
with radius 8, and the rows without their inset or gap.

## What changes

In the board look, CnSavedViewsPanel draws "Save view" as the primary button,
and look-board-index.css sets the button height and the row, name and
manage-menu spacing. The Nextcloud look is unchanged.

Checked on :8080 by injecting the CSS:
- the rows have their padding and 8px gap
- the names are 29px tall, with 6px of padding
- the manage button is round
- the save button is 40px

The primary variant comes from the component, so it shows only with the
library build.
