/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnStatGridWidget — self-registers the `stat-grid` widget type (figures in a
 * grid inside one card, each from the grid's endpoint or its own) into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnStatGridWidget = lazyComponent(() => import('./CnStatGridWidget.vue'), 'CnStatGridWidget')

registerDashboardWidget('stat-grid', {
	placeholder: 'counter',
	renderer: LazyCnStatGridWidget,
	form: null,
	defaultContent: {
		columns: 2,
		cells: [],
	},
	displayName: 'Figures',
	icon: 'ViewGridOutline',
	surfaces: ['detail-page', 'app-dashboard'],
})

export { default as CnStatGridWidget } from './CnStatGridWidget.vue'
export { default } from './CnStatGridWidget.vue'
