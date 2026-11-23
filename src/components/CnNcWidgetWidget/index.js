/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnNcWidgetWidget — self-registers the `nc-widget` dashboard widget type into
 * the shared dashboardWidgetRegistry at module load.
 *
 * The matching `CnNcWidgetWidgetForm` is not yet present in this tree, so the
 * entry registers with `form: null` (a renderer-only registration, supported
 * by the registry — such types are excluded from the `CnAddWidgetModal` type
 * picker via `listWidgetTypes()`). When the form lands, wire it in here.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnNcWidgetWidget = lazyComponent(() => import('./CnNcWidgetWidget.vue'), 'CnNcWidgetWidget')

registerDashboardWidget('nc-widget', {
	renderer: LazyCnNcWidgetWidget,
	form: null,
	defaultContent: {
		widgetId: '',
		displayMode: 'vertical',
	},
	displayName: 'Nextcloud widget',
	icon: 'ViewDashboard',
})

export { default as CnNcWidgetWidget } from './CnNcWidgetWidget.vue'
export { default } from './CnNcWidgetWidget.vue'
