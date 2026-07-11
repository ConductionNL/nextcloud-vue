/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `object-geo` widget type (CnObjectGeoWidget) into the shared
 * dashboardWidgetRegistry so it appears in the detail-page Add-widget picker
 * and its title / editable config is editable in-app via the cog
 * (CnObjectGeoWidgetForm). Like `data` and `related`, the geo widget is a
 * DETAIL-PAGE surface — it needs a loaded OpenRegister object (register /
 * schema / objectData) supplied by the page context — so it declares
 * `surfaces: ['detail-page']` and is excluded from the dashboard picker. This
 * side-effect module is kept separate from the component's `index.js` (the
 * public barrel export) so importing the component doesn't force registration.
 */

import CnObjectGeoWidget from './CnObjectGeoWidget.vue'
import CnObjectGeoWidgetForm from '../CnObjectGeoWidgetForm/CnObjectGeoWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('object-geo', {
	renderer: CnObjectGeoWidget,
	form: CnObjectGeoWidgetForm,
	defaultContent: {
		title: '',
		editable: true,
	},
	displayName: 'Location / map',
	icon: 'MapMarker',
	surfaces: ['detail-page'],
	// The sub-form (CnObjectGeoWidgetForm) has its own Title field, so the
	// Add-widget modal hides its generic "Custom title" chrome control.
	ownsTitle: true,
})
