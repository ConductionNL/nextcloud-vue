# Proposal: next-step-title-tokens

## Why

Board DqZaak titles the "what now" card "Wat nu? Stap 2: in behandeling": the step and the case's public status label,
mid-sentence in lower case. The card's title was a fixed text per stage, so it read "Wat nu? Behandelen" and COMPDIFF
paired the card with another one on every case board (17 boards draw it). The board's term card action is a 13px chip
with a 17px radius; live it was 15px.

## What changes

A `nextStep` title and `after` line may name record fields as `{path}` tokens, and may be a list of candidates: the
page (and the next-step widget) translates each, then fills the first whose fields all have a value. A new `lower`
token format writes a value in lower case. The manifest schema (2.134.0) takes a string or a list. In the board look the
countdown's action is 13px with a 17px radius.
