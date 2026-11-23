# Proposal: board-mail-row-initials-size

## Why

r45 DqZaakEmail: the board draws each linked mail's initials as a 32px round tile. The board look set NcAvatar's
root to 32px, but NcAvatar sizes the tile inside it and the initials' line from its inline `--avatar-size` (36px for
CnEmailTab), so the initials stood 32 by 36 and were read as a badge, not the board's tile ("SV", "PJ", "VW").

## What changes

- In the board look the linked mail's NcAvatar takes `--avatar-size: 32px` and a 32px line, so the tile and the
  initials inside it are 32px as well. Nextcloud's own look is unchanged.
