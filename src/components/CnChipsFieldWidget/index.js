/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChipsFieldWidget — self-registers the `chips-field` widget type (a list of
 * short strings in one array field of the current object, added and removed as
 * chips, saved on each change) into the shared dashboardWidgetRegistry.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnChipsFieldWidget = lazyComponent(() => import('./CnChipsFieldWidget.vue'), 'CnChipsFieldWidget')

registerDashboardWidget('chips-field', {
	placeholder: 'block',
	renderer: LazyCnChipsFieldWidget,
	form: null,
	defaultContent: {
		field: '',
	},
	displayName: 'Chips field',
	icon: 'TagMultiple',
	surfaces: ['detail-page'],
})

export { default as CnChipsFieldWidget } from './CnChipsFieldWidget.vue'
export { default } from './CnChipsFieldWidget.vue'
