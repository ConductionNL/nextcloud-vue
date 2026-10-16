---
kind: code
depends_on: [screens-index-list-parity, screens-view-switch-parity]
---

# Proposal: screens-index-board-gaps

## Summary

The pipelinq list boards (PqContacten, PqOrganisaties, PqContactmomenten,
PqLeads) and the dossiq ones draw the same index page. Live, under the board
look, that page still differs in ways no manifest can fix:

- An Export header button with a label ("Download") lost its icon: the icon
  was only added when the label was empty too.
- The view switch drew two segments. The boards draw four (table, cards,
  board, map) on 126 of the 148 list boards, but the library drew the extra
  ones only when the manifest listed them in `viewSwitch`.
- OpenRegister marks every record the reader never opened as unread, so a
  fresh contact list read entirely in bold. No list board draws unread rows.

## Reference screens

| Screen | Live board |
|---|---|
| `pipelinq/PqContacten` | https://identity.conduction.nl/screens/board?id=pipelinq/PqContacten |
| `pipelinq/PqOrganisaties` | https://identity.conduction.nl/screens/board?id=pipelinq/PqOrganisaties |
| `pipelinq/PqLeads` | https://identity.conduction.nl/screens/board?id=pipelinq/PqLeads |

## Out of scope

The Nextcloud look: it keeps the declared icon, the offered segments and the
unread rows exactly as before.
