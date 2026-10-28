# record-list

## ADDED Requirements

### Requirement: A record-list row can open a page outside the app

A record list SHALL link a row that has no route to the URL in the row field `rowHrefField` names, drawn as a linked row with its chevron. It SHALL take only a path on this server or an http(s) URL, and SHALL leave a row with any other value, or none, unlinked.

#### Scenario: A client's cases in pipelinq

- **GIVEN** a record list over pipelinq's client cases with `rowHrefField: "url"`
- **WHEN** a case row carries `/index.php/apps/dossiq/cases/c1`
- **THEN** the row is a link to that page with a chevron

#### Scenario: An unsafe URL

- **WHEN** a row carries `javascript:alert(1)` or `//elsewhere.example/…`
- **THEN** the row is not a link
