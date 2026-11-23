# Proposal: facts-user-format

## Summary

`format: "user"` on a facts entry shows a Nextcloud user id as the user's
display name, through the shared `userDisplayName` cache the header meta
tokens already use.

## Why

Board DqZaak draws the handler on the "Behandeling" card by name; the case
stores the uid. Without this the card shows "pieter" instead of "Pieter Jansen".
