# Proposal: party-actions-widget

## Why

The contact person and organisation screens in pipelinq, dossiq and shillinq are (almost) the same (Ruben, 11 Oct).
Boards PqKlant and PqOrganisatie draw one band under the header: what to watch out for ("Geen waarschuwingen bij deze
inwoner. Waarschuwing toevoegen") and the quick actions Bellen, Mail, Route, Bezoek vastleggen and Bericht sturen.
pipelinq composes that from three app components (PartyIndicatorPanel, ContactLinks, LogVisitAction).

## What changes

- New `party-actions` widget (CnPartyActionsWidget) for detail pages: `indicators` (label, tone, icon, local
  `visibleWhen` against the record, `{field}` tokens), `emptyText`, `emptyActions`, and `actions` drawn by
  CnActionButtons, so every button is an action descriptor with its own id, icon, label, `visibleWhen` and type.
- No schema change (catalog widget content is not schema-constrained); the key joins the library widget vocabulary.
