# Proposal: board-dialog-top

## Why

The boards top-align dialogs (DqNieuweZaak top at y≈85, DqUwWachtrij y≈120, DqVolgendeStap y≈96 at 1440 wide);
NcDialog centres them vertically, so a short dialog sat in the middle of the screen.

## What changes

- Above 600px a board dialog's top edge sits `--cn-dialog-top` (default 88px) down; its height is capped to the
  screen below that. The phone bottom sheet is unchanged. The Nextcloud look is unchanged.
