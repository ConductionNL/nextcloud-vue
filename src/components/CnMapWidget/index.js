/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnMapWidget — self-registers the `map` dashboard widget type (an OpenRegister-backed
 * Leaflet map) into the shared dashboardWidgetRegistry at module load, so it appears in
 * the Add Widget dialog. Configured via `CnMapWidgetForm`.
 *
 * The component long predates this registration: it existed, was exported from the
 * package root, and could be mounted by hand — but it was never in the dashboard catalog,
 * so there was no way to place a map on a dashboard from the UI.
 *
 * `defaultContent` mirrors CnMapWidget's own prop defaults. The grid binds a widget's
 * content BOTH as `:content` and spread via `v-bind`, so these keys arrive as props on
 * the renderer — `markers` is the shape its resolver reads.
 */

import CnMapWidget from './CnMapWidget.vue'
import CnMapWidgetForm from '../CnMapWidgetForm/CnMapWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('map', {
	renderer: CnMapWidget,
	form: CnMapWidgetForm,
	defaultContent: {
		register: '',
		schema: '',
		// The Netherlands, roughly. autoFit overrides this once objects are plotted.
		center: [52.13, 5.29],
		zoom: 7,
		height: '400px',
		popupField: '',
		clustering: false,
		autoFit: true,
		markers: {
			dataSource: { register: '', schema: '' },
			popupField: '',
			clustering: false,
		},
	},
	displayName: 'Map',
	icon: 'Map',
})

export default CnMapWidget
export { CnMapWidget }
