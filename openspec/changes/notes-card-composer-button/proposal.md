# Proposal: notes-card-composer-button

## Why

The DqTaak board draws the "Notities" card with a "Notitie toevoegen" button in its header and the notes under it.
Live, CnNotesCard always shows its add form above the notes, so the card opens on an empty text field.

## What changes

CnNotesCard takes `composer: 'button'`: the add form sits behind an "Add note" button in the card's header, opens on
click or on a reply, and closes once the note is saved. The `notes` integration widget forwards the prop, so a manifest
sets it with `props.composer`. The default `inline` keeps today's card.
