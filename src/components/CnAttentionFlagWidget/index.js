/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAttentionFlagWidget — self-registers the `attention-flag` widget type (a
 * flag raised and cleared with a reason over an app endpoint, plus the
 * markers and the assessment on the record) into the shared
 * dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnAttentionFlagWidget = lazyComponent(() => import('./CnAttentionFlagWidget.vue'), 'CnAttentionFlagWidget')

registerDashboardWidget('attention-flag', {
	renderer: LazyCnAttentionFlagWidget,
	form: null,
	defaultContent: {
		endpoint: '',
		raisePath: '/raise',
		clearPath: '/clear',
	},
	displayName: 'Attention flag',
	icon: 'FlagOutline',
	surfaces: ['detail-page'],
})

export { default as CnAttentionFlagWidget } from './CnAttentionFlagWidget.vue'
export { default } from './CnAttentionFlagWidget.vue'
