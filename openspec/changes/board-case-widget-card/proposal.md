# Proposal: board-case-widget-card

## Why

CnConversationWidget and CnDocumentReviewWidget draw their own card (`cn-case-widget-card`) with Nextcloud's large
radius and 20px padding, which no board rule reached. On DqZaakContact the conversation is the first card of the
Contact tab's stack, and it drew all four corners rounded where the board joins it to the open tab with a square
top-left, and its title at 16.5px with a 24.75px line where the board titles a card at 17px, 1.2.

## What changes

In the board look a case widget card takes the board card radius and padding; as the first card of a stack its
top-left is square, as a widget card there already is; a conversation's title takes `--cn-board-heading-size` at 1.2.

## Scope

Board-only.
