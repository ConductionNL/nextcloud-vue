# Proposal: mail-tab-compose-and-link

## Why

The DqZaakEmail board draws the mail tab with two buttons beside its heading, "Mail koppelen" and "Mail opstellen".
Live, CnMailTab put the empty draft in its template row and the linked mail drew its own "Link existing email" and
"Compose in Mail" row lower down, so the record's two main mail actions sat in two places. Ruben decided (21 Oct) the
tab gets both as header actions, generic so pipelinq and other apps get them too.

## What changes

`content.headerActions` (`["link", "compose"]`) puts the buttons beside the tab's heading. Compose opens the existing
empty draft (or Nextcloud Mail's composer without a draft endpoint); Link opens the linked mail's picker and links the
chosen message through the existing OpenRegister email links. With either in the header the row's empty-draft button
and the linked mail's own buttons go. Without the key nothing changes.
