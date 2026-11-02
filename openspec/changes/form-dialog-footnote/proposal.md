# Proposal: form-dialog-footnote

## Why

pl8 on board PqTicketBewerken (1 Nov): the board closes the ticket edit form on a note under its fields ("De status
wijzig je hier niet: die verandert via de stappen van het ticket ..."). CnFormDialog has no place for such a note, and
a detail page cannot give its record edit form one, so the note card was missing on live.

## What changes

- CnFormDialog `footnote`: a note under the fields, with an information icon, on the muted ground.
- CnDetailPage `editFootnote` (manifest `config.editFootnote`): the record edit form's note, through the host translate.

## Reach

Opt-in: nothing changes until a page sets `editFootnote` or a host sets `footnote`.
