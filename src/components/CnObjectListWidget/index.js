/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectListWidget — self-registers the `object-list` dashboard widget type
 * (an abstract, OpenRegister-backed object list / table) into the shared
 * dashboardWidgetRegistry at module load. Resolved by its type key; not a
 * public export. Configured via `CnObjectListWidgetForm`.
 */

import CnObjectListWidget from './CnObjectListWidget.vue'
import CnObjectListWidgetForm from '../CnObjectListWidgetForm/CnObjectListWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('object-list', {
	renderer: CnObjectListWidget,
	form: CnObjectListWidgetForm,
	defaultContent: {
		register: '',
		schema: '',
		filter: {},
		sort: { field: '', dir: 'asc' },
		limit: 5,
		columns: [{ key: 'title', label: 'Title' }],
	},
	displayName: 'Object list',
	icon: 'ClipboardList',
})

export { CnObjectListWidget }
export default CnObjectListWidget
