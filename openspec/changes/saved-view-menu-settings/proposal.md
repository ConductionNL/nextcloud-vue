# Proposal: saved-view-menu-settings

## Why

Every app's menu ends with My views, the saved views a user pinned (`cn_saved_view_menu`). A view could only be pinned
or unpinned from a list's side panel, one page at a time, and the order was the order of pinning. Board
DqPersoonlijkeInstellingen (design-system #305) gives the user settings a section for it, "Weergaven in mijn menu":
the entries in menu order, reordered by dragging or the arrow keys, taken out with "Uit menu halen", and a "Weergave
toevoegen" picker over every view the user can see, with a hint under it.

## What changes

- `CnSavedViewMenuSettings`: the section body. It reads and writes CnAppRoot's menu holder (`cnSavedViewMenu`) and lists
  the views of every index page that offers saved views: the page's default views and the fetched views that belong on
  it. Each row and choice names the page it filters. Removing an entry never deletes the view.
- CnAppRoot's menu holder gains `set(entries)`, which replaces and stores the list.
- CnAppRoot's user settings dialog gains the section key `views`, drawn after the app's own sections when a page offers
  saved views. An app places it with `userSettingsSections`.
- CnOrderedListField gains `removeLabel` (the remove action in words, its accessible name the words and the row) and
  `addHint` (a line under the picker).
