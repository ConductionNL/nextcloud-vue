# Proposal: detail-page-strings-dutch

## Summary

Two English strings leave the detail page for a Dutch reader: the title of an in-body section, and the skip link to the primary action.

## Why

Zuiddrecht live round 3 (14 Oct), a pipelinq ticket: the section heading read "Asked about" although pipelinq's catalogue has "Vraag over", and the skip link read "Skip to In behandeling nemen".

- `CnBodySections` printed `section.title` as written. Every other manifest title on the detail page goes through the host's `cnTranslate`.
- `CnDetailPage.skipLinkLabel` looked up the fragment "Skip to" in the host's catalogue and glued the label after it. No app carried the fragment, and a fragment cannot follow Dutch word order.

## What changes

- `CnBodySections` runs each title through the injected `cnTranslate`, and prints it as written without one.
- The skip link is one library string, `Skip to {action}` ("Ga naar {action}").
