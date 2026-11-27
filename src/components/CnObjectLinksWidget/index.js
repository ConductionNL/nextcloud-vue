/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectLinksWidget: self-registers the `object-links` widget type (a
 * record's links to other records, kept as objects of a link schema, listed,
 * added and removed) into the shared dashboardWidgetRegistry at module load.
 * Renderer only: declared in the manifest.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnObjectLinksWidget = lazyComponent(() => import('./CnObjectLinksWidget.vue'), 'CnObjectLinksWidget')

registerDashboardWidget('object-links', {
	placeholder: 'rows',
	renderer: LazyCnObjectLinksWidget,
	form: null,
	defaultContent: {
		types: [],
		targets: [],
		readOnly: false,
	},
	displayName: 'Object links',
	icon: 'AccountMultipleOutline',
	surfaces: ['detail-page'],
})

export { default as CnObjectLinksWidget } from './CnObjectLinksWidget.vue'
export { default } from './CnObjectLinksWidget.vue'
