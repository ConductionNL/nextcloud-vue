/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRadioCardsWidget — self-registers the `radio-cards` widget type (one
 * choice out of a few cards with a title and a description, bound to an enum
 * field of the current object and saved on selection) into the shared
 * dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnRadioCardsWidget = lazyComponent(() => import('./CnRadioCardsWidget.vue'), 'CnRadioCardsWidget')

registerDashboardWidget('radio-cards', {
	placeholder: 'block',
	renderer: LazyCnRadioCardsWidget,
	form: null,
	defaultContent: {
		field: '',
		options: [],
	},
	displayName: 'Radio cards',
	icon: 'RadioboxMarked',
	surfaces: ['detail-page'],
})

export { default as CnRadioCardsWidget } from './CnRadioCardsWidget.vue'
export { default } from './CnRadioCardsWidget.vue'
