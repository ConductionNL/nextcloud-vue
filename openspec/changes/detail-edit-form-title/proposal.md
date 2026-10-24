# Proposal: detail-edit-form-title

## Why

Board DqZaakDialogen titles the case edit form "Zaak bewerken", while the header button that opens it reads "Bewerken".
CnDetailPage titled its edit form with the button's label (`editLabel`), so one could not differ from the other.

## What changes

CnDetailPage takes `editTitle` (page config): the record edit form's title, run through the host translate. Empty (the
default) keeps the Edit button's label, so no page changes until it opts in.
