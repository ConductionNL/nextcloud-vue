## ADDED Requirements

### Requirement: A dashboard's description can come from an endpoint

With `descriptionSource: { url, path? }`, the dashboard MUST show the endpoint's text in place of `description`, after the greeting or date when the page has one. When the read fails, it MUST keep `description`.

#### Scenario: My work names what is with the reader
- GIVEN My work with `greeting: "date"` and a `descriptionSource` answering "9 items liggen bij jou"
- WHEN the page opens
- THEN the subtitle reads "Dinsdag 7 oktober 2026 · 9 items liggen bij jou"
