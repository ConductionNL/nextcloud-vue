# Module and list cards on the normal line

## Why

Board PqModules sets the module card titles (17px/700), the pages line and the page links on the normal line, and the list cards' titles ("Ook in Pipelinq", "Meer") too. Live inherited Nextcloud's 1.5 line: the titles were 25.5px high instead of 20.4px, and every card grew by the extra leading of its link rows. Under nldesign the module card's Open button was also underlined, because the theme underlines every link.

## What changes

- CnModuleCard: title, pages line and page links on `line-height: normal`; the Open button never underlined (`!important`, as the list rows already are).
- CnLinkCardsPage: a list card's title on `line-height: normal`.
