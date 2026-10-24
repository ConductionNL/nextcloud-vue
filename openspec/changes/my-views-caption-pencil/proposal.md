# Proposal: my-views-caption-pencil

## Why

Board DqZijbalk draws a pencil beside the "Mijn weergaven" heading: the place where the views in the menu are changed.
The heading had none, so a user had to know the user settings dialog holds "Views in my menu".

## What changes

- A caption entry may carry `action: "user-settings"`; CnAppNav then draws the caption's pencil as a button that opens
  the user settings dialog (cnOpenUserSettings), as an `href` caption draws it as a link.
- The standard My views caption (withSavedViewMenu) carries that action.
