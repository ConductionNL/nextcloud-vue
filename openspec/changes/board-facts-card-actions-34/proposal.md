# Proposal: board-facts-card-actions-34

## Why

The boards draw a facts card's action buttons at the 34px card control in every card: "Terugboeken" on the payment card (PqKassabon), "Goedkeuren" and "Afwijzen" on the cash difference card (PqKassadienst). In the board look CnActionButtons carries the header's 40px neutral secondary rule (`.cn-action-buttons .button-vue--secondary`), and only a side-column facts card brought its buttons back to 34. COMPDIFF pl4 PqKassabon 9: `h 34>40` on Terugboeken, a main-column card.

## What changes

In the board look a facts card's action buttons are 34px high in every card. The rule is (0,5,0), so it outweighs the header rule's (0,4,0) without `!important`. The side column keeps its full-width, start-aligned buttons.

## Scope

Board-only, `look-board-detail.css`. No schema change. No dossiq page declares facts actions, so Dq is unchanged.
