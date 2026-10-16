---
kind: code
---

# Proposal: screens-links-module-cards

## Summary

Board PqModules draws pipelinq's "Modules en meer" page with module cards above the link cards: per module an icon,
the title, an "In het menu" or "Uit" badge, a description, a line naming its pages, the pages as links, an Open button
and, for a module that is off, "In het menu zetten: Beheerinstellingen", plus "3 van 6 staan in het menu" beside the heading and a note under the cards. A `type: "links"`
page takes them as `config.modules`. Whether a module is in the menu stays the app's; turning one on happens on the admin page (Ruben's ruling, design-system #244).

## Scope

New internal component CnModuleCard, a modules section in CnLinkCardsPage, `$defs/linkModule` and three config keys in
the manifest schema (2.108.0), Dutch strings, docs, unit tests. The link cards themselves are unchanged (their look is
L31's change). Pages without `modules` render as before.
