# zuiddrecht-pixel-gaps-2 Delta: zuiddrecht-pixel-gaps-2

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [zuiddrecht-pixel-gaps-2](../../)

## Purpose

Close the second round of gaps between the Zuiddrecht boards and what the
shared library draws, without changing any app that does not opt in.

## ADDED Requirements

### Requirement: The navigation primary action is never clipped

CnAppNav SHALL show its primary action at full height. NcAppNavigation renders
it in a scrolling body that is a flex item with a minimum height of 0, beside a
list of `height: 100%`; when a card and footer entries make the column overflow
the body SHALL NOT shrink below its content.

#### Scenario: A full navigation keeps the whole button

- **GIVEN** a navigation with a brand, a solid primary action, a long menu, a card, a help entry and footer entries in a 760px column
- **WHEN** it renders in a browser
- **THEN** the visible height of the primary action equals its own height

### Requirement: A declared breadcrumb label shows as text

CnBreadcrumbs SHALL take a `rootText` prop (default false). With it, the root
crumb SHALL print its label instead of NcBreadcrumbs' home icon. CnDetailPage
SHALL set it for `config.breadcrumb` unless the breadcrumb declares an `icon`,
which draws that icon with the label as its accessible name.

#### Scenario: The list crumb reads "All cases"

- **GIVEN** `config.breadcrumb: { label: "All cases", route: "Cases" }`
- **WHEN** the detail page renders
- **THEN** the first crumb shows the text "All cases"

#### Scenario: Without rootText the root crumb is a home icon

- **GIVEN** CnBreadcrumbs without `rootText`
- **WHEN** it renders
- **THEN** the root crumb keeps NcBreadcrumbs' home icon

### Requirement: The stages bar labels share one line

In the bars variant every stage label SHALL sit the same distance under its
bar, whether it is a clickable `<button>` or the current step's `<span>`.
Nextcloud core's minimum height for a non-library button SHALL NOT apply to a
label.

#### Scenario: A reachable stage and the current stage align

- **GIVEN** the bars variant with the current stage a span and two reachable stages buttons, under Nextcloud core's button rule
- **WHEN** it renders in a browser
- **THEN** the three label texts start within 1px of each other

### Requirement: A greeting can sit on the page ground

CnHeaderWidget SHALL take `content.ground: true`: the plain look with no card
padding, a 6px gap between the date line and the heading, and a 32px heading.
CnDashboardPage SHALL draw a `header` widget that declares it without a card.
Without the key the greeting SHALL render as before.

#### Scenario: The greeting has no card

- **GIVEN** a dashboard `header` widget with `content: { greeting: true, ground: true }`
- **WHEN** the dashboard renders
- **THEN** the widget's wrapper is borderless and the content has no padding

### Requirement: A dashboard can drop the widget actions menu

CnDashboardPage SHALL take `showWidgetActions` (manifest
`config.showWidgetActions`, default true). When false, a widget that does not
set `showActions` itself SHALL render without its overflow Actions menu. A
widget that sets `showActions: true` SHALL keep it.

#### Scenario: A widget with a header link and no menu

- **GIVEN** `config.showWidgetActions: false` and a widget with a `headerLink`
- **WHEN** the dashboard renders
- **THEN** the widget shows its header link and no Actions menu

### Requirement: A stat tile can take the stacked board look

CnStatWidget SHALL take `content.layout: "stacked"`: no icon circle, a 14px
muted label at weight 400, the value at 34px/700 in the text colour, and the
caption on a line of its own under the value. A linked stacked tile SHALL NOT
be underlined. Without the key the tile SHALL render the horizontal card.

#### Scenario: The board's "My open cases" tile

- **GIVEN** a stat tile with `layout: "stacked"`, an icon and a caption
- **WHEN** it renders
- **THEN** no icon circle renders and the caption sits under the value row

### Requirement: A detail header can be a card that holds a widget

CnDetailPage SHALL take `headerCard` (manifest `config.headerCard`, default
false), drawing the header as a bordered card on the surface colour, and
`headerWidget` (manifest `config.headerWidget`), the id of a widget in
`widgets` to render inside the header on its own row, without a card of its
own. That widget SHALL leave the body grid and its row SHALL close up. An id
that names no widget SHALL render nothing extra.

#### Scenario: The stages bars in the case card

- **GIVEN** `config.headerCard: true` and `config.headerWidget: "case-stages"`
- **WHEN** the case renders
- **THEN** the stages widget renders bare inside the header card and not in the grid

### Requirement: The navigation footer can be declared

CnAppNav SHALL read `nav.footer`, an ordered list of `section: "footer"` entry
ids plus the reserved ids `help` and `settings`. Only the named footer entries
SHALL render in the footer, in that order; footer entries left out SHALL move
into the settings foldout. `settings` first SHALL put the foldout above the
footer list. Without the key the footer SHALL render as before.

#### Scenario: Instellingen and Hulp en uitleg only

- **GIVEN** `nav.footer: ["settings", "help"]` and footer entries Store, Reports and Features & roadmap
- **WHEN** the navigation renders
- **THEN** the footer shows the settings foldout above the help entry, and Store, Reports and Features & roadmap are in the foldout

### Requirement: A schema title falls back to its written form

`resolveObjectOpType` SHALL keep kebab-casing a schema title, and for a type it
registers from a value the kebab rule changed it SHALL set the value as written
as the type's schema fallback. The object store SHALL retry a request once with
the fallback when the kebab form answers 404, and keep the fallback after a
success. A type without a fallback SHALL make exactly one request, as before.

#### Scenario: LearniqSettings is registered as written

- **GIVEN** schema `LearniqSettings` whose register slug is `LearniqSettings`
- **WHEN** a widget lists it
- **THEN** the store asks for `learniq-settings`, gets 404, asks for `LearniqSettings` and uses that from then on
