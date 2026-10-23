# Proposal: saved-view-names-the-page

## Why

DqFilterInMenu opens Pieter's saved view "Termijn deze week" from the menu on the left. The board heads the list and
its side panel with the view's name; live keeps "Alle zaken", so the reader cannot see which view they are in.

## What changes

`CnIndexPage` takes `savedViewTitle` (manifest `config.savedViewTitle`, default off). On, an applied saved view's name
is the page title and the side panel's title. With no view applied, or the option off, the page keeps its title.

## Scope

nextcloud-vue, CnIndexPage only. Opt-in, so no page changes until it sets the key (dossiq Cases will). No schema change:
index page config is open.
