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
import CnWidgetCardGrid from '../CnWidgetCardGrid/CnWidgetCardGrid.vue'

/**
 * Built-in widget registry.
 *
 * @type {Record<string, import('vue').Component>}
 */
export const BUILT_IN_WIDGETS = {
	'object-table': CnWidgetObjectTable,
	'form-renderer': CnWidgetFormRenderer,
	'map-viewer': CnWidgetMapViewer,
	'card-grid': CnWidgetCardGrid,
}
