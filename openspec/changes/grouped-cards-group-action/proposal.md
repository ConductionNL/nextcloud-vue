# grouped-cards-group-action

## Why

Board dossiq/DqZaaktype's phase board adds a task to a phase ("Taak toevoegen"). The grouped-cards widget drew groups
and cards only, and `open-form` with an endpoint could edit a record but not create one.

## What changes

- `groupAction` on a grouped-cards widget: one action drawn at the foot of every group through CnActionButtons, with
  `@group.<path>` in its strings read from that group (URL-encoded). A group missing a value a token names gets no
  action.
- `open-form` with `endpoint.method: "POST"` creates a record: an empty form whose declared fields are posted to the
  endpoint. Manifest schema 2.136.0.
