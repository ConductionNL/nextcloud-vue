# Proposal: detail-edit-form-subtitle

## Why

Board DqZaakDialogen draws Zaak bewerken with one line under the title: "De velden van de zaak. Status en termijn
wijzigt u via Volgende stap." A detail page's edit form could be given a title (`editLabel`) but no subtitle, so an app
had no way to say what the form does not change.

## What changes

CnDetailPage takes `editSubtitle` (page config): one line under the record edit form's title, run through the host
translate. Empty (the default) shows none, so no page changes until it opts in. The create form is unchanged.
