# Proposal: index-actions-menu-beside-tabs

## Why

PqBiExport and PqFlows draw the "Acties" menu at the end of the page tabs' row, not beside the title. An index page
could only put its header Actions menu in the header, so pipelinq's BI export page declared the menu and the boards'
place for it was empty.

## What changes

A `headerButtons` entry with `action: "actions-menu"` takes `placement: "tabs"`: while the page draws page tabs the
menu stands at the end of the tabs' row, a 34px button under the board look; without page tabs it stays in the header.
The menu is the same one: same entries, same rule that a menu with nothing to list is not drawn.

## Scope

CnIndexPage (the menu moves into the internal CnIndexHeaderMenu, used in both places), index-page.css and
look-board-index.css, and the manifest schema key `placement` on a header button.
