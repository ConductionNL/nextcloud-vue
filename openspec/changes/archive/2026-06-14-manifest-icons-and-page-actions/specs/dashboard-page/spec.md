# Spec delta — dashboard-page (CnStatsBlockWidget icon class forwarding)

## ADDED Requirements

### Requirement: CnStatsBlockWidget icon class forwarding

CnStatsBlockWidget SHALL accept an optional `iconClass: String` prop that, when set, is applied as a CSS class on the widget's outermost wrapping element. CnDashboardPage's stats-block dispatcher SHALL forward `widgetDef.props.iconClass` through to the widget via the `getStatsBlockProps` allowlist.

The intent is to let manifest authors put a Nextcloud core icon class (e.g. `icon-link`, `icon-mail`) on a KPI tile without requiring a heavyweight MDI dynamic-import path. The CSS class is rendered on a single wrapping `<div>` that has no layout styles of its own — the rendered CnStatsBlock primitive remains visually identical when `iconClass` is unset.

#### Scenario: iconClass renders as a CSS class on the wrapper

- GIVEN `<CnStatsBlockWidget :data-source="ds" iconClass="icon-link" />`
- WHEN the component renders
- THEN the outermost element is a `<div>` whose `class` attribute contains BOTH `cn-stats-block-widget` AND `icon-link`
- AND the inner `<CnStatsBlock>` renders with the same props as it would without `iconClass`

#### Scenario: iconClass defaults to empty string

- GIVEN a CnStatsBlockWidget mounted WITHOUT `iconClass`
- WHEN it renders
- THEN the outermost `<div>` carries only the `cn-stats-block-widget` class
- AND no other DOM change is visible compared to the legacy (pre-change) rendering

#### Scenario: Manifest props.iconClass reaches the widget

- GIVEN a dashboard widget definition `{ id: 'tile-1', type: 'stats-block', title: 'Sources', props: { iconClass: 'icon-link', countLabel: 'sources' }, dataSource: { register: 'oc', schema: 'sources', aggregate: 'count' } }`
- WHEN CnDashboardPage mounts the corresponding layout item
- THEN `getStatsBlockProps(item)` returns an object containing `iconClass: 'icon-link'`
- AND CnStatsBlockWidget receives `iconClass="icon-link"`
- AND the rendered KPI tile carries the `icon-link` CSS class on its wrapping `<div>`

#### Scenario: Existing widgetDef without iconClass is unchanged

- GIVEN a widgetDef with `type: 'stats-block'` and no `props.iconClass` key
- WHEN CnDashboardPage mounts it
- THEN `getStatsBlockProps(item)` returns an object that does NOT contain an `iconClass` key (the allowlist only forwards declared keys)
- AND CnStatsBlockWidget renders with its default `iconClass=''`
- AND the rendered tile is identical to the pre-change rendering apart from the wrapping `<div>` carrying `cn-stats-block-widget`
