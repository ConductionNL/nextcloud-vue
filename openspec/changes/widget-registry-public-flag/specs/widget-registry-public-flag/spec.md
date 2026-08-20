# widget-registry-public-flag Delta: widget-registry-public-flag

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-registry-public-flag](../../)

## Purpose

Makes public exposure of a shared widget an explicit, default-closed opt-in,
and adds the markdown widget the CMS needs for prose inside a grid page.
Implements ADR-084 §5 and ADR-086 §4. Related: ADR-036 (universal widget
manifest), ADR-005 (fail-closed).

## ADDED Requirements

### Requirement: Every registry entry MUST carry a public flag defaulting to false

`registerDashboardWidget()` SHALL accept `public: boolean` and SHALL record
`false` when it is not supplied. The flag SHALL be readable through the
existing registry helpers.

#### Scenario: An existing registration is not public

- **GIVEN** any of the widget types registered before this change
- **WHEN** its registry entry is read
- **THEN** `public` is `false`

#### Scenario: Opting in is explicit

- **GIVEN** a widget registered with `public: true`
- **WHEN** its entry is read
- **THEN** `public` is `true`

#### Scenario: A non-boolean value is refused

- **GIVEN** a registration passing `public: "yes"`
- **WHEN** it is registered
- **THEN** registration fails rather than coercing the value

### Requirement: A public host MUST render only public widgets, and MUST degrade

A renderer running under the public host SHALL mount only entries with
`public: true`. An unknown `widgetKey`, or a known one that is not public,
SHALL render an inert placeholder and log a warning. It SHALL NOT throw and
SHALL NOT prevent other widgets on the page from rendering.

#### Scenario: A non-public widget does not execute

- **GIVEN** a public page placing a widget whose entry is not public
- **WHEN** the page renders
- **THEN** a placeholder renders and the widget component's own code does not
  execute

#### Scenario: One bad widget does not take the page down

- **GIVEN** a public page with one unknown `widgetKey` and three valid public
  widgets
- **WHEN** the page renders
- **THEN** the three valid widgets render normally

#### Scenario: The same widget still renders in an authenticated host

- **GIVEN** a non-public widget on an in-Nextcloud page
- **WHEN** that page renders
- **THEN** the widget renders normally — the flag restricts the public host
  only

### Requirement: A gate MUST refuse a non-public widget on a public page

A gate SHALL fail when a portal-rendered page places a `widgetKey` whose
registry entry is not `public: true`, naming the page and the key.

#### Scenario: The gate is shown capable of failing

- **GIVEN** a portal manifest deliberately placing a non-public widget
- **WHEN** the gate runs
- **THEN** it fails, naming the page and the key
- **AND** this negative case is exercised in CI, so a clean gate run is
  evidence rather than an absence of evidence

#### Scenario: A conforming page passes

- **GIVEN** a portal manifest placing only public widgets
- **WHEN** the gate runs
- **THEN** it passes

### Requirement: A markdown widget MUST render prose inside a grid page

A `markdown` widget SHALL render markdown content through the existing
`cnRenderMarkdown` path, with a configuration form, and SHALL be placeable by
the standard `$defs.widgetEntry` shape. It SHALL be registered `public: true`.

#### Scenario: Prose renders in its grid cell

- **GIVEN** a grid page placing a markdown widget alongside two data widgets
- **WHEN** the page renders
- **THEN** the prose renders in its declared cell with the same geometry rules
  as any other widget

#### Scenario: Markdown is sanitised at a public origin

- **GIVEN** markdown content carrying a script tag and a javascript: URL
- **WHEN** it renders under the public host
- **THEN** neither executes
- **AND** the assertion is on the rendered DOM, not on the sanitiser being
  configured

#### Scenario: The widget uses the existing renderer

- **GIVEN** the same markdown rendered by `CnWikiPage` and by the widget
- **WHEN** both outputs are compared
- **THEN** they are equivalent — there is one markdown renderer, not two
