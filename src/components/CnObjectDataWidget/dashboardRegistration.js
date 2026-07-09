/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Registers the `data` widget type (CnObjectDataWidget) into the shared
 * dashboardWidgetRegistry so its per-property override config is editable
 * in-app via the cog (CnObjectDataWidgetForm). The `data` widget is a
 * DETAIL-PAGE surface — it needs a loaded OpenRegister object (schema +
 * objectData) supplied by the page context — so it declares
 * `surfaces: ['detail-page']` and is excluded from the dashboard Add-widget
 * picker. This file is a side-effect module kept separate from the component's
 * `index.js` (which is the public barrel export) so importing the component
 * doesn't force the registration.
 */

import CnObjectDataWidget from './CnObjectDataWidget.vue'
import CnObjectDataWidgetForm from '../CnObjectDataWidgetForm/CnObjectDataWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('data', {
	renderer: CnObjectDataWidget,
	form: CnObjectDataWidgetForm,
	defaultContent: {
		title: '',
		register: '',
		schema: '',
		columns: 3,
		overrides: {},
	},
	displayName: 'Object data',
	icon: 'TableColumn',
	surfaces: ['detail-page'],
	// The sub-form (CnObjectDataWidgetForm) has its own Title field, so the
	// Add-widget modal hides its generic "Custom title" chrome control to avoid
	// two title inputs.
	ownsTitle: true,
})
