cn-detail-translation-aware-surfacing
---
status: draft
---
# CnDetail Translation-Aware Surfacing

## Purpose

Provide a frontend surface for OpenRegister's `_translationMeta`
block (shipped by `i18n-source-of-truth`). Adds a stateless
`CnTranslatedBadge` component plus auto-wiring into `CnDetailGrid`
and `CnDetailPage` so any detail surface across consumer apps
visibly tells the user "this projection is a translation of a
{sourceLanguage} source." Closes the read-side surfacing gap
catalogued by the larpingapp and procest OR-abstractions audits
(§3.5 / §3.6 in both proposals).

## ADDED Requirements

### Requirement: The library MUST export `CnTranslatedBadge`

The library MUST export a `CnTranslatedBadge` Vue 2 SFC from
`src/components/CnTranslatedBadge/CnTranslatedBadge.vue` and
re-export it from both `src/components/index.js` and
`src/index.js`. The component is stateless and accepts a single
required prop, `object: Object|null`, plus an optional
`localeNameFormatter: Function|null` prop. The component MUST NOT
render any DOM when `object` is null, when
`object._translationMeta` is missing, or when
`object._translationMeta.translatedFrom` is null, undefined, or an
empty string.

#### Scenario: badge is absent when object is null
- GIVEN a parent renders `<CnTranslatedBadge :object="null" />`
- WHEN the component mounts
- THEN the rendered DOM MUST NOT contain `cn-translated-badge`

#### Scenario: badge is absent when `_translationMeta` is missing
- GIVEN an object `{ id: 'x', title: 'Y' }` without `_translationMeta`
- WHEN `<CnTranslatedBadge :object="object" />` mounts
- THEN the rendered DOM MUST NOT contain `cn-translated-badge`

#### Scenario: badge is absent when translatedFrom is null
- GIVEN an object with
  `_translationMeta: { translatedFrom: null, translatedAt: null }`
- WHEN `<CnTranslatedBadge :object="object" />` mounts
- THEN the rendered DOM MUST NOT contain `cn-translated-badge`

#### Scenario: badge renders when translatedFrom is set
- GIVEN an object with
  `_translationMeta: { translatedFrom: 'nl', translatedAt: '2026-06-01T10:00:00Z' }`
- WHEN `<CnTranslatedBadge :object="object" />` mounts
- THEN the rendered DOM MUST contain a `.cn-translated-badge` element
- AND the badge MUST contain the text token for the source language
  ('nl' or its formatted display name)

#### Scenario: `localeNameFormatter` is honoured
- GIVEN `localeNameFormatter = (bcp47) => bcp47 === 'nl' ? 'Dutch' : bcp47`
- AND an object with `_translationMeta.translatedFrom: 'nl'`
- WHEN `<CnTranslatedBadge :object="object" :locale-name-formatter="fn" />` mounts
- THEN the rendered DOM MUST contain the string `Dutch`

#### Scenario: `translatedAt` is exposed via `title` attribute
- GIVEN an object with
  `_translationMeta: { translatedFrom: 'nl', translatedAt: '2026-06-01T10:00:00Z' }`
- WHEN `<CnTranslatedBadge :object="object" />` mounts
- THEN the badge's `title` attribute MUST contain a representation
  of `2026-06-01T10:00:00Z` (raw ISO string or locale-formatted)

### Requirement: `CnDetailGrid` MUST accept an `object` prop and surface the badge

`CnDetailGrid` MUST accept an optional `object: Object|null` prop.
When the prop is non-null AND no consumer `#header` slot is
provided, the grid MUST render `<CnTranslatedBadge :object="object" />`
in a header block above the items. The badge's own
`v-if="visible"` auto-hides when `_translationMeta.translatedFrom`
is null or absent, so consumers passing a source-of-truth object
see no visual change.

#### Scenario: badge renders above grid when object is translated
- GIVEN `<CnDetailGrid :object="obj" :items="[]" />` where `obj`
  has `_translationMeta: { translatedFrom: 'nl' }`
- WHEN the grid mounts
- THEN the rendered DOM MUST contain a `.cn-translated-badge`
  element before the items

#### Scenario: no badge when object is the source
- GIVEN `<CnDetailGrid :object="obj" :items="[]" />` where `obj`
  has `_translationMeta: { translatedFrom: null }`
- WHEN the grid mounts
- THEN the rendered DOM MUST NOT contain a `.cn-translated-badge`
  element

#### Scenario: no badge when object prop is omitted
- GIVEN `<CnDetailGrid :items="[]" />` (no `:object` prop)
- WHEN the grid mounts
- THEN the rendered DOM MUST NOT contain a
  `.cn-detail-grid__translation-header` block

### Requirement: `CnDetailPage` MUST surface the badge for resolved objects

`CnDetailPage` MUST compute a `resolvedObject` from the existing
`objectType` + `objectId` props by reading the bound store's
`getObject(objectType, objectId)` getter when both props are
non-empty strings. The header text block (between title and
description) MUST render `<CnTranslatedBadge :object="resolvedObject" />`
by default, wrapped in a `#translation-badge` scoped slot so
consumers can override.

#### Scenario: page renders badge when resolved object is translated
- GIVEN a `CnDetailPage` with `:object-type="'case'"` and
  `:object-id="'obj-1'"`
- AND the bound store's `getObject('case', 'obj-1')` returns an
  object whose `_translationMeta.translatedFrom === 'nl'`
- WHEN the page mounts
- THEN the rendered DOM MUST contain a `.cn-translated-badge`
  element inside `.cn-detail-page__header-text`

#### Scenario: page renders no badge when resolved object is source
- GIVEN a `CnDetailPage` with `:object-type="'case'"` and
  `:object-id="'obj-1'"`
- AND the bound store's `getObject('case', 'obj-1')` returns an
  object whose `_translationMeta.translatedFrom === null`
- WHEN the page mounts
- THEN the rendered DOM MUST NOT contain a `.cn-translated-badge`
  element in the header

#### Scenario: consumer slot override wins
- GIVEN a parent component supplies a `#translation-badge` scoped
  slot rendering `<MyCustomBadge>{{ object.id }}</MyCustomBadge>`
- AND `resolvedObject._translationMeta.translatedFrom === 'nl'`
- WHEN the page mounts
- THEN the rendered DOM MUST contain `MyCustomBadge` (or its
  output) inside the header
- AND the rendered DOM MUST NOT contain the default
  `.cn-translated-badge` element

#### Scenario: page renders no badge when objectType is unset
- GIVEN a `CnDetailPage` without `objectType` / `objectId` props
- WHEN the page mounts
- THEN `resolvedObject` MUST be null
- AND the rendered DOM MUST NOT contain a `.cn-translated-badge`
  element in the header
