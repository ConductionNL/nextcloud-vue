# manifest-runtime-override

## ADDED Requirements

### Requirement: Menu entries may carry deep-link query params

A manifest menu entry (top-level `menuItem` or nested `menuItemLeaf`) MAY declare an optional `query` object of scalar (string/number/boolean) values. The manifest schema SHALL accept it (not reject it under `additionalProperties:false`). `CnAppNav` SHALL fold a present `query` into the vue-router target it builds for the entry (`{ name: route, query }`), so the entry deep-links to a pre-filtered index page. An entry without `query` SHALL behave exactly as before (`{ name: route }`), and action/href entries SHALL still produce no router target.

#### Scenario: Per-case-type child deep-links to a filtered index

- **GIVEN** a menu child `{ id: 'ct-1', label: 'Objections', route: 'Cases', query: { caseType: 'uuid-1' } }`
- **WHEN** CnAppNav builds its router target
- **THEN** the target is `{ name: 'Cases', query: { caseType: 'uuid-1' } }`
- **AND** a sibling child with no `query` yields `{ name: 'Cases' }`

#### Scenario: Schema accepts query on menu items

- **GIVEN** a manifest whose menu group has a child carrying `query`
- **WHEN** the manifest is validated by the v2 validator
- **THEN** validation passes (the delta is not discarded for an unknown property)

### Requirement: The default nav reflects an async manifest override

`CnAppRoot` SHALL pass the (editor-aware) manifest to its default `<CnAppNav>` as a reactive **prop**, not rely solely on the non-reactive provide/inject `cnManifest`. When the manifest changes after mount — e.g. `useAppManifest` resolves a backend `/api/manifest` delta — the default nav SHALL re-render to reflect it without a page reload.

#### Scenario: Backend-merged children appear without reload

- **GIVEN** CnAppRoot mounted with a bundled manifest whose "Cases" group has 2 children
- **WHEN** the manifest prop is replaced with a merged manifest whose "Cases" group has additional per-case-type children
- **THEN** the default CnAppNav receives the new manifest as its `manifest` prop and renders the added children
