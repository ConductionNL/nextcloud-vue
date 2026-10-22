# Proposal: index-actions-menu-with-header-buttons

## Why

An index page with `headerButtons` takes the Actions menu out of its toolbar, as DqZaken draws it. DqAfdelingen draws
both: "Downloaden" beside the title and the "Acties" menu above the search field (COMPDIFF r24 `button "Acties":
missing on live`). The page had no way to keep the menu.

## What changes

An index page's `config.showActionsMenu` decides the toolbar's Actions menu: `true` keeps it beside the header
buttons, `false` removes it, and without the key it is shown unless header buttons are.

## Scope

CnIndexPage prop `showActionsMenu` (default null, derived as before). The schema already has the boolean key; its
description now covers index pages too.
