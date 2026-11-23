/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnVideoWidget — self-registers the `video` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import { lazyComponent } from '../../utils/lazyComponent.js'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

const LazyCnVideoWidgetForm = lazyComponent(() => import('../CnVideoWidgetForm/CnVideoWidgetForm.vue'), 'CnVideoWidgetForm')
const LazyCnVideoWidget = lazyComponent(() => import('./CnVideoWidget.vue'), 'CnVideoWidget')

registerDashboardWidget('video', {
	renderer: LazyCnVideoWidget,
	form: LazyCnVideoWidgetForm,
	defaultContent: {
		sourceType: null,
		videoUrl: '',
		fileId: null,
		autoplay: false,
		muted: true,
		loop: false,
		controls: true,
		aspectRatio: '16:9',
		posterUrl: '',
	},
	displayName: 'Video',
	icon: 'Video',
})

export { default as CnVideoWidget } from './CnVideoWidget.vue'
export { default } from './CnVideoWidget.vue'
