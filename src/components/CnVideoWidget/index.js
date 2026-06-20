/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnVideoWidget — self-registers the `video` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnVideoWidget from './CnVideoWidget.vue'
import CnVideoWidgetForm from '../CnVideoWidgetForm/CnVideoWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('video', {
	renderer: CnVideoWidget,
	form: CnVideoWidgetForm,
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

export { CnVideoWidget }
export default CnVideoWidget
