# Proposal: board-primary-no-edge

## Why

The boards draw a primary button as its fill alone, with no border. Outside the page header, a board-look primary
NcButton still carries NcButton's 1px border. COMPDIFF r20: "Volgende stap" on DqZaak and the twelve case tab boards,
"Versturen" (DqBerichtVersturen), "Genereren" (DqDocumentGenereren), "Overdragen" (DqOverdragen), "Opschorten"
(DqVolgendeStap), "Archiveren", "Besluit vastleggen" and the settings "Opslaan" buttons: about 30 buttons on 25 boards
measure `border 0>1`.

## What changes

In the board look a primary NcButton draws no border. The page header's primary rules already did this; the rule now
holds for every board-look primary outside a breadcrumb. A page in the Nextcloud look inside a board app is left alone.

## Scope

Board-only: the default look keeps NcButton's edge. WCAG: the primary fill keeps its own contrast against the page; the
focus ring is NcButton's outline and is unaffected.
