# Proposal: board-admin-settings-header-rhythm

## Why

The board draws the admin settings header 4px under the content's top, the title row 40px with the buttons, 14px
crumbs 6px under it, and the tab strip 20px under the header, at 187 (DqInstellingen, DqBeheerinstellingen,
DqInstellingenAlgemeen). Live the title sat at 92, the 15px crumbs at 131.6, and the strip at 194: the shell is a grid
whose 20px gap already spaces its rows, and the header added its own 20px bottom margin on top.

## What changes

In the board look the admin settings header inside the shell drops its bottom margin and pads 4px 0 8px, the title
takes the 40px row height, and the crumbs are 14px on a normal line. Measured live with the rules applied: title 96,
crumbs 142, buttons 96, header 75px tall, tab strip 187, as on the board.
