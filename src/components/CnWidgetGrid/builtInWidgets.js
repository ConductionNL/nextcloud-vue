/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * builtInWidgets — internal registry of the library's built-in v2 widget components.
 *
 * Keys are the `widgetKey` values used in v2 manifests.
 * Values are the Vue component definitions.
 *
 * CnWidgetGrid resolves widget keys first against this registry, then against
 * the consumer-supplied `cnRegistry` inject. A consumer can override a built-in
 * by registering a custom component with the same key in `cnRegistry`.
 *
 * Spec: REQ-MVR-005 (manifest-v2-renderer) — widget key resolution
 */

import CnWidgetObjectTable from '../CnWidgetObjectTable/CnWidgetObjectTable.vue'
import CnWidgetFormRenderer from '../CnWidgetFormRenderer/CnWidgetFormRenderer.vue'
import CnWidgetMapViewer from '../CnWidgetMapViewer/CnWidgetMapViewer.vue'
import CnObjectGeoWidget from '../CnObjectGeoWidget/CnObjectGeoWidget.vue'
import CnWidgetCardGrid from '../CnWidgetCardGrid/CnWidgetCardGrid.vue'
import CnNavCardGrid from '../CnNavCardGrid/CnNavCardGrid.vue'
import CnObjectDataWidget from '../CnObjectDataWidget/CnObjectDataWidget.vue'
import CnObjectMetadataWidget from '../CnObjectMetadataWidget/CnObjectMetadataWidget.vue'
import CnRelatedObjectsWidget from '../CnRelatedObjectsWidget/CnRelatedObjectsWidget.vue'
import CnIntegrationWidget from '../CnIntegrationWidget/CnIntegrationWidget.vue'
import CnBannerWidget from '../CnBannerWidget/CnBannerWidget.vue'
import CnAuditTrailWidget from '../CnAuditTrailWidget/CnAuditTrailWidget.vue'
import CnHeaderWidget from '../CnHeaderWidget/CnHeaderWidget.vue'
import CnTextWidget from '../CnTextWidget/CnTextWidget.vue'
import CnDividerWidget from '../CnDividerWidget/CnDividerWidget.vue'

/**
 * Built-in widget registry.
 *
 * The `data` and `metadata` keys are the canonical object-detail widgets:
 * a manifest `type:"detail"` page that places `widgetKey:"data"` /
 * `widgetKey:"metadata"` gets the object's editable property grid /
 * read-only `@self` metadata respectively. Both need the loaded object —
 * `CnPageRenderer` loads it for the detail page and `CnWidgetGrid` merges
 * `{ objectData, schema, objectType, objectId, register, store }` into each
 * widget's props (see CnWidgetGrid.resolvedWidgets), so the manifest entry
 * needs no per-widget `props`.
 *
 * The `integration` key places an OpenRegister integration leaf
 * (`CnIntegrationWidget`) on the page — e.g. Integriq's `sync-contract`
 * ("Synced from"). Pick the leaf with `props.only: "<integrationId>"`; the
 * object's `register` / `objectId` arrive via the detail-context merge, and
 * the manifest should set `props.schema` to the schema slug (the merged
 * context `schema` is the schema *object*, so an explicit slug prop wins).
 *
 * The `banner` key places a declarative notice banner (CnBannerWidget):
 * `props { variant, text, visibleWhen?, route? }` — see the component for
 * the visibleWhen predicate shape.
 *
 * The `audit-trail` key places the object change-log card
 * (CnAuditTrailWidget) — a detail-page widget whose register / schema /
 * objectId arrive via the detail-context merge (or explicit `props`).
 *
 * The `header` / `text` / `divider` keys reuse the dashboard catalog's
 * content-only presentation widgets on v2 pages: each takes a single
 * `props.content` object with the same shape their dashboard `content`
 * blob uses (see the components' docblocks).
 *
 * The `nav-card-grid` key (ADR-044 §4 cards-collapse) places CnNavCardGrid:
 * a grid of arbitrary navigation-link cards from `props.entries` (the
 * navCardEntry shape). Unlike `card-grid` (CnWidgetCardGrid, which renders
 * OpenRegister objects as CnObjectCard), `nav-card-grid` renders links, not
 * data — the intended remedy for a deep menu group collapsed into one
 * top-level entry via `menu-layout.json` relocations.
 *
 * @type {Record<string, import('vue').Component>}
 */
export const BUILT_IN_WIDGETS = {
	'object-table': CnWidgetObjectTable,
	'form-renderer': CnWidgetFormRenderer,
	'map-viewer': CnWidgetMapViewer,
	'object-geo': CnObjectGeoWidget,
	'card-grid': CnWidgetCardGrid,
	'nav-card-grid': CnNavCardGrid,
	data: CnObjectDataWidget,
	metadata: CnObjectMetadataWidget,
	related: CnRelatedObjectsWidget,
	integration: CnIntegrationWidget,
	banner: CnBannerWidget,
	'audit-trail': CnAuditTrailWidget,
	header: CnHeaderWidget,
	text: CnTextWidget,
	divider: CnDividerWidget,
}
