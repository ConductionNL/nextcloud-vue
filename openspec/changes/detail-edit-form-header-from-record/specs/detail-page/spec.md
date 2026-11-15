# detail-page Delta: detail-edit-form-header-from-record

## ADDED Requirements

### Requirement: The edit form's header can name the record

CnDetailPage SHALL hand its record edit form the configured `editEyebrow`, translated by the host, as the dialog's
eyebrow, and none when it is not configured. The configured edit title, subtitle and eyebrow SHALL have their
`{field}` tokens filled from the record as the header line fills them, an enum value reading its translated label.
Text without tokens SHALL be shown as configured.

#### Scenario: Board PqTicketBewerken

- **GIVEN** a ticket page with `editEyebrow: "Edit · {reference}"` and `editSubtitle: "{reference} · {ticketType}"`
- **WHEN** the agent opens Bewerken on ticket PQ-2026-0417, a request
- **THEN** the form reads "Bewerken · PQ-2026-0417" over its title and "PQ-2026-0417 · Verzoek" under it
