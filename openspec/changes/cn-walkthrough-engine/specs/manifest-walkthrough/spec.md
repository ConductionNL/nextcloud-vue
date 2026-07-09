# manifest-walkthrough Specification

**Status:** proposed
**Scope:** nextcloud-vue + hydra (canonical schema)
**Tier:** V1
**Depends on:** the v2 app-manifest schema; hydra ADR-043; ADR-036 (ApplicationVersion).

## Purpose

Define the abstract `walkthrough` block on the v2 app manifest — the declarative
data a single shared engine renders as a versioned, spotlighted product tour — so
every Conduction app (and every OpenBuild virtual app) declares its onboarding
journey as manifest data rather than bespoke code.

## ADDED Requirements

### Requirement: REQ-WALK-MAN-001 — Manifest Declares A `walkthrough` Block

The v2 app-manifest schema SHALL define an optional top-level `walkthrough` object
`{ enabled: boolean, version: integer, completionConfigKey: string, tours: array }`
with `additionalProperties:false`. Each tour SHALL be
`{ id, title, trigger, minAppVersion?, steps[] }` with a unique `id` and a closed
`trigger` enum (`first-visit` | `version-bump` | `empty-index` | `manual`). The
identical definition SHALL exist in both
`nextcloud-vue/src/schemas/app-manifest-v2.schema.json` and the canonical
`hydra/scripts/schemas/app-manifest-v2.schema.json`.

#### Scenario: A well-formed walkthrough manifest validates

- **GIVEN** a manifest with a `walkthrough` block whose tours and steps use only allowed fields
- **WHEN** it is validated against the v2 schema (`validateManifest` / the manifest gate)
- **THEN** validation SHALL pass

#### Scenario: An unknown trigger or extra property fails

- **GIVEN** a tour with a `trigger` outside the enum or an undeclared property
- **WHEN** it is validated
- **THEN** validation SHALL fail with an enum / `additionalProperties` error

### Requirement: REQ-WALK-MAN-002 — Step Targeting Is Declarative And Stable

Each step SHALL declare a `target` `{ kind, ... }` with a closed `kind` enum
(`nav-item` | `widget` | `action` | `page` | `element` | `selector`). `nav-item` /
`page` SHALL reference a route name via `ref`; `widget` a `widgetKey` via `ref`;
`action` an action id via `ref`; `element` a `data-walkthrough-id` (resolver MAY
fall back to `data-testid`) via `ref`; `selector` a raw CSS string. A step MAY
declare `placement` (closed enum `auto` | `top` | `bottom` | `left` | `right` |
`center`).

#### Scenario: A target resolves from a stable manifest id

- **GIVEN** a step `target: { kind: "nav-item", ref: "products-index" }`
- **WHEN** the engine resolves it
- **THEN** it SHALL locate the menu element for the `products-index` route without a brittle CSS selector

#### Scenario: A center-placed step needs no target element

- **GIVEN** an `info`-style step with `placement: "center"`
- **WHEN** rendered
- **THEN** the coachmark SHALL render centered with no anchor and the dimmer SHALL have no cutout

### Requirement: REQ-WALK-MAN-003 — Steps Declare Advancement And ID Capture

Each step SHALL declare `advanceOn` `{ type, ... }` with a closed `type` enum
(`manual` | `click-target` | `route-match` | `element-appears` | `object-created` |
`delay`). `route-match` SHALL accept a `route` name and an optional `capture` map of
`{ <contextVar>: ":<param>" }` that binds a matched route param into the tour
context. `object-created` SHALL accept `register` + `schema`. A step MAY carry
`task` (an instruction string), `optional` (skip when target/condition absent), and
`allowManualNext` (escape hatch). Captured values SHALL be interpolatable into
later steps via `{{var}}` tokens in `body`, `task`, `target.ref`, `target.selector`,
and `advanceOn.route`.

#### Scenario: A route-match step captures the created id

- **GIVEN** a step that navigates to a detail route `products-detail` with
  `advanceOn: { type: "route-match", route: "products-detail", capture: { productId: ":id" } }`
- **WHEN** the user lands on `/products/42`
- **THEN** the engine SHALL advance and store `productId = "42"` in the tour context

#### Scenario: A later step interpolates a captured id

- **GIVEN** `productId` is in the context and a later step body is `"Open {{productId}}"`
- **WHEN** that step renders
- **THEN** the body SHALL read `"Open 42"`

### Requirement: REQ-WALK-MAN-004 — Steps Are Versioned

Each step SHALL carry a `sinceVersion` (semver string). The engine SHALL compose,
per user, the set of steps appropriate to the gap between the user's recorded
`completionConfigKey` version and the running `manifest.version`: a new install
SHALL receive all steps `<= manifest.version`; an upgraded user SHALL receive only
steps whose `sinceVersion` is greater than their last-seen version and
`<= manifest.version` (the "what's new" tour).

#### Scenario: A fresh install gets the full tour

- **GIVEN** a user with no recorded walkthrough version and a manifest at version `1.2.0`
- **WHEN** the tour is composed
- **THEN** it SHALL include every step with `sinceVersion <= 1.2.0`

#### Scenario: An upgrade gets only the new steps

- **GIVEN** a user whose last-seen version is `1.1.0` and a manifest at `1.2.0`
- **WHEN** a `version-bump` tour is composed
- **THEN** it SHALL include only steps with `1.1.0 < sinceVersion <= 1.2.0`, and SHALL NOT auto-start if that set is empty
