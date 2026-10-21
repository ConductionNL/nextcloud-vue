/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAttentionFlagWidget — self-registers the `attention-flag` widget type (a
 * flag raised and cleared with a reason over an app endpoint, plus the
 * markers and the assessment on the record) into the shared
 * dashboardWidgetRegistry at module load.
 */

import CnAttentionFlagWidget from './CnAttentionFlagWidget.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('attention-flag', {
	renderer: CnAttentionFlagWidget,
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

export { CnAttentionFlagWidget }
export default CnAttentionFlagWidget
