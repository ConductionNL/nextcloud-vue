/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSavedViewsWidget — self-registers the `saved-views` widget type (a list of
 * the reader's own saved views, each a link into the index page that applies
 * it) into the shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnSavedViewsWidget = lazyComponent(() => import('./CnSavedViewsWidget.vue'), 'CnSavedViewsWidget')

registerDashboardWidget('saved-views', {
	placeholder: 'rows',
	renderer: LazyCnSavedViewsWidget,
	form: null,
	defaultContent: {
		register: '',
		schema: '',
		route: '',
		own: true,
		limit: 10,
	},
	displayName: 'Saved views',
	icon: 'ViewList',
	surfaces: ['app-dashboard'],
})

export { default as CnSavedViewsWidget } from './CnSavedViewsWidget.vue'
export { default } from './CnSavedViewsWidget.vue'
