# personal-lens-availability Specification

## Purpose

A personal lens (Recent, and later Following) that cannot answer says why,
instead of showing an empty list that reads as "nothing here". OpenRegister
decides whether a lens can answer and reports it per lens in the list
response; this capability is the library reading that report and showing it.

## ADDED Requirements

### Requirement: A list response carries the report of the lenses it was asked for

The object store SHALL keep, per type, the `@self.lenses` object of the latest
successful collection response in `lenses[type]`, written together with the
rows, and SHALL write `{}` when the response has no `@self.lenses`.
`useListView` SHALL expose it as `lenses`. A report SHALL be read as
`{ available: boolean, reason: string|null }` keyed by the lens name without
its leading underscore (`recent` for `_recent`).

#### Scenario: The recent lens reports that it cannot answer

- **GIVEN** a list response whose body carries `@self.lenses.recent = { available: false, reason: "audit-trail-disabled" }`
- **WHEN** the store fetches the collection
- **THEN** `lenses[type].recent` SHALL equal that report
- @e2e exclude {needs an OpenRegister instance with the audit trail switched off, which would disturb every other e2e run on the shared instance; covered by tests/store/useObjectStoreLenses.spec.js}

#### Scenario: A response without a report clears the previous one

- **GIVEN** the store holds a `recent` report for a type
- **WHEN** a response without `@self.lenses` arrives for that type
- **THEN** `lenses[type]` SHALL be `{}`
- @e2e exclude {store state, no screen of its own; covered by tests/store/useObjectStoreLenses.spec.js}

### Requirement: An unavailable lens explains its empty page

When the latest list response reports a lens with `available: false` and a
reason the library or the app has text for, `CnIndexPage` SHALL show that
text as its empty-state title and `CnDataTable` (and so `CnWidgetObjectTable`)
SHALL show it in its empty row, in place of the generic empty text. The
built-in texts SHALL be, for the `recent` lens: `audit-trail-disabled` "This
server does not keep track of what you open.", `anonymous` "Log in to see
what you opened recently.", `read-history-unavailable` "Your recent items are
not available right now.", with Dutch translations. An app MAY replace them
with `lensReasonTexts`, keyed `<lens>.<reason>` or `<reason>`, the specific
key winning. Without a report, with `available: true`, or with a reason no
text exists for, the components SHALL show their empty text as before. A
host's `#empty` slot SHALL still win.

#### Scenario: Recently opened on an instance that does not log reads

- **GIVEN** a dashboard `object-table` widget with `source.filter._recent: true`
- **AND** the response is an empty page with `@self.lenses.recent = { available: false, reason: "audit-trail-disabled" }`
- **WHEN** the widget renders
- **THEN** the empty row SHALL read "This server does not keep track of what you open."
- @e2e exclude {needs an OpenRegister with openregister#4514 and the audit trail off on the shared instance; covered by tests/components/CnDataTableLensReason.spec.js}

#### Scenario: The Recent quick filter for an anonymous caller

- **GIVEN** an index page with the Recent lens active
- **AND** the response reports `reason: "anonymous"`
- **WHEN** the page renders its empty state
- **THEN** the title SHALL read "Log in to see what you opened recently."
- @e2e exclude {an anonymous object list is refused before the lens runs on a real instance; covered by tests/components/CnIndexPageLensReason.spec.js}

#### Scenario: The read history could not be read

- **GIVEN** a response reporting `reason: "read-history-unavailable"`
- **WHEN** the index page renders its empty state
- **THEN** the title SHALL read "Your recent items are not available right now."
- @e2e exclude {the failure cannot be provoked on the shared instance; covered by tests/components/CnIndexPageLensReason.spec.js}

#### Scenario: An app says it in its own words

- **GIVEN** `lensReasonTexts` `{ "recent.audit-trail-disabled": "Deze server houdt niet bij welke zaken je opent." }`
- **WHEN** the response reports `recent` unavailable for `audit-trail-disabled`
- **THEN** the empty state SHALL show the app's text
- @e2e exclude {app copy is a prop mapping with no backend dependency; covered by tests/utils/lensAvailability.spec.js}

#### Scenario: No report keeps today's behaviour

- **GIVEN** a response without `@self.lenses`, or with `available: true`, or with an unknown reason
- **WHEN** the page is empty
- **THEN** the empty state SHALL show the page's `emptyText`
- @e2e exclude {unchanged behaviour already exercised by the index-page e2e runs; covered by tests/components/CnIndexPageLensReason.spec.js and tests/utils/lensAvailability.spec.js}
