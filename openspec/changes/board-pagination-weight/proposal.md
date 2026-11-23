# Proposal: board-pagination-weight

## Why

The boards set a table footer's page links and "Volgende" at the regular weight and only the current page at 600
(DqZaken, DqKlachten, DqWooVerzoeken, DqPersoonlijkeInstellingen). The links are buttons, and Nextcloud's `button`
rule set them bold (COMPDIFF r19: "Volgende" fontWeight 400 > 700 on four boards).

## What changes

In the board look a page link is 400; the current page stays 600.
