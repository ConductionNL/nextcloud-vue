/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnImageWidget — self-registers the `image` dashboard widget type into the
 * shared dashboardWidgetRegistry at module load.
 */

import CnImageWidget from './CnImageWidget.vue'
import CnImageWidgetForm from '../CnImageWidgetForm/CnImageWidgetForm.vue'
import { registerDashboardWidget } from '../CnWidgetGrid/dashboardWidgetRegistry.js'

registerDashboardWidget('image', {
	renderer: CnImageWidget,
	form: CnImageWidgetForm,
	defaultContent: {
		url: '',
		alt: '',
		link: '',
		fit: 'cover',
	},
	displayName: 'Image',
	icon: 'Camera',
})

export { CnImageWidget }
export default CnImageWidget
