# Proposal: page-names-its-menu-entry

## Why

A page that has no menu entry of its own leaves the menu with no current entry. dossiq's Mailbox (`/postvak`) is reached from Team queue, and board DqPostvak marks Team queue while it is open; the live menu marked nothing.

## What changes

- A page may declare `menuEntry`: the id of the menu entry it marks as current.
- CnAppNav marks that entry only while no entry matches the route by the existing rules (route, query, params, the page below a list), so a page the menu links keeps its own entry.
- Manifest schema 2.192.0 declares `menuEntry` on a page.
