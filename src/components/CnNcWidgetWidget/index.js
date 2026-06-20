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

import CnNcWidgetWidget from './CnNcWidgetWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('nc-widget', {
	renderer: CnNcWidgetWidget,
	form: null,
	defaultContent: {
		widgetId: '',
		displayMode: 'vertical',
	},
	displayName: 'Nextcloud widget',
	icon: 'ViewDashboard',
})

export { CnNcWidgetWidget }
export default CnNcWidgetWidget
