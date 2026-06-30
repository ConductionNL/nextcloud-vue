# Dashboard Page — Date-range pills + card-fit tiles

**Spec refs**: `dashboard-page`
**Standards**: ADR-004 (NL Design / accessibility), ADR-022 (apps consume library abstractions)

## ADDED Requirements

### Requirement: date-range pills control

CnDashboardPage SHALL support a `dateRange.control` option with values `'picker'` (default) and `'pills'`. When `control` is `'pills'` and the date-range header is shown, CnDashboardPage SHALL render a compact segmented toggle-button row (one pill per preset, excluding the manual `custom` preset) instead of the `CnDateRangePicker`, and SHALL render the pill row as an accessible toggle group (`role="group"` with an accessible label, and `aria-pressed` reflecting the active preset on each pill). Clicking a pill SHALL resolve the preset to a `{ from, to, preset }` window and forward it to the same range-change handler the picker uses, so the active pill drives the identical shared `currentRange` / `cnDashboardDateRange` state. When `control` is omitted or any value other than `'pills'`, CnDashboardPage SHALL render the existing `CnDateRangePicker`. When a `custom` preset exists in the preset list, the pills row SHALL additionally expose a de-emphasised "Custom range" popover pill carrying from/to inputs.

#### Scenario: pills mode renders the pill row instead of the picker

- GIVEN `dateRange: { enabled: true, control: 'pills', presets: [week, month, quarter, custom], default: { preset: 'month' } }`
- WHEN the dashboard renders the date-range header
- THEN a pill toggle group is rendered with one pill per non-`custom` preset
- AND the `CnDateRangePicker` (select + two date inputs) is NOT rendered

#### Scenario: control omitted keeps the default picker

- GIVEN `dateRange: { enabled: true, presets: [...] }` with no `control`
- WHEN the dashboard renders the date-range header
- THEN the `CnDateRangePicker` is rendered and no pill toggle group appears

#### Scenario: the active preset pill is marked aria-pressed

- GIVEN pills mode with the current range preset `month`
- WHEN the pill row renders
- THEN the `month` pill has `aria-pressed="true"` and every other pill has `aria-pressed="false"`

#### Scenario: clicking a pill changes the shared range

- GIVEN pills mode with the current preset `month`
- WHEN the user clicks the `quarter` pill
- THEN the shared range resolves to the `quarter` window, a `date-range-change` event is emitted with `preset: 'quarter'`, and the `quarter` pill becomes `aria-pressed="true"`

#### Scenario: custom-range popover pill present when a custom preset exists

- GIVEN pills mode whose preset list includes a `custom` entry
- WHEN the pill row renders
- THEN a de-emphasised "Custom range" popover pill is rendered (carrying from/to inputs) in addition to the per-preset pills

### Requirement: card-fit registry widgets

A dashboard-widget-registry entry MAY declare `card: true` to mark its renderer as a self-contained card surface (a single KPI / gauge / delta tile). When CnDashboardPage renders a registry widget whose entry is flagged `card: true`, it SHALL render the widget `flush` (no `CnWidgetWrapper` content padding) and apply a `cn-dashboard-page__card-fit` class that switches the wrapper content area to a centred, non-scrolling layout (`overflow: hidden`, vertically centred, comfortable padding) so the card sizes to its tile without an inner scrollbar. A registry widget whose entry is NOT flagged `card` SHALL be rendered with the default (scrollable, padded) wrapper content area, unchanged. The `stat`, `gauge`, and `delta` built-in registry widgets SHALL be flagged `card: true`.

#### Scenario: a card widget is rendered flush and centred

- GIVEN a layout item whose widget definition `type` resolves to a registry entry with `card: true` (e.g. `stat`, `gauge`, `delta`)
- WHEN the grid renders that item
- THEN the `CnWidgetWrapper` is rendered `flush` with the `cn-dashboard-page__card-fit` class, and its content area does not scroll

#### Scenario: a non-card registry widget keeps the default wrapper

- GIVEN a layout item whose widget definition `type` resolves to a registry entry without the `card` flag
- WHEN the grid renders that item
- THEN the `CnWidgetWrapper` is rendered without the `cn-dashboard-page__card-fit` class and keeps its default scrollable, padded content area
